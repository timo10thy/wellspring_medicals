from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.models.users import User
from app.routes.user_route import router as user_route
from app.routes.auth import router as auth
from app.routes.admin import router as admin
from app.routes.product import router as products
from app.routes.stock import router as stock
from app.routes.sales import router as sale
from app.routes.expenses import router as expenses
from app.routes.purchase_receipt import router as purchase_receipts
from app.routes.dashboard import router as dashboard
from app.routes.reports import router as reports
from app.routes.reconciliation import router as reconciliation   # ← new
from app.routes.basemodel import engine
from app.models.base import Base

# Import new model so create_all picks it up
from app.models import reconciliation as _recon_model  # noqa

import logging

logger = logging.getLogger(__name__)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Well Spring App",
    version="1",
    description="Daily transaction"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3001",
        "http://localhost:3000",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "https://wellspring-medicals.onrender.com",
        "https://wellspring-frontend-ppyo.onrender.com",
        "https://wellspring-medicals.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/home")
def homepage():
    return {"message": "Your daily transaction and record as he dey hot"}

app.include_router(user_route)
app.include_router(auth)
app.include_router(admin)
app.include_router(products)
app.include_router(stock)
app.include_router(sale)
app.include_router(expenses)
app.include_router(purchase_receipts)
app.include_router(dashboard)
app.include_router(reports)
app.include_router(reconciliation)   