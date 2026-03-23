from pydantic import BaseModel,constr,validator
import re
from datetime import datetime
from typing import Optional

class ProductCreate(BaseModel):
    name:constr(min_length=3, max_length=20, strip_whitespace=True)
    price:float
    is_active:bool=True
    description:str

    @validator("name")
    def normalize_name(cls, v: str) -> str:
        return re.sub(r"\s+", "", v)


class ProductResponse(BaseModel):
    id: int
    name: str
    price: float
    is_active: bool
    description: str
    created_at: datetime
    updated_at: datetime

class ProductDetailResponse(BaseModel):
    id:int
    name:str
    price:float
    is_active:bool
    description:str
    current_stock_quantity: int

class ProductUpdate(BaseModel):
    price:float
