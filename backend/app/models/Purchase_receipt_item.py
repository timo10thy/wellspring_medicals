from sqlalchemy import Column, Integer, String, DateTime, Numeric, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.models.base import Base



class PurchaseReceiptItem(Base):
    __tablename__ = 'purchase_receipt_items'

    id = Column(Integer, primary_key=True, index=True)
    receipt_id = Column(
        Integer,
        ForeignKey('purchase_receipts.id', ondelete='CASCADE'),
        nullable=False
    )
    stock_id = Column(
        Integer,
        ForeignKey('stocks.id', ondelete='SET NULL'),
        nullable=True
    )
    product_id = Column(
        Integer,
        ForeignKey('products.id', ondelete='SET NULL'),
        nullable=True
    )
    product_name_snapshot = Column(String(200), nullable=False)
    quantity_purchased = Column(Integer, nullable=False)
    unit_cost = Column(Numeric(10, 2), nullable=False)
    total_line_cost = Column(Numeric(12, 2), nullable=False)
    expiry_date = Column(Date, nullable=True)
    restock_level = Column(Integer, nullable=True)

    receipt = relationship("PurchaseReceipt", back_populates="items")
    stock = relationship("Stocks")
    product = relationship("Products")