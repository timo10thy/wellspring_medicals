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
    created_at: datetime