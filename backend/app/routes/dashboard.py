from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import date, datetime
from decimal import Decimal

from app.routes.basemodel import get_db
from app.middlewares.admin import admin_validation
from app.models.users import User
from app.models.sales import Sales
from app.models.stock import Stocks
from app.models.products import Products
from app.models.expenses import Expense
from app.models.Purchase_receipt import PurchaseReceipt

import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix='/dashboard', tags=['Dashboard'])


@router.get('/analytics', status_code=status.HTTP_200_OK)
def dashboard_analytics(
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_validation)
):
    today = date.today()
    month = today.month
    year  = today.year

    # ── Sales today ───────────────────────────────────────────────────────────
    sales_today_result = db.query(func.sum(Sales.total_amount)).filter(
        func.date(Sales.created_at) == today
    ).scalar()
    sales_today = float(sales_today_result or 0)

    sales_today_count = db.query(func.count(Sales.id)).filter(
        func.date(Sales.created_at) == today
    ).scalar() or 0

    # ── Recent sales (last 10) ────────────────────────────────────────────────
    recent_sales_rows = (
        db.query(Sales, Products.name)
        .join(Stocks, Sales.stock_id == Stocks.id)
        .join(Products, Stocks.product_id == Products.id)
        .order_by(Sales.created_at.desc())
        .limit(10)
        .all()
    )
    recent_sales = [
        {
            "sale_id":      sale.id,
            "product_name": name,
            "quantity_sold": sale.quantity_sold,
            "total_amount": float(sale.total_amount),
            "created_at":   sale.created_at.isoformat(),
        }
        for sale, name in recent_sales_rows
    ]

    # ── Total purchases this month ────────────────────────────────────────────
    try:
        purchases_result = db.query(func.sum(PurchaseReceipt.total_cost)).filter(
            extract('month', PurchaseReceipt.purchase_date) == month,
            extract('year',  PurchaseReceipt.purchase_date) == year,
        ).scalar()
        total_purchases = float(purchases_result or 0)
    except Exception:
        total_purchases = 0.0

    # ── Profit estimate this month ────────────────────────────────────────────
    revenue_result = db.query(func.sum(Sales.total_amount)).filter(
        extract('month', Sales.created_at) == month,
        extract('year',  Sales.created_at) == year,
    ).scalar()
    total_revenue = float(revenue_result or 0)

    expenses_result = db.query(func.sum(Expense.amount)).filter(
        extract('month', Expense.expense_date) == month,
        extract('year',  Expense.expense_date) == year,
    ).scalar()
    total_expenses = float(expenses_result or 0)

    profit_estimate = total_revenue - total_expenses - total_purchases

    # ── Stock alerts ──────────────────────────────────────────────────────────
    stock_totals = (
        db.query(
            Products.id.label('product_id'),
            Products.name.label('product_name'),
            func.sum(Stocks.quantity).label('total_quantity')
        )
        .join(Stocks, Stocks.product_id == Products.id)
        .group_by(Products.id, Products.name)
        .all()
    )

    low_stock  = [s for s in stock_totals if 0 < s.total_quantity < 10]
    out_stock  = [s for s in stock_totals if s.total_quantity <= 0]

    low_stock_alerts = [
        {"product_id": s.product_id, "product_name": s.product_name, "total_quantity": s.total_quantity}
        for s in low_stock
    ]

    return {
        "sales_today":        sales_today,
        "sales_today_count":  sales_today_count,
        "total_purchases":    total_purchases,
        "total_revenue":      total_revenue,
        "total_expenses":     total_expenses,
        "profit_estimate":    profit_estimate,
        "low_stock_count":    len(low_stock),
        "out_of_stock_count": len(out_stock),
        "low_stock_alerts":   low_stock_alerts,
        "recent_sales":       recent_sales,
    }