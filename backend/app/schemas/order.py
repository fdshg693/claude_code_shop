from pydantic import BaseModel, ConfigDict
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from app.models.order import OrderStatus


# Base schema
class OrderItemBase(BaseModel):
    product_id: int
    quantity: int
    unit_price: Decimal
    subtotal: Decimal


# Schema for order item in DB
class OrderItem(OrderItemBase):
    id: int
    order_id: int

    model_config = ConfigDict(from_attributes=True)


# Schema for order item creation
class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int


# Base schema for order
class OrderBase(BaseModel):
    shipping_address: str


# Schema for order creation
class OrderCreate(OrderBase):
    items: List[OrderItemCreate]


# Schema for order update
class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    shipping_address: Optional[str] = None


# Schema for order in DB
class Order(OrderBase):
    id: int
    user_id: int
    total_amount: Decimal
    status: OrderStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    order_items: List[OrderItem] = []

    model_config = ConfigDict(from_attributes=True)


# Schema for order list (simplified)
class OrderList(BaseModel):
    id: int
    total_amount: Decimal
    status: OrderStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
