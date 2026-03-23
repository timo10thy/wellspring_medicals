from fastapi import APIRouter, Depends, status,HTTPException
from sqlalchemy.orm import Session
from app.routes.basemodel import get_db
from app.models.users import User
from typing import Annotated
from app.middlewares.admin import admin_validation
from app.schema.user_schema import UserCreate,UserResponse
import logging
import bcrypt

router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)

@router.get("/me", status_code=status.HTTP_200_OK)
def admin_me(current_admin: User = Depends(admin_validation)):
    return {
        "id": current_admin.id,
        "name": current_admin.name,
        "email": current_admin.email,
        "role": current_admin.role
    }

@router.post('/create',response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_admin(user_data: UserCreate,db:Session=Depends(get_db)):
    try:
        existing_admin = db.query(User).filter(User.email == user_data.email).first()
        if existing_admin:
            raise HTTPException(status_code=400, detail='Admin exist')
        password_bytes = user_data.password.encode('utf-8')
        salt = bcrypt.gensalt()
        hashed_bytes = bcrypt.hashpw(password_bytes, salt)
        hashed_password = hashed_bytes.decode('utf-8')

       
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
        

   