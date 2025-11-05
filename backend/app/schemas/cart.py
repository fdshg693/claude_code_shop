from pydantic import BaseModel
from datetime import datetime
from typing import List


# Schema for cart item
class CartItem(BaseModel):
    product_id: int
    quantity: int
    added_at: datetime


# Schema for cart
class Cart(BaseModel):
    user_id: int
    items: List[CartItem] = []
    expires_at: datetime


# Schema for adding item to cart
class CartItemAdd(BaseModel):
    product_id: int
    quantity: int = 1


# Schema for updating cart item
class CartItemUpdate(BaseModel):
    quantity: int
