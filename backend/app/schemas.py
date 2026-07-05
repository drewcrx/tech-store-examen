from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    description: str | None = None


class ProductBase(BaseModel):
    name: str = Field(min_length=2, max_length=140)
    brand: str = Field(min_length=2, max_length=80)
    description: str = Field(min_length=10, max_length=1500)
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    stock: int = Field(ge=0, le=100000)
    image_url: str = Field(default="/images/product-placeholder.svg", max_length=500)
    featured: bool = False
    active: bool = True
    category_id: int


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=140)
    brand: str | None = Field(default=None, min_length=2, max_length=80)
    description: str | None = Field(default=None, min_length=10, max_length=1500)
    price: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    stock: int | None = Field(default=None, ge=0, le=100000)
    image_url: str | None = Field(default=None, max_length=500)
    featured: bool | None = None
    active: bool | None = None
    category_id: int | None = None


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category: CategoryOut
    created_at: datetime
    updated_at: datetime


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(ge=1, le=20)


class OrderCreate(BaseModel):
    customer_name: str = Field(min_length=3, max_length=120)
    customer_email: EmailStr
    customer_phone: str | None = Field(default=None, max_length=30)
    delivery_address: str | None = Field(default=None, max_length=240)
    items: list[OrderItemCreate] = Field(min_length=1, max_length=30)


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    quantity: int
    unit_price: Decimal
    subtotal: Decimal


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_name: str
    customer_email: EmailStr
    customer_phone: str | None
    delivery_address: str | None
    status: str
    total: Decimal
    created_at: datetime
    items: list[OrderItemOut]


class OrderStatusUpdate(BaseModel):
    status: str = Field(pattern="^(pendiente|confirmado|enviado|entregado|cancelado)$")


class MessageOut(BaseModel):
    message: str


class DashboardStatsOut(BaseModel):
    active_products: int
    categories: int
    pending_orders: int
    low_stock_products: int
