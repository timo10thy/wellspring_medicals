from sqlalchemy import Column, Integer, String, DateTime, Numeric, ForeignKey, Date, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base
from app.models.enum import PaymentType



class PurchaseReceipt(Base):
    __tablename__ = 'purchase_receipts'

    id = Column(Integer, primary_key=True, index=True)
    receipt_number = Column(String(100), unique=True, nullable=False)
    supplier_name = Column(String(255), nullable=False)
    supplier_contact = Column(String(100), nullable=False)
    payment_type = Column(PaymentType, nullable=False)
    total_cost = Column(Numeric(12, 2), nullable=False)
    notes = Column(Text, nullable=True)
    purchase_date = Column(Date, nullable=False)
    created_by = Column(Integer, ForeignKey("user.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    created_by_user = relationship("User", foreign_keys=[created_by])
    items = relationship(
        "PurchaseReceiptItem",
        back_populates="receipt",
        cascade="all, delete-orphan"
    )