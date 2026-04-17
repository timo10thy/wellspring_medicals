from fastapi import APIRouter, Depends, status, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from datetime import date
import uuid

from app.routes.basemodel import get_db
from app.middlewares.admin import admin_validation
from app.models.users import User
from app.models.products import Products
from app.models.stock import Stocks
from app.models.Purchase_receipt import PurchaseReceipt
from app.models.Purchase_receipt_item import PurchaseReceiptItem
from app.schema.purchase_receipt_schema import (
    PurchaseReceiptCreate,
    PurchaseReceiptOut,
    PurchaseReceiptSummary,
)

import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix='/purchase_receipts', tags=['Purchase Receipts'])


def generate_receipt_number() -> str:
    """Generates a unique receipt number e.g. RCP-20250416-A1B2"""
    today = date.today().strftime("%Y%m%d")
    suffix = uuid.uuid4().hex[:4].upper()
    return f"RCP-{today}-{suffix}"

@router.post('/create', response_model=PurchaseReceiptOut, status_code=status.HTTP_201_CREATED)
def create_purchase_receipt(
    receipt_data: PurchaseReceiptCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_validation)
):
    try:
        total_cost = sum(
            item.quantity_purchased * item.unit_cost
            for item in receipt_data.items
        )

        new_receipt = PurchaseReceipt(
            receipt_number=generate_receipt_number(),
            supplier_name=receipt_data.supplier_name,
            supplier_contact=receipt_data.supplier_contact,
            payment_type=receipt_data.payment_type,
            total_cost=total_cost,
            purchase_date=receipt_data.purchase_date,
            notes=receipt_data.notes,
            created_by=current_admin.id
        )
        db.add(new_receipt)
        db.flush()  # get new_receipt.id before committing

        for item in receipt_data.items:
            # Validate product exists
            product = db.query(Products).filter(Products.id == item.product_id).first()
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product with id {item.product_id} not found"
                )

            receipt_item = PurchaseReceiptItem(
                receipt_id=new_receipt.id,
                product_id=item.product_id,
                product_name_snapshot=item.product_name_snapshot,
                quantity_purchased=item.quantity_purchased,
                unit_cost=item.unit_cost,
                total_line_cost=item.total_line_cost,
                expiry_date=item.expiry_date,
                restock_level=item.restock_level
            )
            db.add(receipt_item)

        db.commit()
        db.refresh(new_receipt)
        return new_receipt

    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create purchase receipt"
        )


@router.get('/all', response_model=list[PurchaseReceiptSummary], status_code=status.HTTP_200_OK)
def get_all_receipts(
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_validation)
):
    receipts = (
        db.query(PurchaseReceipt)
        .options(joinedload(PurchaseReceipt.items))
        .order_by(PurchaseReceipt.purchase_date.desc())
        .all()
    )

    result = []
    for receipt in receipts:
        result.append(PurchaseReceiptSummary(
            id=receipt.id,
            receipt_number=receipt.receipt_number,
            supplier_name=receipt.supplier_name,
            payment_type=str(receipt.payment_type),
            total_cost=receipt.total_cost,
            purchase_date=receipt.purchase_date,
            created_at=receipt.created_at,
            item_count=len(receipt.items)
        ))

    return result


@router.get('/{receipt_id}', response_model=PurchaseReceiptOut, status_code=status.HTTP_200_OK)
def get_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_validation)
):
    receipt = (
        db.query(PurchaseReceipt)
        .options(joinedload(PurchaseReceipt.items))
        .filter(PurchaseReceipt.id == receipt_id)
        .first()
    )

    if not receipt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase receipt not found"
        )

    return receipt


@router.get('/search/supplier', response_model=list[PurchaseReceiptSummary], status_code=status.HTTP_200_OK)
def search_by_supplier(
    supplier_name: Optional[str] = Query(default=None, description="Supplier name (partial match)"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_validation)
):
    query = (
        db.query(PurchaseReceipt)
        .options(joinedload(PurchaseReceipt.items))
        .order_by(PurchaseReceipt.purchase_date.desc())
    )

    if supplier_name:
        query = query.filter(PurchaseReceipt.supplier_name.ilike(f"%{supplier_name}%"))

    receipts = query.all()

    return [
        PurchaseReceiptSummary(
            id=r.id,
            receipt_number=r.receipt_number,
            supplier_name=r.supplier_name,
            payment_type=str(r.payment_type),
            total_cost=r.total_cost,
            purchase_date=r.purchase_date,
            created_at=r.created_at,
            item_count=len(r.items)
        )
        for r in receipts
    ]


@router.delete('/delete/{receipt_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_validation)
):
    try:
        receipt = db.query(PurchaseReceipt).filter(PurchaseReceipt.id == receipt_id).first()
        if not receipt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Purchase receipt not found"
            )
        db.delete(receipt)
        db.commit()

    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete purchase receipt"
        )