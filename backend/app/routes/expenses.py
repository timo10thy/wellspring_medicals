from fastapi import APIRouter, Depends, status, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import Optional
from datetime import datetime
from decimal import Decimal

from app.routes.basemodel import get_db
from app.middlewares.admin import admin_validation
from app.middlewares.auth import AuthMiddleware
from app.models.users import User
from app.models.expenses import Expense
from app.models.sales import Sales
from app.schema.expenses import (
    ExpenseCreate,
    ExpenseResponse,
    ExpenseUpdate,
    ExpenseCategoryBreakdown,
    ExpenseSummary,
    InvestmentAdvice,
    ExpenseTrackerResponse,
)

import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix='/expenses', tags=['Expenses'])


@router.post('/create', response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    expense_data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_validation)
):
    try:
        new_expense = Expense(
            amount=expense_data.amount,
            category=expense_data.category,
            payment_type=expense_data.payment_type,
            expense_date=expense_data.expense_date,
            description=expense_data.description,
            reference=expense_data.reference,
            created_by=current_admin.id
        )
        db.add(new_expense)
        db.commit()
        db.refresh(new_expense)
        return new_expense

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create expense"
        )


@router.get('/all', response_model=list[ExpenseResponse], status_code=status.HTTP_200_OK)
def get_all_expenses(
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_validation)
):
    return db.query(Expense).order_by(Expense.expense_date.desc()).all()


@router.get('/{expense_id}', response_model=ExpenseResponse, status_code=status.HTTP_200_OK)
def get_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_validation)
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    return expense



@router.patch('/update/{expense_id}', response_model=ExpenseResponse, status_code=status.HTTP_200_OK)
def update_expense(
    expense_id: int,
    expense_data: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_validation)
):
    try:
        expense = db.query(Expense).filter(Expense.id == expense_id).first()
        if not expense:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense not found"
            )

        update_data = expense_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(expense, field, value)

        db.commit()
        db.refresh(expense)
        return expense

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update expense"
        )


@router.delete('/delete/{expense_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_validation)
):
    try:
        expense = db.query(Expense).filter(Expense.id == expense_id).first()
        if not expense:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense not found"
            )
        db.delete(expense)
        db.commit()

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete expense"
        )




@router.get('/tracker/summary', response_model=ExpenseTrackerResponse, status_code=status.HTTP_200_OK)
def expense_tracker(
    month: Optional[int] = Query(default=None, description="Month number (1-12)"),
    year: Optional[int] = Query(default=None, description="Year e.g. 2025"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_validation)
):
   
    now = datetime.now()
    target_month = month or now.month
    target_year = year or now.year

    if not (1 <= target_month <= 12):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Month must be between 1 and 12"
        )

    period_label = datetime(target_year, target_month, 1).strftime("%B %Y")

   
    expenses = db.query(Expense).filter(
        extract('month', Expense.expense_date) == target_month,
        extract('year', Expense.expense_date) == target_year
    ).all()

    total_expenses = sum(e.amount for e in expenses) or Decimal('0.00')

   
    category_totals = {}
    for e in expenses:
        cat = str(e.category)
        category_totals[cat] = category_totals.get(cat, Decimal('0.00')) + e.amount

    breakdown = []
    for cat, total in category_totals.items():
        pct = float((total / total_expenses) * 100) if total_expenses > 0 else 0.0
        breakdown.append(ExpenseCategoryBreakdown(
            category=cat,
            total=total,
            percentage=round(pct, 2)
        ))

   
    revenue_result = db.query(func.sum(Sales.total_amount)).filter(
        extract('month', Sales.created_at) == target_month,
        extract('year', Sales.created_at) == target_year
    ).scalar()

    total_revenue = Decimal(str(revenue_result)) if revenue_result else Decimal('0.00')

    
    gross_profit = total_revenue - total_expenses
    profit_margin_pct = (
        float((gross_profit / total_revenue) * 100) if total_revenue > 0 else 0.0
    )

    summary = ExpenseSummary(
        period_label=period_label,
        total_expenses=total_expenses,
        total_revenue=total_revenue,
        gross_profit=gross_profit,
        profit_margin_pct=round(profit_margin_pct, 2),
        breakdown=breakdown
    )

  
    profit = float(gross_profit)

    if profit < 0:
        advice = InvestmentAdvice(
            profit=gross_profit,
            tier="LOW",
            advice="Your expenses exceed revenue this period. Focus on cost control.",
            suggested_actions=[
                "Review GOODS_PURCHASE expenses — negotiate supplier pricing",
                "Audit OPERATING_EXPENSE for avoidable costs",
                "Defer non-essential spending until revenue improves",
            ]
        )
    elif profit < 50_000:
        advice = InvestmentAdvice(
            profit=gross_profit,
            tier="LOW",
            advice="Profit is low this period. Prioritize stability before reinvestment.",
            suggested_actions=[
                "Ensure restock levels are maintained for fast-moving products",
                "Hold at least 3 months of operating expenses as a cash reserve",
                "Avoid large capital expenditures at this stage",
            ]
        )
    elif profit < 200_000:
        advice = InvestmentAdvice(
            profit=gross_profit,
            tier="MODERATE",
            advice="Moderate profit. You can begin small reinvestments while building reserves.",
            suggested_actions=[
                "Reinvest 30% into expanding top-selling product stock",
                "Set aside 20% as emergency/operational reserve",
                "Consider bulk purchasing from suppliers for better margins",
                "Track which product categories drive the most sales",
            ]
        )
    elif profit < 500_000:
        advice = InvestmentAdvice(
            profit=gross_profit,
            tier="GOOD",
            advice="Good profit margin. Reinvestment and growth strategies are viable.",
            suggested_actions=[
                "Reinvest 40% into high-margin product lines",
                "Explore adding new product categories (cosmetics, supplements)",
                "Consider staff expansion or delivery logistics",
                "Invest 10% in marketing or loyalty programs",
                "Maintain 6-month operating reserve",
            ]
        )
    else:
        advice = InvestmentAdvice(
            profit=gross_profit,
            tier="HIGH",
            advice="Excellent profit! You are in a strong position for significant growth.",
            suggested_actions=[
                "Diversify: open a second outlet or online sales channel",
                "Invest in inventory management software or POS upgrade",
                "Negotiate exclusive supplier agreements for better pricing",
                "Allocate 15% to staff training and retention",
                "Consider short-term fixed deposits for idle cash",
            ]
        )

    return ExpenseTrackerResponse(summary=summary, investment_advice=advice)