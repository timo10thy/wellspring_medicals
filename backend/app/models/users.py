from sqlalchemy import Column, Integer, String, DateTime, Enum, func
from app.models.base import Base
from app.models.enum import UserRole
from sqlalchemy.orm import relationship


class User(Base):
    __tablename__="user"
    id =Column(Integer, primary_key=True, nullable=False, index=True)
    name = Column(String(100),nullable=False)
    email=Column(String(100), unique=True, nullable=False)
    password=Column(String(200),nullable=False)
    user_name=Column(String(50),  unique=True, nullable= False)
    role= Column(UserRole,nullable=False)
    image= Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True),server_default=func.now(),server_onupdate=func.now(),  
    nullable=False
)


    sold_sales = relationship("Sales",foreign_keys="Sales.sold_by",back_populates="sold_by_user")

    created_sales = relationship("Sales",foreign_keys="Sales.created_by",back_populates="created_by_user")
