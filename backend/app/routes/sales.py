from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
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

    # Deduplication: if txn_id already exists, return existing receipt
    if sales_data.txn_id:
        existing = db.query(Sales).filter(Sales.txn_id == sales_data.txn_id).first()
        if existing:
            logger.info(f"Duplicate txn_id {sales_data.txn_id} — returning existing sale #{existing.id}")
            staff = db.query(User).filter(User.id == existing.sold_by).first()
            stock = existing.stock
            product = stock.product
            return {
                "receipt_id":  existing.id,
                "sold_by":     staff.user_name if staff else "—",
                "items": [{
                    "sale_id":           existing.id,
                    "product_name":      product.name,
                    "quantity_sold":     existing.quantity_sold,
                    "sub_quantity_sold": existing.sub_quantity_sold,
                    "sub_unit":          existing.sub_unit,
                    "unit_price":        float(existing.selling_price),
                    "discount_amount":   float(existing.discount_amount),
                    "total_amount":      float(existing.total_amount),
                }],
                "grand_total": float(existing.total_amount),
                "created_at":  existing.created_at,
                "deduplicated": True,
            }

    created_sales  = []
    movement_logs  = []

    try:
        for item in sales_data.items:
            stock = db.query(Stocks).filter(Stocks.id == item.stock_id).first()
            if not stock:
                raise HTTPException(status_code=404, detail=f"Stock ID {item.stock_id} not found")
            if stock.expiry_date and stock.expiry_date < date.today():
                raise HTTPException(status_code=400, detail=f"Stock ID {item.stock_id} is expired")

            product = stock.product
            if not product:
                raise HTTPException(status_code=404, detail="Product not found")

            # ── Cut drug logic ────────────────────────────────────────────────
            if item.is_cut and item.pieces_per_unit and item.sub_quantity_sold:
                # Convert sub-units to base units for stock deduction
                # e.g. 3 tablets / 10 per strip = 0.3 strips
                base_qty_to_deduct = item.sub_quantity_sold / item.pieces_per_unit
                qty_sold_recorded  = item.sub_quantity_sold  # store what attendant entered
                sub_unit           = item.sub_unit
                sub_qty            = item.sub_quantity_sold
            else:
                base_qty_to_deduct = item.quantity_sold
                qty_sold_recorded  = item.quantity_sold
                sub_unit           = None
                sub_qty            = None

            if base_qty_to_deduct <= 0:
                raise HTTPException(status_code=400, detail="Quantity must be greater than zero")
            if stock.quantity < base_qty_to_deduct:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for {product.name} — only {stock.quantity} units available"
                )

            # Discount validation
            discount = item.discount_amount or 0.0
            if discount < 0:
                raise HTTPException(status_code=400, detail="Discount cannot be negative")

            # Total: based on base units * price, minus discount
            gross_amount = base_qty_to_deduct * float(item.selling_price)
            if discount >= gross_amount:
                raise HTTPException(
                    status_code=400,
                    detail=f"Discount ({discount}) cannot be equal to or exceed the sale amount ({gross_amount:.2f})"
                )
            total_amount = gross_amount - discount
            qty_before   = stock.quantity

            sale = Sales(
                stock_id          = stock.id,
                sold_by           = current_user.id,
                created_by        = current_user.id,
                quantity_sold     = base_qty_to_deduct,
                sub_quantity_sold = sub_qty,
                sub_unit          = sub_unit,
                selling_price     = item.selling_price,
                discount_amount   = discount,
                total_amount      = total_amount,
                txn_id            = sales_data.txn_id or None,
            )

            stock.quantity -= base_qty_to_deduct
            db.add(sale)
            created_sales.append((sale, product.name, qty_sold_recorded, sub_unit))

            movement_logs.append({
                "stock":        stock,
                "qty_before":   qty_before,
                "qty_after":    stock.quantity,
                "performed_by": current_user.user_name,
            })

        db.commit()
        for sale, _, _, _ in created_sales:
            db.refresh(sale)

        for i, log in enumerate(movement_logs):
            sale_id = created_sales[i][0].id
            log_movement(
                db, log["stock"],
                movement_type    = 'sale',
                quantity_before  = log["qty_before"],
                quantity_after   = log["qty_after"],
                performed_by     = log["performed_by"],
                reference_id     = sale_id,
                note             = f"Sale #{sale_id}",
            )
        db.commit()

        staff       = db.query(User).filter(User.id == current_user.id).first()
        grand_total = sum(float(s.total_amount) for s, _, _, _ in created_sales)
        first_sale  = created_sales[0][0]

        return {
            "receipt_id": first_sale.id,
            "sold_by":    staff.user_name,
            "items": [
                {
                    "sale_id":           sale.id,
                    "product_name":      name,
                    "quantity_sold":     qty_display,
                    "sub_quantity_sold": sale.sub_quantity_sold,
                    "sub_unit":          s_unit,
                    "unit_price":        float(sale.selling_price),
                    "discount_amount":   float(sale.discount_amount),
                    "total_amount":      float(sale.total_amount),
                }
                for sale, name, qty_display, s_unit in created_sales
            ],
            "grand_total": grand_total,
            "created_at":  first_sale.created_at,
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create sale: {e}")
        raise HTTPException(status_code=500, detail="Failed to create sale")


@router.get('/{sales_id}/salesreceipt', status_code=status.HTTP_200_OK)
def receipt(sales_id: int, db: Session = Depends(get_db)):
    from app.models.void_request import VoidRequest

    sale = db.query(Sales).filter(Sales.id == sales_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    staff   = db.query(User).filter(User.id == sale.sold_by).first()
    stock   = sale.stock
    product = stock.product

    pending_void = db.query(VoidRequest).filter(
        VoidRequest.sale_id == sales_id,
        VoidRequest.status  == 'pending'
    ).first()

    # Display quantity — show sub-units if it was a cut sale
    display_qty = sale.sub_quantity_sold if sale.sub_quantity_sold else sale.quantity_sold

    return {
        "receipt_id":   sale.id,
        "sold_by":      staff.user_name if staff else "—",
        "grand_total":  float(sale.total_amount),
        "created_at":   sale.created_at,
        "is_voided":    getattr(sale, 'is_voided', False),
        "void_reason":  getattr(sale, 'void_reason', None),
        "voided_by":    getattr(sale, 'voided_by', None),
        "void_pending": pending_void is not None,
        "items": [
            {
                "sale_id":           sale.id,
                "product_name":      product.name,
                "quantity_sold":     display_qty,
                "sub_unit":          sale.sub_unit,
                "unit_price":        float(sale.selling_price),
                "discount_amount":   float(sale.discount_amount or 0),
                "total_amount":      float(sale.total_amount),
            }
        ],
    }