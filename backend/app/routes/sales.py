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

    created_sales = []
    movement_logs = []  # collect before commit

    try:
        for item in sales_data.items:
            stock = db.query(Stocks).filter(Stocks.id == item.stock_id).first()
            if not stock:
                raise HTTPException(status_code=404, detail=f"Stock ID {item.stock_id} not found")
            if stock.expiry_date and stock.expiry_date < date.today():
                raise HTTPException(status_code=400, detail=f"Stock ID {item.stock_id} is expired")
            if item.quantity_sold <= 0:
                raise HTTPException(status_code=400, detail="Quantity must be greater than zero")
            if stock.quantity < item.quantity_sold:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for {stock.product.name} — only {stock.quantity} available"
                )

            product = stock.product
            if not product:
                raise HTTPException(status_code=404, detail="Product not found")
            if item.selling_price > product.price:
                raise HTTPException(status_code=409, detail=f"Cannot sell {product.name} above its listed price")

            total_amount = item.quantity_sold * item.selling_price
            qty_before = stock.quantity

            sale = Sales(
                stock_id=stock.id,
                sold_by=current_user.id,
                quantity_sold=item.quantity_sold,
                selling_price=item.selling_price,
                total_amount=total_amount,
                created_by=current_user.id
            )

            stock.quantity -= item.quantity_sold
            db.add(sale)
            created_sales.append((sale, product.name))

            # Store movement info for after commit
            movement_logs.append({
                "stock": stock,
                "qty_before": qty_before,
                "qty_after": stock.quantity,
                "performed_by": current_user.user_name,
            })

        db.commit()
        for sale, _ in created_sales:
            db.refresh(sale)

        # Log movements after commit so sale IDs exist
        for i, log in enumerate(movement_logs):
            sale_id = created_sales[i][0].id
            log_movement(
                db, log["stock"],
                movement_type='sale',
                quantity_before=log["qty_before"],
                quantity_after=log["qty_after"],
                performed_by=log["performed_by"],
                reference_id=sale_id,
                note=f"Sale #{sale_id}",
            )
        db.commit()

        staff = db.query(User).filter(User.id == current_user.id).first()
        grand_total = sum(float(s.total_amount) for s, _ in created_sales)
        first_sale = created_sales[0][0]

        return {
            "receipt_id": first_sale.id,
            "sold_by": staff.user_name,
            "items": [
                {
                    "sale_id": sale.id,
                    "product_name": name,
                    "quantity_sold": sale.quantity_sold,
                    "unit_price": float(sale.selling_price),
                    "total_amount": float(sale.total_amount),
                }
                for sale, name in created_sales
            ],
            "grand_total": grand_total,
            "created_at": first_sale.created_at,
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

    staff = db.query(User).filter(User.id == sale.sold_by).first()
    stock = sale.stock
    product = stock.product

    pending_void = db.query(VoidRequest).filter(
        VoidRequest.sale_id == sales_id,
        VoidRequest.status == 'pending'
    ).first()

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
                "sale_id":       sale.id,
                "product_name":  product.name,
                "quantity_sold": sale.quantity_sold,
                "unit_price":    float(sale.selling_price),
                "total_amount":  float(sale.total_amount),
            }
        ],
    }