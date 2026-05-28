from pydantic import BaseModel, validator
from datetime import datetime
from typing import Optional


class SaleCreate(BaseModel):
    stock_id: int
    quantity_sold: int
    selling_price: float


class SaleResponse(BaseModel):
    id: int
    stock_id: int
    quantity_sold: float
    selling_price: float
    total_amount: float
    created_at: datetime


class ReceiptResponse(BaseModel):
    sale_id: int
    sold_by: str
    product_name: str
    quantity_sold: float
    unit_price: float
    total_amount: float


class SaleItemCreate(BaseModel):
    stock_id:          int
    quantity_sold:     float          # base units (for whole drugs) OR sub-units (for cut drugs)
    selling_price:     float          # price per base unit
    discount_amount:   float = 0.0   # flat discount on this item
    is_cut:            bool = False   # True if selling in sub-units
    sub_quantity_sold: Optional[float] = None  # actual pieces entered by attendant
    sub_unit:          Optional[str]  = None   # e.g. "tablet"
    pieces_per_unit:   Optional[int]  = None   # e.g. 10


class MultiSaleCreate(BaseModel):
    items:  list[SaleItemCreate]
    txn_id: Optional[str] = None


class SaleItemResponse(BaseModel):
    sale_id:           int
    product_name:      str
    quantity_sold:     float
    sub_quantity_sold: Optional[float] = None
    sub_unit:          Optional[str]   = None
    unit_price:        float
    discount_amount:   float = 0.0
    total_amount:      float


class MultiReceiptResponse(BaseModel):
    receipt_id:  int
    sold_by:     str
    items:       list[SaleItemResponse]
    grand_total: float
    created_at:  datetime