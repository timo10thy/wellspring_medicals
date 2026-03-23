from fastapi import APIRouter, Depends, status, HTTPException, Query
from sqlalchemy.orm import Session,joinedload
from sqlalchemy import func
from app.models.users import User
from typing import Annotated
from app.schema.stock_schema import StockCreate,StockResponse,StockConsumptionReport,TotalProductStock,StockExpireAlert
from app.routes.basemodel import get_db
from app.middlewares.admin import admin_validation
from app.models.users import User
from app.models.products import Products
from app.models.stock import Stocks
from app.models.sales import Sales
from datetime import datetime,date,timedelta
import logging


logger=logging.getLogger(__name__)
router=APIRouter(prefix='/stock',tags=['Stock'])
@router.post('/create', response_model=StockResponse, status_code=status.HTTP_201_CREATED)
def stock_create(stock_data: StockCreate,db: Session = Depends(get_db),current_admin: User = Depends(admin_validation)):
    
    if stock_data.quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stock quantity must be greater than zero"
        )

    if stock_data.cost_price <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stock cost price must be greater than zero"
        )

   
    try:
        product = db.query(Products).filter(
            Products.id == stock_data.product_id
        ).first()

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )

        
        new_stock = Stocks(
            product_id=stock_data.product_id,
            quantity=stock_data.quantity,
            cost_price=stock_data.cost_price,
            expiry_date=stock_data.expiry_date
        )

        db.add(new_stock)
        db.commit()
        db.refresh(new_stock)

        return new_stock

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create stock"
        )


@router.get("/{stock_id}/consumption",response_model=StockConsumptionReport,status_code=status.HTTP_200_OK)
def check_consumption(stock_id: int,db: Session = Depends(get_db),current_admin: User = Depends(admin_validation)):
    stock = db.query(Stocks).filter(Stocks.id == stock_id).first()
    if not stock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stock not found"
        )
    
    product = stock.product
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product for this stock not found"
        )

    sales = db.query(Sales).filter(Sales.stock_id == stock.id).all()
    total_quantity_sold = sum(sale.quantity_sold for sale in sales)
    initial_stock_quantity = stock.quantity + total_quantity_sold
    if sales:
        first_sale_date = min(sale.created_at.date() for sale in sales)
        days_active = (date.today() - first_sale_date).days or 1
        average_daily_consumption = total_quantity_sold / days_active
    else:
        average_daily_consumption = 0
    if average_daily_consumption > 0:
        estimated_days_remaining = int(stock.quantity / average_daily_consumption)
    else:
        estimated_days_remaining = 0

    return {
        "stock_id": stock.id,
        "product_name": product.name,
        "current_quantity": stock.quantity,
        "initial_stock_quantity": initial_stock_quantity,
        "total_quantity_sold": total_quantity_sold,
        "average_daily_consumption": round(average_daily_consumption, 2),
        "estimated_days_remaining": estimated_days_remaining
    }

@router.post('/add/stock', response_model=StockResponse, status_code=status.HTTP_201_CREATED)
def new_stock(
    stock_data: StockCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_validation)
):
    
    product = db.query(Products).filter(Products.id == stock_data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product does not exist")

    
    existing_stock = db.query(Stocks).filter(
        Stocks.product_id == stock_data.product_id,
        Stocks.cost_price == stock_data.cost_price,
        Stocks.expiry_date == stock_data.expiry_date
    ).first()

    if existing_stock:
        
        existing_stock.quantity += stock_data.quantity
        db.add(existing_stock)
        db.commit()
        db.refresh(existing_stock)
        return existing_stock
    else:
        new_stock = Stocks(
            product_id=stock_data.product_id,
            quantity=stock_data.quantity,
            cost_price=stock_data.cost_price,
            expiry_date=stock_data.expiry_date
        )
        db.add(new_stock)
        db.commit()
        db.refresh(new_stock)
        return new_stock

def get_total_stock_quantity(product_id: int, db: Session):
    all_stocks = db.query(Stocks).filter(Stocks.product_id == product_id).all()
    return sum(stock.quantity for stock in all_stocks)


@router.get("/stock/total", response_model=list[TotalProductStock],status_code=status.HTTP_200_OK)
def total_product_per_stock(db:Session = Depends(get_db), current_admin: User=Depends(admin_validation)):
    total_stock =(
        db.query(
            Products.id.label("product_id"),
            Products.name.label("product_name"),
            func.sum(Stocks.quantity).label("total_quantity")
        )
        .join(Stocks, Stocks.product_id == Products.id)
        .group_by(Products.id, Products.name)
        .all()
    )

    return total_stock


@router.get('/products/{product_id}/stock/total', response_model=TotalProductStock, status_code=status.HTTP_200_OK)
def get_product_total_stock(product_id: int, db: Session = Depends(get_db), current_admin: User = Depends(admin_validation)):
    total_stock = (
        db.query(
            Products.id.label("product_id"),
            Products.name.label("product_name"),
            func.sum(Stocks.quantity).label("total_quantity")
        )
        .join(Stocks, Stocks.product_id == Products.id)
        .filter(Products.id == product_id)
        .group_by(Products.id, Products.name)
        .first()
    )

    if not total_stock:
        raise HTTPException(status_code=404, detail="Product not found or no stock available")

    return total_stock


@router.get("/stock/total/search",response_model=list[TotalProductStock],status_code=status.HTTP_200_OK)
def total_product_per_stock(db:Session = Depends(get_db), current_admin: User=Depends(admin_validation)):
    total_stock =(
        db.query(
            Products.id.label("product_id"),
            Products.name.label("product_name"),
            func.sum(Stocks.quantity).label("total_quantity")
        )
        .join(Stocks, Stocks.product_id == Products.id)
        .group_by(Products.id, Products.name)
        .all()
    )

    return total_stock
@router.get("/total/search",response_model=list[TotalProductStock],status_code=status.HTTP_200_OK)
def search_total_product_stock(
    product_name: str | None = Query(
        default=None,
        description="Search product by name (partial match)"
    ),
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_validation),
):
    query = (
        db.query(
            Products.id.label("product_id"),
            Products.name.label("product_name"),
            func.sum(Stocks.quantity).label("total_quantity")
        )
        .join(Stocks, Stocks.product_id == Products.id)
        .group_by(Products.id, Products.name)
    )

    if product_name:
        query = query.filter(
            Products.name.ilike(f"%{product_name}%")
        )

    return query.all()


@router.get("/stocks/expiry-alerts",response_model=list[StockExpireAlert],status_code=status.HTTP_200_OK)
def expiration_alert(db: Session = Depends(get_db),current_admin: User = Depends(admin_validation)):

    today = date.today()
    expiry_window = today + timedelta(days=180)

    stocks = (
        db.query(Stocks)
        .join(Stocks.product)  
        .options(joinedload(Stocks.product)) 
        .filter(
            Stocks.expiry_date != None,
            Stocks.expiry_date <= expiry_window
        )
        .all()
    )

    def get_expiry_action(days: int) -> str:
        if 90 <= days <= 180:
            return "Warning: product life span is getting low"
        elif 45 <= days <= 89:
            return "Warning: Product should be discounted"
        elif 30 <= days <= 44:
            return "Critical level: Product should be returned"
        elif 1 <= days <= 29:
            return "Very critical: Product will soon expire"
        else:
            return "Expired product - remove immediately"

    alerts = []

    for stock in stocks:
        remaining_days = (stock.expiry_date - today).days

        alerts.append(
            StockExpireAlert(
                stock_id=stock.id,
                product_id=stock.product_id,
                product_name=stock.product.name,
                expire_date=stock.expiry_date,
                days_to_expire=remaining_days,
                quantity_affected=str(stock.quantity),
                stock_value_cost=float(stock.quantity * stock.cost_price),
                recommended_action=get_expiry_action(remaining_days)
            )
        )

    return alerts
        
