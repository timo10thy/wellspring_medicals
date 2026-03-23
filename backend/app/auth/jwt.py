import os
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Optional, Dict

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRATION_MINUTES = int(os.getenv("JWT_EXPIRATION_KEY", 720))


def create_access_token(
    claims: Dict,
    expires_delta: Optional[timedelta] = None
) -> str:
    if "sub" not in claims:
        raise ValueError("JWT must include 'sub'")

    to_encode = claims.copy()

    expire = (
        datetime.utcnow() + expires_delta
        if expires_delta
        else datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRATION_MINUTES)
    )

    to_encode.update({"exp": expire})

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_access_token(token: str) -> Dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise
