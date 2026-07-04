from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import case, or_
from typing import Annotated
from datetime import date
from app.routes.basemodel import get_db
from app.models.users import User
from app.models.sales import Sales
from app.models.stock import Stocks
from app.models.products import Products
from app.middlewares.auth import AuthMiddleware
from app.routes.movement_helper import log_movement
from app.schema.sales_schema import (
    SaleCreate, SaleResponse, ReceiptResponse,
    MultiSaleCreate, MultiReceiptResponse, SaleItemResponse
)
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sales", tags=["Sales"])
db_dependency = Annotated[Session, Depends(get_db)]


@router.post("/create", status_code=status.HTTP_201_CREATED)
def create_sales(
    sales_data: MultiSaleCreate,
    db: db_dependency,
    current_user: User = Depends(AuthMiddleware)
):
    if not sales_data.items:
        raise HTTPException(status_code=400, detail="At least one item is required")

    discount = float(sales_data.discount or 0)
    if discount < 0:
        raise HTTPException(status_code=400, detail="Discount cannot be negative")

    # Deduplication: if txn_id already exists, return existing receipt
    if sales_data.txn_id:
        existing = db.query(Sales).filter(Sales.txn_id == sales_data.txn_id).first()
        if existing:
            logger.info(f"Duplicate txn_id {sales_data.txn_id} — returning existing sale #{existing.id}")
            return _build_receipt_for_txn(db, sales_data.txn_id, existing.id)

    created_sales = []   # list of (list_of_sale_rows, product_name)
    movement_logs = []

    try:
        for item in sales_data.items:
            product = db.query(Products).filter(Products.id == item.product_id).first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Product ID {item.product_id} not found")
            if item.quantity_sold <= 0:
                raise HTTPException(status_code=400, detail="Quantity must be greater than zero")
            if item.selling_price > product.price:
                raise HTTPException(status_code=409, detail=f"Cannot sell {product.name} above its listed price")

            # All usable batches for this product, FEFO order (earliest expiry first, no-expiry last)
            batches = (
                db.query(Stocks)
                .filter(
                    Stocks.product_id == product.id,
                    Stocks.quantity > 0,
                    or_(Stocks.expiry_date == None, Stocks.expiry_date >= date.today()),
                )
                .order_by(
                    case((Stocks.expiry_date == None, 1), else_=0),
                    Stocks.expiry_date.asc(),
                )
                .all()
            )

            total_available = sum(b.quantity for b in batches)
            if total_available < item.quantity_sold:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for {product.name} — only {total_available} available"
                )

            remaining = item.quantity_sold
            item_sale_rows = []
            for batch in batches:
                if remaining <= 0:
                    break
                take = min(batch.quantity, remaining)
                if take <= 0:
                    continue

                qty_before = batch.quantity
                batch.quantity -= take
                remaining -= take

                sale = Sales(
                    stock_id=batch.id,
                    sold_by=current_user.id,
                    quantity_sold=take,
                    selling_price=item.selling_price,
                    total_amount=take * item.selling_price,
                    discount=discount if not created_sales and not item_sale_rows else 0,
                    created_by=current_user.id,
                    txn_id=sales_data.txn_id if sales_data.txn_id else None,
                )
                db.add(sale)
                item_sale_rows.append(sale)

                movement_logs.append({
                    "stock": batch,
                    "qty_before": qty_before,
                    "qty_after": batch.quantity,
                    "performed_by": current_user.user_name,
                })

            created_sales.append((item_sale_rows, product.name))

        db.commit()
        for rows, _ in created_sales:
            for sale in rows:
                db.refresh(sale)

        for i, rows in enumerate([r for r, _ in created_sales for r in r]):
            pass  # placeholder removed below — logging done inline instead

        # Log stock movements now that all sale rows have real IDs
        flat_rows = [row for rows, _ in created_sales for row in rows]
        for log, sale in zip(movement_logs, flat_rows):
            log_movement(
                db, log["stock"],
                movement_type='sale',
                quantity_before=log["qty_before"],
                quantity_after=log["qty_after"],
                performed_by=log["performed_by"],
                reference_id=sale.id,
                note=f"Sale #{sale.id}",
            )
        db.commit()

        staff = db.query(User).filter(User.id == current_user.id).first()
        grand_total = sum(float(row.total_amount) for rows, _ in created_sales for row in rows)
        amount_paid = grand_total - discount
        first_sale = created_sales[0][0][0]

        items_response = []
        for rows, name in created_sales:
            items_response.append({
                "sale_id": rows[0].id,
                "product_name": name,
                "quantity_sold": sum(r.quantity_sold for r in rows),
                "unit_price": float(rows[0].selling_price),
                "total_amount": sum(float(r.total_amount) for r in rows),
            })

        return {
            "receipt_id": first_sale.id,
            "sold_by": staff.user_name,
            "items": items_response,
            "grand_total": grand_total,
            "discount": discount,
            "amount_paid": amount_paid,
            "created_at": first_sale.created_at,
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create sale: {e}")
        raise HTTPException(status_code=500, detail="Failed to create sale")


def _build_receipt_for_txn(db: Session, txn_id: str, requested_sale_id: int):
    """Aggregate all Sales rows sharing a txn_id into one receipt (one line per product),
    since a single cart item can now be split across multiple stock batches."""
    from app.models.void_request import VoidRequest

    rows = db.query(Sales).filter(Sales.txn_id == txn_id).all()
    if not rows:
        raise HTTPException(status_code=404, detail="Sale not found")

    anchor = next((r for r in rows if r.id == requested_sale_id), rows[0])
    staff = db.query(User).filter(User.id == anchor.sold_by).first()

    pending_void = db.query(VoidRequest).filter(
        VoidRequest.sale_id == anchor.id,
        VoidRequest.status == 'pending'
    ).first()

    # Group rows by product for display
    by_product = {}
    for r in rows:
        pname = r.stock.product.name
        if pname not in by_product:
            by_product[pname] = {"sale_id": r.id, "quantity_sold": 0, "unit_price": float(r.selling_price), "total_amount": 0.0}
        by_product[pname]["quantity_sold"] += r.quantity_sold
        by_product[pname]["total_amount"] += float(r.total_amount)

    discount = float(anchor.discount or 0)
    grand_total = sum(v["total_amount"] for v in by_product.values())

    return {
        "receipt_id": anchor.id,
        "sold_by": staff.user_name if staff else "—",
        "grand_total": grand_total,
        "discount": discount,
        "amount_paid": grand_total - discount,
        "created_at": anchor.created_at,
        "is_voided": getattr(anchor, 'is_voided', False),
        "void_reason": getattr(anchor, 'void_reason', None),
        "voided_by": getattr(anchor, 'voided_by', None),
        "void_pending": pending_void is not None,
        "items": [
            {"sale_id": v["sale_id"], "product_name": name, **{k: val for k, val in v.items() if k != "sale_id"}}
            for name, v in by_product.items()
        ],
    }


@router.get('/{sales_id}/salesreceipt', status_code=status.HTTP_200_OK)
def receipt(sales_id: int, db: Session = Depends(get_db)):
    sale = db.query(Sales).filter(Sales.id == sales_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    if sale.txn_id:
        return _build_receipt_for_txn(db, sale.txn_id, sales_id)

    # Fallback for legacy rows with no txn_id — old single-row behavior
    from app.models.void_request import VoidRequest
    staff = db.query(User).filter(User.id == sale.sold_by).first()
    product = sale.stock.product
    pending_void = db.query(VoidRequest).filter(
        VoidRequest.sale_id == sales_id,
        VoidRequest.status == 'pending'
    ).first()
    discount = float(getattr(sale, 'discount', 0) or 0)
    grand_total = float(sale.total_amount)

    return {
        "receipt_id": sale.id,
        "sold_by": staff.user_name if staff else "—",
        "grand_total": grand_total,
        "discount": discount,
        "amount_paid": grand_total - discount,
        "created_at": sale.created_at,
        "is_voided": getattr(sale, 'is_voided', False),
        "void_reason": getattr(sale, 'void_reason', None),
        "voided_by": getattr(sale, 'voided_by', None),
        "void_pending": pending_void is not None,
        "items": [{
            "sale_id": sale.id,
            "product_name": product.name,
            "quantity_sold": sale.quantity_sold,
            "unit_price": float(sale.selling_price),
            "total_amount": float(sale.total_amount),
        }],
    }