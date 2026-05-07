from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models.void_request import VoidRequest
from app.models.sales import Sales
from app.models.stock import Stocks
from app.auth import get_current_user, admin_validation
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sales", tags=["Void Requests"])


class VoidRequestCreate(BaseModel):
    reason: Optional[str] = None


class VoidReviewRequest(BaseModel):
    reason: Optional[str] = None  # optional rejection note


# ── Staff: submit void request ────────────────────────────────────────────────
@router.post("/{sale_id}/void-request")
def request_void(
    sale_id: int,
    body: VoidRequestCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    sale = db.query(Sales).filter(Sales.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    if sale.is_voided:
        raise HTTPException(status_code=400, detail="Sale is already voided")

    # Check no pending request already exists
    existing = db.query(VoidRequest).filter(
        VoidRequest.sale_id == sale_id,
        VoidRequest.status == 'pending'
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="A void request is already pending for this sale")

    void_req = VoidRequest(
        sale_id=sale_id,
        requested_by=current_user.username,
        reason=body.reason,
        status='pending',
    )
    db.add(void_req)
    db.commit()
    db.refresh(void_req)
    logger.info(f"Void request submitted for sale {sale_id} by {current_user.username}")
    return {"message": "Void request submitted", "void_request_id": void_req.id}


# ── Admin: get all pending void requests ──────────────────────────────────────
@router.get("/void-requests")
def get_void_requests(
    db: Session = Depends(get_db),
    current_user=Depends(admin_validation),
):
    requests = (
        db.query(VoidRequest)
        .filter(VoidRequest.status == 'pending')
        .order_by(VoidRequest.created_at.desc())
        .all()
    )

    result = []
    for vr in requests:
        sale = vr.sale
        result.append({
            "void_request_id": vr.id,
            "sale_id":         sale.id,
            "total_amount":    float(sale.total_amount),
            "quantity_sold":   sale.quantity_sold,
            "requested_by":    vr.requested_by,
            "reason":          vr.reason,
            "created_at":      str(vr.created_at),
        })
    return result


# ── Admin: approve void request ───────────────────────────────────────────────
@router.patch("/void-requests/{request_id}/approve")
def approve_void(
    request_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(admin_validation),
):
    vr = db.query(VoidRequest).filter(VoidRequest.id == request_id).first()
    if not vr:
        raise HTTPException(status_code=404, detail="Void request not found")
    if vr.status != 'pending':
        raise HTTPException(status_code=400, detail=f"Request is already {vr.status}")

    sale = db.query(Sales).filter(Sales.id == vr.sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    if sale.is_voided:
        raise HTTPException(status_code=400, detail="Sale is already voided")

    # Restore stock
    stock = db.query(Stocks).filter(Stocks.id == sale.stock_id).first()
    if stock:
        stock.quantity += sale.quantity_sold

    # Soft void the sale
    sale.is_voided   = True
    sale.void_reason = vr.reason
    sale.voided_by   = current_user.username
    sale.voided_at   = func.now()

    # Mark request approved
    vr.status      = 'approved'
    vr.reviewed_by = current_user.username
    vr.reviewed_at = func.now()

    db.commit()
    logger.info(f"Void request {request_id} approved by {current_user.username} for sale {vr.sale_id}")
    return {"message": "Void approved. Stock restored.", "sale_id": vr.sale_id}


# ── Admin: reject void request ────────────────────────────────────────────────
@router.patch("/void-requests/{request_id}/reject")
def reject_void(
    request_id: int,
    body: VoidReviewRequest,
    db: Session = Depends(get_db),
    current_user=Depends(admin_validation),
):
    vr = db.query(VoidRequest).filter(VoidRequest.id == request_id).first()
    if not vr:
        raise HTTPException(status_code=404, detail="Void request not found")
    if vr.status != 'pending':
        raise HTTPException(status_code=400, detail=f"Request is already {vr.status}")

    vr.status      = 'rejected'
    vr.reviewed_by = current_user.username
    vr.reviewed_at = func.now()
    if body.reason:
        vr.reason = f"{vr.reason or ''} | Rejected: {body.reason}".strip(' |')

    db.commit()
    logger.info(f"Void request {request_id} rejected by {current_user.username}")
    return {"message": "Void request rejected", "sale_id": vr.sale_id}