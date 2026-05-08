from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.models.base import Base

class VoidRequest(Base):
    __tablename__ = 'void_requests'

    id           = Column(Integer, primary_key=True, index=True)
    sale_id      = Column(Integer, ForeignKey('sales.id', ondelete='CASCADE'), nullable=False)
    requested_by = Column(String(100), nullable=False)
    reason       = Column(String(500), nullable=True)
    status       = Column(String(20), nullable=False, default='pending')
    reviewed_by  = Column(String(100), nullable=True)
    reviewed_at  = Column(DateTime(timezone=True), nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    sale = relationship("Sales", backref="void_requests")