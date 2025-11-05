from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime
from typing import Optional
from app.models.user import UserRole


# Base schema
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: UserRole = UserRole.CUSTOMER


# Schema for user creation
class UserCreate(UserBase):
    password: str


# Schema for user update
class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    role: Optional[UserRole] = None
    password: Optional[str] = None


# Schema for user in DB
class User(UserBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# Schema for login
class UserLogin(BaseModel):
    email: EmailStr
    password: str


# Schema for token response
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None
