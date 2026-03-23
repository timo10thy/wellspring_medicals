from fastapi import APIRouter, Depends, status, HTTPException
from app.schema.product_schema import ProductCreate,ProductResponse,ProductDetailResponse,ProductUpdate
from sqlalchemy.orm import Session
from app.routes.basemodel import get_db
from app.models.users import User
from app.models.products import Products
from app.middlewares.admin import admin_validation
from app.middlewares.auth import AuthMiddleware
from typing import Annotated
from sqlalchemy.orm import relationship
import logging
import bcrypt

logger=logging.getLogger(__name__)
router= APIRouter(prefix='/product',tags=['Product'])

@router.post('/create',response_model=ProductResponse,status_code=status.HTTP_201_CREATED)
def product_create(product_data:ProductCreate, db:Session=Depends(get_db),current_admin: User = Depends(admin_validation)):
    try:
        current_product = db.query(Products).filter(Products.name == product_data.name).first()
        if current_product:
            raise HTTPException(status_code=400,detail="Product name alrealdy exit")
        new_product= Products(
            name=product_data.name,
            price= product_data.price,
            is_active=product_data.is_active,
            description=product_data.description
        )
        db.add(new_product)
        db.commit()
        db.refresh(new_product)
        return new_product
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500,detail='Fail to create product')
    

    
@router.get("/{product_id}/details",response_model=ProductDetailResponse,status_code=status.HTTP_200_OK)
def get_product_details(product_id: int,db: Session = Depends(get_db),current_user: User = Depends(AuthMiddleware)):
    product = db.query(Products).filter(Products.id == product_id).first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    
    if current_user.role == "USER" and not product.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

   
    current_stock_quantity = sum(
        stock.quantity for stock in product.stocks
    )

    return {
        "id": product.id,
        "name": product.name,
        "price": product.price,
        "is_active": product.is_active,
        "description": product.description,
        "current_stock_quantity": current_stock_quantity
    }

@router.put("/{product_id}/update",response_model=ProductUpdate,status_code=status.HTTP_200_OK)
def update_product(product_id:int,product_data: ProductUpdate, db:Session = Depends(get_db),current_user: User =Depends(AuthMiddleware)):
    product = db.query(Products).filter(Products.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=403,
            detail='Product not found'
        )
    if current_user.role == "USER":
        raise HTTPException(
            status_code=status.HTTP_403,
            detail="Forbidden: Admin only"
        )
    product.price = product_data.price
    db.commit()
    db.refresh(product)

    return product_data
      
        
# @router.put("/{product_id}/update",response_model=ProductUpdate,status_code=status.HTTP_200_OK)
# def
