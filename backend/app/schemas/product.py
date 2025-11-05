from pydantic import BaseModel, ConfigDict
from datetime import datetime
from decimal import Decimal
from typing import Optional


# Base schema
class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: Decimal
    stock_quantity: int = 0
    category_id: int
    image_url: Optional[str] = None
    is_active: bool = True


# Schema for product creation
class ProductCreate(ProductBase):
    pass


# Schema for product update
class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    stock_quantity: Optional[int] = None
    category_id: Optional[int] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None


# Schema for product in DB
class Product(ProductBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# Schema for product list (simplified)
class ProductList(BaseModel):
    id: int
    name: str
    price: Decimal
    image_url: Optional[str] = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
