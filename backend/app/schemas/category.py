from pydantic import BaseModel, ConfigDict
from typing import Optional


# Base schema
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    parent_id: Optional[int] = None


# Schema for category creation
class CategoryCreate(CategoryBase):
    pass


# Schema for category update
class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[int] = None


# Schema for category in DB
class Category(CategoryBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
