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
        if setup_token != ADMIN_SETUP_TOKEN:
            raise HTTPException(status_code=403, detail="Invalid setup token")

        existing_admin_count = db.query(User).filter(User.role == "ADMIN").count()
        if existing_admin_count > 0:
            raise HTTPException(status_code=403, detail="Admin account already exists.")

        if db.query(User).filter(User.email == user_data.email).first():
            raise HTTPException(status_code=400, detail="Email already exists")

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
            role="ADMIN",
            is_active=True,  # admin is always active
        )
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        return new_admin

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to create Admin")


# Admin: get all users
@router.get("/users")
def get_all_users(
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_validation),
):
    users = db.query(User).filter(User.role != 'ADMIN').order_by(User.created_at.desc()).all()
    return [
        {
            "id":        u.id,
            "name":      u.name,
            "user_name": u.user_name,
            "email":     u.email,
            "role":      str(u.role),
            "is_active": u.is_active,
            "created_at": str(u.created_at),
        }
        for u in users
    ]


# Admin: activate user
@router.patch("/users/{user_id}/activate")
def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_validation),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = True
    db.commit()
    return {"message": f"{user.user_name} activated"}


# Admin: deactivate user
@router.patch("/users/{user_id}/deactivate")
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(admin_validation),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()
    return {"message": f"{user.user_name} deactivated"}