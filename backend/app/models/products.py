from app.models.base import Base
from sqlalchemy import Column, Integer, String, DateTime, Numeric, Boolean, func
from sqlalchemy.orm import relationship


class Products(Base):
    __tablename__ = 'products'

    id             = Column(Integer, primary_key=True, nullable=False, index=True)
    name           = Column(String(200), unique=True, nullable=False)
    price          = Column(Numeric(10, 2), nullable=False)
    is_active      = Column(Boolean, nullable=False, default=True, server_default='1')
    description    = Column(String(500), nullable=False)

    # Cut drug support
    is_cuttable      = Column(Boolean, nullable=False, default=False, server_default='false')
    sub_unit         = Column(String(50), nullable=True)   # e.g. "tablet", "capsule"
    pieces_per_unit  = Column(Integer, nullable=True)      # e.g. 10 tablets per strip

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    stocks = relationship("Stocks", back_populates="product", cascade="all, delete")