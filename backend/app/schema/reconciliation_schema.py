from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import date, datetime


class ReconciliationCreate(BaseModel):
    product_id:   int
    recon_date:   date
    opening_qty:  int
    physical_qty: int   
    notes:        Optional[str] = None

    @field_validator('opening_qty', 'physical_qty')
    @classmethod
    def must_be_non_negative(cls, v):
        if v < 0:
            raise ValueError('Quantity cannot be negative')
        return v


class ReconciliationResponse(BaseModel):
    id:           int
    product_id:   int
    product_name: str
    recon_date:   date
    opening_qty:  int
    units_sold:   int
    units_added:  int
    expected_qty: int
    physical_qty: int
    variance:     int
    notes:        Optional[str]
    recorded_by:  str    
    created_at:   datetime

    class Config:
        from_attributes = True