from pydantic import BaseModel, field_validator, model_validator
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from enum import Enum


class PaymentTypeEnum(str, Enum):
    CASH = "CASH"
    TRANSFER = "TRANSFER"
    POS = "POS"



class PurchaseReceiptItemCreate(BaseModel):
    product_id: int
    product_name_snapshot: str
    quantity_purchased: int
    unit_cost: Decimal
    expiry_date: Optional[date] = None
    restock_level: Optional[int] = None
    total_line_cost: Optional[Decimal] = None

    @model_validator(mode="after")
    def compute_total(self):
        self.total_line_cost = self.quantity_purchased * self.unit_cost
        return self

    @field_validator("quantity_purchased")
    @classmethod
    def qty_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("quantity_purchased must be greater than 0")
        return v

    @field_validator("unit_cost")
    @classmethod
    def cost_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("unit_cost must be greater than 0")
        return v


class PurchaseReceiptItemOut(BaseModel):
    id: int
    receipt_id: int
    stock_id: Optional[int]
    product_id: Optional[int]
    product_name_snapshot: str
    quantity_purchased: int
    unit_cost: Decimal
    total_line_cost: Decimal
    expiry_date: Optional[date]
    restock_level: Optional[int]

    model_config = {"from_attributes": True}


class PurchaseReceiptCreate(BaseModel):
    supplier_name: str
    supplier_contact: str
    payment_type: PaymentTypeEnum
    purchase_date: date
    notes: Optional[str] = None
    items: List[PurchaseReceiptItemCreate]

    @field_validator("items")
    @classmethod
    def must_have_items(cls, v):
        if not v:
            raise ValueError("A purchase receipt must have at least one item")
        return v


class PurchaseReceiptOut(BaseModel):
    id: int
    receipt_number: str
    supplier_name: str
    supplier_contact: str
    payment_type: str
    total_cost: Decimal
    purchase_date: date
    notes: Optional[str]
    created_by: int
    created_at: datetime
    items: List[PurchaseReceiptItemOut]

    model_config = {"from_attributes": True}


class PurchaseReceiptSummary(BaseModel):
    id: int
    receipt_number: str
    supplier_name: str
    payment_type: str
    total_cost: Decimal
    purchase_date: date
    created_at: datetime
    item_count: int

    model_config = {"from_attributes": True}