from pydantic import BaseModel, EmailStr, validator, Field
import re


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(...)

    @validator('password')
    def validate_password(cls, value):
       
        if not (8 <= len(value) <= 20):
            raise ValueError('Password must be between 8 and 15 characters long')

        
        if not re.search(r"[A-Za-z]", value):
            raise ValueError('Password must contain at least one letter')

        
        if not re.search(r"[0-9]", value):
            raise ValueError('Password must contain at least one digit')

        return value


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    email: str
    user_id: int
