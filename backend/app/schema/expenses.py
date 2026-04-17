from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from enum import Enum


class ExpenseTypeEnum(str, Enum):
    GOODS_PURCHASE = "GOODS_PURCHASE"
    OPERATING_EXPENSE = "OPERATING_EXPENSE"
    TRANSPORT = "TRANSPORT"
    RENT = "RENT"
    OTHER = "OTHER"


class PaymentTypeEnum(str, Enum):
    CASH = "CASH"
    TRANSFER = "TRANSFER"
    POS = "POS"


class ExpenseCreate(BaseModel):
    amount: Decimal
    category: ExpenseTypeEnum
    payment_type: PaymentTypeEnum
    expense_date: datetime
    description: Optional[str] = None
    reference: Optional[str] = None


class ExpenseResponse(BaseModel):
    id: int
    amount: Decimal
    category: str
    payment_type: str
    expense_date: datetime
    description: Optional[str] = None
    reference: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ExpenseUpdate(BaseModel):
    amount: Optional[Decimal] = None
    category: Optional[ExpenseTypeEnum] = None
    payment_type: Optional[PaymentTypeEnum] = None
    expense_date: Optional[datetime] = None
    description: Optional[str] = None
    reference: Optional[str] = None



class ExpenseCategoryBreakdown(BaseModel):
    category: str
    total: Decimal
    percentage: float


class ExpenseSummary(BaseModel):
    period_label: str
    total_expenses: Decimal
    total_revenue: Decimal
    gross_profit: Decimal
    profit_margin_pct: float
    breakdown: List[ExpenseCategoryBreakdown]




class InvestmentAdvice(BaseModel):
    profit: Decimal
    tier: str                  
    advice: str
    suggested_actions: List[str]


class ExpenseTrackerResponse(BaseModel):
    summary: ExpenseSummary
    investment_advice: InvestmentAdvice