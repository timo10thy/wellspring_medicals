from sqlalchemy import Column, Integer, String, DateTime, Numeric, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base
from app.models.enum import ExpenseType, PaymentType


class Expense(Base):
    __tablename__ = 'expenses'

    id = Column(Integer, primary_key=True, index=True) 
    amount = Column(Numeric(10, 2), nullable=False) 
    category = Column(ExpenseType, nullable=False)
    description = Column(String(500), nullable=True)
    reference = Column(String(255), nullable=True)
    payment_type = Column(PaymentType, nullable=False)
    expense_date = Column(DateTime(timezone=True), nullable=False)
    created_by = Column(Integer, ForeignKey("user.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    user = relationship("User")