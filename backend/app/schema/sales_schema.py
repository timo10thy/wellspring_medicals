from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class SaleCreate(BaseModel):
    stock_id: int
    quantity_sold: int
    selling_price: float

class SaleResponse(BaseModel):
    id: int
    stock_id: int
    quantity_sold: int
    selling_price: float
    total_amount: float
    created_at: datetime

class ReceiptResponse(BaseModel):
    sale_id: int
    sold_by: str
    product_name: str
    quantity_sold: int
    unit_price: float
    total_amount: float

class SaleItemCreate(BaseModel):
    product_id: int
    quantity_sold: int
    selling_price: float

class MultiSaleCreate(BaseModel):
    items: list[SaleItemCreate]
    txn_id: Optional[str] = None
    discount: Optional[float] = 0.0  

class SaleItemResponse(BaseModel):
    sale_id: int
    product_name: str
    quantity_sold: int
    unit_price: float
    total_amount: float

class MultiReceiptResponse(BaseModel):
    receipt_id: int
    sold_by: str
    items: list[SaleItemResponse]
    grand_total: float
    discount: float
    amount_paid: float
    created_at: datetime