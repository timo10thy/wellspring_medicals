from pydantic import BaseModel, constr, validator
import re
from datetime import datetime
from typing import Optional


class ProductCreate(BaseModel):
    name:        constr(min_length=3, max_length=200, strip_whitespace=True)
    price:       float
    is_active:   bool = True
    description: str
    is_cuttable:       bool            = False
    sub_unit:          Optional[str]   = None
    pieces_per_unit:   Optional[int]   = None
    cut_selling_price: Optional[float] = None

    @validator("name")
    def normalize_name(cls, v: str) -> str:
        return re.sub(r"\s+", "", v)

    @validator("pieces_per_unit")
    def validate_pieces(cls, v, values):
        if values.get("is_cuttable") and (v is None or v <= 0):
            raise ValueError("pieces_per_unit is required and must be > 0 for cuttable products")
        return v

    @validator("sub_unit")
    def validate_sub_unit(cls, v, values):
        if values.get("is_cuttable") and not v:
            raise ValueError("sub_unit is required for cuttable products e.g. 'tablet'")
        return v


class ProductResponse(BaseModel):
    id:          int
    name:        str
    price:       float
    is_active:   bool
    description: str
    created_at:  datetime
    updated_at:  datetime


class ProductDetailResponse(BaseModel):
    id:                     int
    name:                   str
    price:                  float
    is_active:              bool
    description:            str
    current_stock_quantity: int
    is_cuttable:            bool
    sub_unit:               Optional[str]   = None
    pieces_per_unit:        Optional[int]   = None
    cut_selling_price:      Optional[float] = None


class ProductUpdate(BaseModel):
    price:             float
    is_cuttable:       bool            = False
    sub_unit:          Optional[str]   = None
    pieces_per_unit:   Optional[int]   = None
    cut_selling_price: Optional[float] = None
