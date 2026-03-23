from fastapi import FastAPI
from app.models.base import Base
from sqlalchemy import Column, Integer, String, DateTime, Enum, func,Numeric,Boolean
from sqlalchemy.orm import relationship


class Products(Base):
    __tablename__='products'
    id= Column(Integer, primary_key= True, nullable=False, index=True)
    name= Column(String(200), unique=True, nullable=False)
    price = Column(Numeric(10,2), nullable=False)
    is_active= Column(Boolean, nullable=False, default=True, server_default='1')
    description= Column(String(500), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now(), nullable= False
    )
    
    stocks = relationship("Stocks",back_populates="product",cascade="all, delete")
