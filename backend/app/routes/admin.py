from fastapi import APIRouter, Depends, status, HTTPException, Query
from sqlalchemy.orm import Session
from app.routes.basemodel import get_db
from app.models.users import User
from app.middlewares.admin import admin_validation
from app.schema.user_schema import UserCreate, UserResponse
import logging
import bcrypt
import os

logger = logging.getLogger(__name__)

ADMIN_SETUP_TOKEN = os.getenv("ADMIN_SETUP_TOKEN", "change-this-secret")

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/me", status_code=status.HTTP_200_OK)
def admin_me(current_admin: User = Depends(admin_validation)):
    return {
        "id":    current_admin.id,
        "name":  current_admin.name,
        "email": current_admin.email,
        "role":  current_admin.role
    }


@router.post('/create', response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_admin(
    user_data: UserCreate,
    setup_token: str = Query(..., description="Admin setup token"),
    db: Session = Depends(get_db)
):
    try:
        # Verify secret token
        if setup_token != ADMIN_SETUP_TOKEN:
            raise HTTPException(status_code=403, detail="Invalid setup token")

        # Check if admin already exists
        existing_admin_count = db.query(User).filter(User.role == "ADMIN").count()
        if existing_admin_count > 0:
            raise HTTPException(
                status_code=403,
                detail="Admin account already exists. Contact your system administrator."
            )

        # Check email
        if db.query(User).filter(User.email == user_data.email).first():
            raise HTTPException(status_code=400, detail="Email already exists")

        # Check username
        if db.query(User).filter(User.user_name == user_data.user_name).first():
            raise HTTPException(status_code=400, detail="Username already exists")

        hashed_password = bcrypt.hashpw(
            user_data.password.encode('utf-8'), bcrypt.gensalt()
        ).decode('utf-8')

        new_admin = User(
            name=user_data.name,
            email=user_data.email,
            user_name=user_data.user_name,
            password=hashed_password,
            role="ADMIN"
        )
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        return new_admin

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to create Admin")