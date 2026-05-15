from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.models.base import Base

class StockMovement(Base):
    __tablename__ = 'stock_movements'

    id               = Column(Integer, primary_key=True, index=True)
    stock_id         = Column(Integer, ForeignKey('stocks.id', ondelete='CASCADE'), nullable=False)
    product_id       = Column(Integer, ForeignKey('products.id', ondelete='CASCADE'), nullable=False)
    movement_type    = Column(String(20), nullable=False)  # stock_in | sale | void_restore
    quantity_before  = Column(Integer, nullable=False)
    quantity_changed = Column(Integer, nullable=False)
    quantity_after   = Column(Integer, nullable=False)
    performed_by     = Column(String(100), nullable=False)
    reference_id     = Column(Integer, nullable=True)   # sale_id or receipt_id
    note             = Column(String(300), nullable=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    stock   = relationship("Stocks", backref="movements")
    product = relationship("Products", backref="stock_movements")