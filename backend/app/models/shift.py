from sqlalchemy import Column, Integer, Numeric, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.models.base import Base

class Shift(Base):
    __tablename__ = 'shifts'

    id            = Column(Integer, primary_key=True, index=True)
    opened_by     = Column(Integer, ForeignKey('user.id'), nullable=False)
    closed_by     = Column(Integer, ForeignKey('user.id'), nullable=True)
    reviewed_by   = Column(String(100), nullable=True)

    # Calculated at close
    total_sales        = Column(Numeric(12, 2), default=0, nullable=False)
    pos_amount         = Column(Numeric(12, 2), nullable=True)   # POS entered by staff
    cash_expected      = Column(Numeric(12, 2), nullable=True)   # total_sales - pos_amount
    cash_counted       = Column(Numeric(12, 2), nullable=True)   # physical cash staff counted
    variance           = Column(Numeric(12, 2), nullable=True)   # cash_counted - cash_expected

    status        = Column(String(20), nullable=False, default='open')  # open | closed | approved | flagged
    note          = Column(String(500), nullable=True)  # admin note on review

    opened_at     = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    closed_at     = Column(DateTime(timezone=True), nullable=True)

    opener = relationship("User", foreign_keys=[opened_by])
    closer = relationship("User", foreign_keys=[closed_by])