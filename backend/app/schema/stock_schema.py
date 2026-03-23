from pydantic import BaseModel
from typing import Optional
from datetime import datetime,date

class StockCreate(BaseModel):
    product_id:int
    quantity: int
    cost_price:float
    expiry_date: Optional[date] = None


class StockResponse(BaseModel):
    id:int
    product_id:int
    quantity:int
    cost_price:float
    expiry_date: Optional[date] = None
    created_at:datetime
    updated_at:datetime

class StockConsumptionReport(BaseModel):
    stock_id:int
    product_name:str
    current_quantity:int
    initial_stock_quantity:int
    total_quantity_sold:int
    average_daily_consumption:float
    estimated_days_remaining:int

class TotalProductStock(BaseModel):
    product_id:int
    product_name:str
    total_quantity:int
    
class StockExpireAlert(BaseModel):
    stock_id:int
    product_id:int
    product_name:str
    expire_date:Optional[date]
    days_to_expire:int
    # expiry_status:str
    quantity_affected:str
    stock_value_cost:float
    recommended_action:str
