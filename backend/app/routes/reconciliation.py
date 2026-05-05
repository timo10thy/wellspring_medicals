from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from typing import Optional
from app.routes.basemodel import get_db
from app.middlewares.admin import admin_validation
from app.middlewares.auth import AuthMiddleware
from app.models.users import User
from app.models.products import Products
from app.models.stock import Stocks
from app.models.sales import Sales
from app.models.reconciliation import StockReconciliation
from app.schema.reconciliation_schema import ReconciliationCreate, ReconciliationResponse
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix='/reconciliation', tags=['Reconciliation'])


# ── Helper: compute units sold and added for a product on a given date ────────
def get_day_activity(product_id: int, recon_date: date, db: Session):
    """Returns (units_sold, units_added) for a product on a specific date."""

    # Units sold: sum of quantity_sold across all sales for this product on this date
    units_sold = (
        db.query(func.coalesce(func.sum(Sales.quantity_sold), 0))
        .join(Stocks, Sales.stock_id == Stocks.id)
        .filter(
            Stocks.product_id == product_id,
            func.date(Sales.created_at) == recon_date
        )
        .scalar()
    ) or 0

    # Units added: not tracked in current model (stock quantity is mutable)
    # We return 0 for now — this will be accurate once stock movement log is added
    units_added = 0

    return int(units_sold), int(units_added)


# ── POST: record a reconciliation ─────────────────────────────────────────────
@router.post('/create', response_model=ReconciliationResponse, status_code=status.HTTP_201_CREATED)
def create_reconciliation(
    data: ReconciliationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthMiddleware),
):
    # Validate product exists
    product = db.query(Products).filter(Products.id == data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Prevent duplicate reconciliation for same product + date
    existing = db.query(StockReconciliation).filter(
        StockReconciliation.product_id == data.product_id,
        StockReconciliation.recon_date == data.recon_date,
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Reconciliation for {product.name} on {data.recon_date} already exists"
        )

    units_sold, units_added = get_day_activity(data.product_id, data.recon_date, db)

    expected_qty = data.opening_qty + units_added - units_sold
    variance     = data.physical_qty - expected_qty

    recon = StockReconciliation(
        product_id=data.product_id,
        recon_date=data.recon_date,
        opening_qty=data.opening_qty,
        units_sold=units_sold,
        units_added=units_added,
        expected_qty=expected_qty,
        physical_qty=data.physical_qty,
        variance=variance,
        notes=data.notes,
        recorded_by=current_user.id,
    )

    db.add(recon)
    db.commit()
    db.refresh(recon)

    recorder = db.query(User).filter(User.id == current_user.id).first()

    return ReconciliationResponse(
        id=recon.id,
        product_id=recon.product_id,
        product_name=product.name,
        recon_date=recon.recon_date,
        opening_qty=recon.opening_qty,
        units_sold=recon.units_sold,
        units_added=recon.units_added,
        expected_qty=recon.expected_qty,
        physical_qty=recon.physical_qty,
        variance=recon.variance,
        notes=recon.notes,
        recorded_by=recorder.user_name,
        created_at=recon.created_at,
    )


# ── GET: list reconciliations (filterable by date range / product) ────────────
@router.get('/all', response_model=list[ReconciliationResponse], status_code=status.HTTP_200_OK)
def list_reconciliations(
    date_from:  Optional[date] = Query(default=None),
    date_to:    Optional[date] = Query(default=None),
    product_id: Optional[int]  = Query(default=None),
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_validation),
):
    query = db.query(StockReconciliation)

    if date_from:
        query = query.filter(StockReconciliation.recon_date >= date_from)
    if date_to:
        query = query.filter(StockReconciliation.recon_date <= date_to)
    if product_id:
        query = query.filter(StockReconciliation.product_id == product_id)

    records = query.order_by(StockReconciliation.recon_date.desc()).all()

    result = []
    for r in records:
        product  = db.query(Products).filter(Products.id == r.product_id).first()
        recorder = db.query(User).filter(User.id == r.recorded_by).first()
        result.append(ReconciliationResponse(
            id=r.id,
            product_id=r.product_id,
            product_name=product.name if product else '—',
            recon_date=r.recon_date,
            opening_qty=r.opening_qty,
            units_sold=r.units_sold,
            units_added=r.units_added,
            expected_qty=r.expected_qty,
            physical_qty=r.physical_qty,
            variance=r.variance,
            notes=r.notes,
            recorded_by=recorder.user_name if recorder else '—',
            created_at=r.created_at,
        ))
    return result


# ── GET: today's reconciliation status for all products ───────────────────────
@router.get('/today', status_code=status.HTTP_200_OK)
def today_reconciliation_status(
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_validation),
):
    today = date.today()

    # Get all products that have stock
    products_with_stock = (
        db.query(Products)
        .join(Stocks, Stocks.product_id == Products.id)
        .filter(Products.is_active == True)
        .distinct()
        .all()
    )

    result = []
    for product in products_with_stock:
        # Current stock quantity
        current_qty = db.query(
            func.coalesce(func.sum(Stocks.quantity), 0)
        ).filter(Stocks.product_id == product.id).scalar() or 0

        # Units sold today
        units_sold_today, _ = get_day_activity(product.id, today, db)

        # Check if already reconciled today
        recon = db.query(StockReconciliation).filter(
            StockReconciliation.product_id == product.id,
            StockReconciliation.recon_date == today,
        ).first()

        result.append({
            "product_id":      product.id,
            "product_name":    product.name,
            "current_qty":     int(current_qty),
            "units_sold_today": units_sold_today,
            "reconciled":      recon is not None,
            "variance":        recon.variance if recon else None,
            "physical_qty":    recon.physical_qty if recon else None,
        })

    return result


# ── GET: summary of losses (negative variance) ────────────────────────────────
@router.get('/losses', status_code=status.HTTP_200_OK)
def loss_summary(
    date_from:  Optional[date] = Query(default=None),
    date_to:    Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_validation),
):
    if not date_from:
        date_from = date.today() - timedelta(days=30)
    if not date_to:
        date_to = date.today()

    losses = (
        db.query(StockReconciliation)
        .filter(
            StockReconciliation.variance < 0,
            StockReconciliation.recon_date >= date_from,
            StockReconciliation.recon_date <= date_to,
        )
        .order_by(StockReconciliation.recon_date.desc())
        .all()
    )

    result = []
    for r in losses:
        product  = db.query(Products).filter(Products.id == r.product_id).first()
        recorder = db.query(User).filter(User.id == r.recorded_by).first()
        result.append({
            "product_name": product.name if product else '—',
            "recon_date":   r.recon_date,
            "variance":     r.variance,   # negative number = units missing
            "recorded_by":  recorder.user_name if recorder else '—',
            "notes":        r.notes,
        })

    total_units_lost = sum(abs(r['variance']) for r in result)

    return {
        "date_from":       date_from,
        "date_to":         date_to,
        "total_incidents": len(result),
        "total_units_lost": total_units_lost,
        "records":         result,
    }