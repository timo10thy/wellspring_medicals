from sqlalchemy import Column, Integer, DateTime, Date, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import relationship
from app.models.base import Base


class StockReconciliation(Base):
    __tablename__ = 'stock_reconciliations'

    id              = Column(Integer, primary_key=True, nullable=False, index=True)
    product_id      = Column(Integer, ForeignKey('products.id', ondelete='CASCADE'), nullable=False)
    recon_date      = Column(Date, nullable=False)              
    opening_qty     = Column(Integer, nullable=False)           
    units_sold      = Column(Integer, nullable=False, default=0) 
    units_added     = Column(Integer, nullable=False, default=0) 
    expected_qty    = Column(Integer, nullable=False)           
    physical_qty    = Column(Integer, nullable=False)           
    variance        = Column(Integer, nullable=False)           

    notes           = Column(Text, nullable=True)               
    recorded_by     = Column(Integer, ForeignKey('user.id'), nullable=False)
    created_at      = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    product         = relationship("Products")
    recorder        = relationship("User", foreign_keys=[recorded_by])