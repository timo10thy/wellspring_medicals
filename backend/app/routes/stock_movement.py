from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Annotated, Optional
from app.routes.basemodel import get_db
from app.models.stock_movement import StockMovement
from app.models.products import Products
from app.middlewares.auth import AuthMiddleware
from app.models.users import User
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/stock", tags=["Stock Movements"])

db_dependency = Annotated[Session, Depends(get_db)]


@router.get("/movements")
def get_stock_movements(
    db: db_dependency,
    current_user: User = Depends(AuthMiddleware),
    product_id: Optional[int] = Query(default=None),
    movement_type: Optional[str] = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
):
    query = db.query(StockMovement).order_by(StockMovement.created_at.desc())

    if product_id:
        query = query.filter(StockMovement.product_id == product_id)
    if movement_type:
        query = query.filter(StockMovement.movement_type == movement_type)

    total = query.count()
    movements = query.offset(offset).limit(limit).all()

    result = []
    for m in movements:
        result.append({
            "id":               m.id,
            "product_id":       m.product_id,
            "product_name":     m.product.name if m.product else "—",
            "stock_id":         m.stock_id,
            "movement_type":    m.movement_type,
            "quantity_before":  m.quantity_before,
            "quantity_changed": m.quantity_changed,
            "quantity_after":   m.quantity_after,
            "performed_by":     m.performed_by,
            "reference_id":     m.reference_id,
            "note":             m.note,
            "created_at":       str(m.created_at),
        })
    return {"total": total, "movements": result}