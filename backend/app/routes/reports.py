from fastapi import APIRouter, Depends, status, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import date, timedelta
from decimal import Decimal
from typing import Literal

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

router = APIRouter(prefix='/reports', tags=['Reports'])


def get_date_range(period: str):
    today = date.today()
    if period == 'daily':
        return today, today
    elif period == 'weekly':
        start = today - timedelta(days=today.weekday())  # Monday
        return start, today
    elif period == 'monthly':
        return today.replace(day=1), today
    elif period == 'yearly':
        return today.replace(month=1, day=1), today
    else:
        raise HTTPException(status_code=400, detail="Invalid period. Use: daily, weekly, monthly, yearly")


@router.get('/summary', status_code=status.HTTP_200_OK)
def sales_summary(
    period: str = Query(default='daily', description="daily | weekly | monthly | yearly"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_validation)
):
    start, end = get_date_range(period)

    # ── Sales ─────────────────────────────────────────────────────────────────
    sales_rows = (
        db.query(Sales, Products.name)
        .join(Stocks, Sales.stock_id == Stocks.id)
        .join(Products, Stocks.product_id == Products.id)
        .filter(func.date(Sales.created_at) >= start,
                func.date(Sales.created_at) <= end)
        .all()
    )

    total_sales_amount  = sum(float(s.total_amount) for s, _ in sales_rows)
    total_sales_count   = len(sales_rows)
    total_units_sold    = sum(s.quantity_sold for s, _ in sales_rows)

    # ── Top selling products ──────────────────────────────────────────────────
    product_totals = {}
    for sale, name in sales_rows:
        if name not in product_totals:
            product_totals[name] = {'units': 0, 'revenue': 0.0}
        product_totals[name]['units']   += sale.quantity_sold
        product_totals[name]['revenue'] += float(sale.total_amount)

    top_products = sorted(
        [{'product_name': k, 'units_sold': v['units'], 'revenue': v['revenue']}
         for k, v in product_totals.items()],
        key=lambda x: x['units_sold'],
        reverse=True
    )[:10]

    # ── Expenses (operating only — excludes GOODS_PURCHASE) ──────────────────
    # Daily shows operating expenses; weekly/monthly/yearly show all expenses
    expense_query = (
        db.query(Expense)
        .filter(func.date(Expense.expense_date) >= start,
                func.date(Expense.expense_date) <= end)
    )

    if period == 'daily':
        # Exclude goods purchase from daily operating expenses
        expense_query = expense_query.filter(
            Expense.category != 'GOODS_PURCHASE'
        )

    expenses = expense_query.all()
    total_expenses = sum(float(e.amount) for e in expenses)

    expense_breakdown = {}
    for e in expenses:
        cat = str(e.category)
        expense_breakdown[cat] = expense_breakdown.get(cat, 0.0) + float(e.amount)

    expense_breakdown_list = [
        {'category': k, 'total': v}
        for k, v in sorted(expense_breakdown.items(), key=lambda x: x[1], reverse=True)
    ]

    # ── Purchases (weekly, monthly, yearly only) ──────────────────────────────
    total_purchases = 0.0
    purchase_count  = 0
    purchases_list  = []

    if period in ('weekly', 'monthly', 'yearly'):
        purchase_rows = (
            db.query(PurchaseReceipt)
            .filter(PurchaseReceipt.purchase_date >= start,
                    PurchaseReceipt.purchase_date <= end)
            .order_by(PurchaseReceipt.purchase_date.desc())
            .all()
        )
        total_purchases = sum(float(p.total_cost) for p in purchase_rows)
        purchase_count  = len(purchase_rows)
        purchases_list  = [
            {
                'receipt_number': p.receipt_number,
                'supplier_name':  p.supplier_name,
                'total_cost':     float(p.total_cost),
                'purchase_date':  str(p.purchase_date),
            }
            for p in purchase_rows
        ]

    # ── Profit ────────────────────────────────────────────────────────────────
    profit = total_sales_amount - total_expenses - total_purchases

    return {
        'period':              period,
        'date_from':           str(start),
        'date_to':             str(end),

        # Sales
        'total_sales_amount':  total_sales_amount,
        'total_sales_count':   total_sales_count,
        'total_units_sold':    total_units_sold,

        # Expenses
        'total_expenses':      total_expenses,
        'expense_breakdown':   expense_breakdown_list,

        # Purchases (weekly/monthly/yearly)
        'total_purchases':     total_purchases,
        'purchase_count':      purchase_count,
        'purchases':           purchases_list,

        # Profit
        'profit':              profit,

        # Top products
        'top_products':        top_products,
    }