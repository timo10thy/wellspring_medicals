from sqlalchemy import Column, Integer, DateTime, ForeignKey, Numeric, String, Boolean, func
from sqlalchemy.orm import relationship
from app.models.base import Base


class Sales(Base):
    __tablename__ = 'sales'
    
    id = Column(Integer, primary_key=True, nullable=False, index=True)
    stock_id = Column(Integer, ForeignKey('stocks.id', ondelete='CASCADE'), nullable=False)
    sold_by = Column(Integer, ForeignKey('user.id'), nullable=False) 
    quantity_sold = Column(Integer, nullable=False)
    selling_price = Column(Numeric(10, 2), nullable=False)
    total_amount = Column(Numeric(12, 2), nullable=False)
    created_by = Column(Integer, ForeignKey("user.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Void support
    is_voided = Column(Boolean, default=False, nullable=False, server_default='false')
    void_reason = Column(String(500), nullable=True)
    voided_by = Column(String(100), nullable=True)
    voided_at = Column(DateTime(timezone=True), nullable=True)

    stock = relationship("Stocks", back_populates="sales")
    sold_by_user = relationship("User", foreign_keys="Sales.sold_by", back_populates="sold_sales")
    created_by_user = relationship("User", foreign_keys="Sales.created_by", back_populates="created_sales")