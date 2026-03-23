from app.models.base import Base
from sqlalchemy import Column, Integer, DateTime, Date, func,ForeignKey,Numeric
from sqlalchemy.orm import relationship

class Stocks(Base):
    __tablename__='stocks'
    id = Column(Integer,primary_key=True,nullable=False,index=True)
    product_id= Column(Integer, ForeignKey('products.id', ondelete='CASCADE'),nullable=False)
    quantity= Column(Integer, nullable=False)
    cost_price = Column(Numeric(10,2), nullable=False)
    expiry_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True),server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now(), nullable= False
    )
    sales = relationship("Sales",back_populates="stock",cascade="all, delete")
    product = relationship("Products", back_populates="stocks")
    sales = relationship("Sales", back_populates="stock", cascade="all, delete")
