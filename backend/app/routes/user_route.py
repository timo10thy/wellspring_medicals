from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from app.routes.basemodel import get_db
from typing import Annotated
from app.models.users import User
from app.schema.user_schema import UserCreate, UserResponse
import logging
import bcrypt

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/user', tags= ['User'])
db_dependency= Annotated[Session, Depends(get_db)]


@router.post('/user/create', response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    try:
        
        existing_email = db.query(User).filter(User.email == user_data.email).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Email exists, try another email")
        
       
        existing_name = db.query(User).filter(User.user_name == user_data.user_name).first()
        if existing_name:
            raise HTTPException(status_code=400, detail="Username exists, try another username")
        
       
        hashed_password = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
       
        new_user = User(
            name=user_data.name,
            email=user_data.email,
            user_name=user_data.user_name,
            password=hashed_password,
            role="USER"
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        return new_user

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to create user")
