from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Annotated, Optional
from pydantic import BaseModel
from datetime import datetime, timezone
from app.routes.basemodel import get_db
from app.models.shift import Shift
from app.models.sales import Sales
from app.middlewares.auth import AuthMiddleware
from app.middlewares.admin import admin_validation
from app.models.users import User
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/shifts", tags=["Shifts"])
db_dependency = Annotated[Session, Depends(get_db)]


class CloseShiftRequest(BaseModel):
    pos_amount:   float
    cash_counted: float
    note:         Optional[str] = None


class ReviewShiftRequest(BaseModel):
    note: Optional[str] = None


# Staff: open shift
@router.post("/open", status_code=status.HTTP_201_CREATED)
def open_shift(
    db: db_dependency,
    current_user: User = Depends(AuthMiddleware),
):
    # Check no active shift for this user
    existing = db.query(Shift).filter(
        Shift.opened_by == current_user.id,
        Shift.status == 'open'
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You already have an open shift")

    shift = Shift(opened_by=current_user.id, status='open')
    db.add(shift)
    db.commit()
    db.refresh(shift)
    logger.info(f"Shift {shift.id} opened by {current_user.user_name}")
    return {"message": "Shift opened", "shift_id": shift.id, "opened_at": str(shift.opened_at)}


# Staff: get my active shift
@router.get("/my-shift")
def get_my_shift(
    db: db_dependency,
    current_user: User = Depends(AuthMiddleware),
):
    shift = db.query(Shift).filter(
        Shift.opened_by == current_user.id,
        Shift.status == 'open'
    ).first()
    if not shift:
        return {"shift": None}

    # Calculate sales so far during this shift
    sales_total = db.query(func.sum(Sales.total_amount)).filter(
        Sales.sold_by == current_user.id,
        Sales.created_at >= shift.opened_at,
        Sales.is_voided == False,
    ).scalar() or 0

    return {
        "shift": {
            "id":          shift.id,
            "opened_at":   str(shift.opened_at),
            "status":      shift.status,
            "sales_so_far": float(sales_total),
        }
    }


# Staff: close shift
@router.post("/close")
def close_shift(
    body: CloseShiftRequest,
    db: db_dependency,
    current_user: User = Depends(AuthMiddleware),
):
    shift = db.query(Shift).filter(
        Shift.opened_by == current_user.id,
        Shift.status == 'open'
    ).first()
    if not shift:
        raise HTTPException(status_code=404, detail="No open shift found")

    # Calculate total sales during this shift
    total_sales = db.query(func.sum(Sales.total_amount)).filter(
        Sales.sold_by == current_user.id,
        Sales.created_at >= shift.opened_at,
        Sales.is_voided == False,
    ).scalar() or 0

    total_sales    = float(total_sales)
    pos_amount     = body.pos_amount
    cash_expected  = total_sales - pos_amount
    cash_counted   = body.cash_counted
    variance       = cash_counted - cash_expected

    shift.closed_by    = current_user.id
    shift.total_sales  = total_sales
    shift.pos_amount   = pos_amount
    shift.cash_expected = cash_expected
    shift.cash_counted = cash_counted
    shift.variance     = variance
    shift.status       = 'closed'
    shift.closed_at    = datetime.now(timezone.utc)
    shift.note         = body.note

    db.commit()
    logger.info(f"Shift {shift.id} closed by {current_user.user_name}. Variance: {variance}")
    return {
        "message":       "Shift closed",
        "shift_id":      shift.id,
        "total_sales":   total_sales,
        "pos_amount":    pos_amount,
        "cash_expected": cash_expected,
        "cash_counted":  cash_counted,
        "variance":      variance,
    }


# Admin: get all shifts
@router.get("/all")
def get_all_shifts(
    db: db_dependency,
    current_user: User = Depends(AuthMiddleware),
):
    if current_user.role == 'ADMIN':
        shifts = db.query(Shift).order_by(Shift.opened_at.desc()).all()
    else:
        shifts = db.query(Shift).filter(
            Shift.opened_by == current_user.id
        ).order_by(Shift.opened_at.desc()).all()

    result = []
    for s in shifts:
        opener = db.query(User).filter(User.id == s.opened_by).first()
        result.append({
            "id":             s.id,
            "opened_by":      opener.user_name if opener else "—",
            "opened_by_name": opener.name if opener else "—",
            "status":         s.status,
            "total_sales":    float(s.total_sales or 0),
            "pos_amount":     float(s.pos_amount or 0),
            "cash_expected":  float(s.cash_expected or 0),
            "cash_counted":   float(s.cash_counted or 0),
            "variance":       float(s.variance or 0),
            "note":           s.note,
            "reviewed_by":    s.reviewed_by,
            "opened_at":      str(s.opened_at),
            "closed_at":      str(s.closed_at) if s.closed_at else None,
        })
    return result


# Admin: approve shift
@router.patch("/{shift_id}/approve")
def approve_shift(
    shift_id: int,
    body: ReviewShiftRequest,
    db: db_dependency,
    current_admin: User = Depends(admin_validation),
):
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    if shift.status not in ('closed',):
        raise HTTPException(status_code=400, detail=f"Shift is {shift.status}, cannot approve")

    shift.status      = 'approved'
    shift.reviewed_by = current_admin.user_name
    if body.note:
        shift.note = body.note

    db.commit()
    return {"message": "Shift approved", "shift_id": shift_id}


# Admin: flag shift
@router.patch("/{shift_id}/flag")
def flag_shift(
    shift_id: int,
    body: ReviewShiftRequest,
    db: db_dependency,
    current_admin: User = Depends(admin_validation),
):
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    if shift.status not in ('closed',):
        raise HTTPException(status_code=400, detail=f"Shift is {shift.status}, cannot flag")

    shift.status      = 'flagged'
    shift.reviewed_by = current_admin.user_name
    if body.note:
        shift.note = body.note

    db.commit()
    return {"message": "Shift flagged", "shift_id": shift_id}