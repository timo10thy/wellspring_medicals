from pydantic import BaseModel,constr,EmailStr, validator
from datetime import datetime
from typing import Optional


class UserCreate(BaseModel):
    name:constr(min_length=3, max_length=20, strip_whitespace=True)
    email:EmailStr
    password:str
    user_name:constr(min_length=3, max_length=20, strip_whitespace=True)

    @validator("password")
    def validate_password(cls, v: str):
        if not v.strip():
            raise ValueError("Password cannot be empty or whitespace")
        if not any(c.isalpha() for c in v):
            raise ValueError("Password must contain at least one letter")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if len(v) < 8 or len(v) > 20:
            raise ValueError("Password must be between 8 and 20 characters")
        return v

class UserResponse(BaseModel):
    name:str
    email:str
    user_name:str
    role:str
    image:Optional[str]
    created_at:datetime
    updated_at:datetime
