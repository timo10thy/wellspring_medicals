from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
import bcrypt
import logging

from slowapi import Limiter
from slowapi.util import get_remote_address
from app.routes.basemodel import get_db
from app.models.users import User
from app.schema.auth import LoginRequest, LoginResponse
from app.auth.jwt import create_access_token
from app.middlewares.auth import AuthMiddleware

logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", status_code=status.HTTP_200_OK, response_model=LoginResponse)
@limiter.limit("5/minute")
def login(request: Request, login_request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_request.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not bcrypt.checkpw(
        login_request.password.encode("utf-8"),
        user.password.encode("utf-8")
    ):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account pending approval. Contact your administrator.")

    claims = {
        "sub":  str(user.id),
        "role": user.role
    }
    access_token = create_access_token(claims)
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        email=user.email,
        user_id=user.id
    )


@router.get("/me")
def get_me(current_user: User = Depends(AuthMiddleware)):
    return {
        "id":    current_user.id,
        "name":  current_user.name,
        "email": current_user.email,
        "role":  current_user.role
    }