from fastapi import Depends, HTTPException, status
from app.middlewares.auth import AuthMiddleware
from app.models.users import User

def admin_validation(current_user: User=Depends(AuthMiddleware)):
    if  current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail= "Admin only can access this site"
        )
    return current_user
