from fastapi import Depends, Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime

from app.routes.basemodel import get_db
from app.auth.jwt import verify_access_token
from app.models.users import User


security = HTTPBearer()


def raise_http_exception(message, status_code=status.HTTP_403_FORBIDDEN):
    raise HTTPException(
        status_code=status_code,
        detail={
            "message": message,
            "timestamp": datetime.utcnow().isoformat()
        }
    )


class JWTBearer(HTTPBearer):
    def __init__(self, auto_error: bool = True):
        super().__init__(auto_error=auto_error)

    async def __call__(
        self,
        request: Request,
        db: Session = Depends(get_db)
    ):
        credentials: HTTPAuthorizationCredentials = await super().__call__(request)

        if not credentials or credentials.scheme != "Bearer":
            raise_http_exception("Invalid authentication scheme")

        return self.verify_jwt(credentials.credentials, db)

    def verify_jwt(self, token: str, db: Session):
        try:
            payload = verify_access_token(token)

            user_id = payload.get("sub")
            if not user_id:
                raise_http_exception("Invalid token payload")

            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise_http_exception("User does not exist")

            return user

        except Exception:
            raise_http_exception("Token verification failed")


AuthMiddleware = JWTBearer()
