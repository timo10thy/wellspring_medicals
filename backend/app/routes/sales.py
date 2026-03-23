from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated
from datetime import date
from app.routes.basemodel import get_db
from app.models.users import User
from app.models.sales import Sales
from app.models.stock import Stocks
from app.models.products import Products
from app.middlewares.auth import AuthMiddleware
from app.schema.sales_schema import SaleCreate, SaleResponse,ReceiptResponse
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sales", tags=["Sales"])
db_dependency = Annotated[Session, Depends(get_db)]
@router.post("/create",response_model=SaleResponse,status_code=status.HTTP_201_CREATED)
def create_sales(sales_data: SaleCreate,db: db_dependency,current_user: User = Depends(AuthMiddleware)
):
    try:
       
        stock = db.query(Stocks).filter(Stocks.id == sales_data.stock_id).first()

        if not stock:
            raise HTTPException(
                status_code=404,
                detail="Stock not found"
            )

      
        if stock.expiry_date and stock.expiry_date < date.today():
            raise HTTPException(
                status_code=400,
                detail="Cannot sell expired stock"
            )

        
        if sales_data.quantity_sold <= 0:
            raise HTTPException(
                status_code=400,
                detail="Sale quantity must be greater than zero"
            )

        if stock.quantity < sales_data.quantity_sold:
            raise HTTPException(
                status_code=400,
                detail="Insufficient stock"
            )

        
        product = stock.product
        if not product:
            raise HTTPException(
                status_code=404,
                detail="Product for this stock not found"
            )

        if sales_data.selling_price > product.price:
            raise HTTPException(
                status_code=409,
                detail = "Can't sell above the product price"
            )

        if sales_data.selling_price < product.price:
            if current_user.role != "ADMIN":
                raise HTTPException(
                    status_code=403,
                    detail="Selling below product price requires admin approval"
                )
       
        total_amount = (sales_data.quantity_sold * sales_data.selling_price)

        sale = Sales(
            stock_id=stock.id,
            sold_by=current_user.id,
            quantity_sold=sales_data.quantity_sold,
            selling_price=sales_data.selling_price,
            total_amount=total_amount,
            created_by=current_user.id
        )

        stock.quantity -= sales_data.quantity_sold

        db.add(sale)
        db.commit()
        db.refresh(sale)

        return sale

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create sale: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to create sale"
        )

@router.get('/{sales_id}/salesreceipt',response_model=ReceiptResponse,status_code=status.HTTP_200_OK)
def receipt(sales_id:int,db:Session=Depends(get_db)):
    sales=db.query(Sales).filter(Sales.id == sales_id).first()
    if not sales:
        raise HTTPException(status_code=404,detail='Sales dont exist')
    
    staff = db.query(User).filter(User.id == sales.sold_by).first()
    stock = sales.stock
    product = stock.product
    return {
        "sale_id": sales.id,
        "sold_by": staff.user_name,
        "product_name": product.name,
        "quantity_sold": sales.quantity_sold,
        "unit_price": sales.selling_price,
        "total_amount": sales.total_amount,
        "created_at": sales.created_at
    }
        