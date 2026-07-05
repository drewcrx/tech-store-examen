from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    products: Mapped[list["Product"]] = relationship(back_populates="category")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(140), index=True)
    brand: Mapped[str] = mapped_column(String(80), index=True)
    description: Mapped[str] = mapped_column(Text)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    stock: Mapped[int] = mapped_column(Integer, default=0)
    image_url: Mapped[str] = mapped_column(String(500), default="/images/product-placeholder.svg")
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    category: Mapped[Category] = relationship(back_populates="products")
    order_items: Mapped[list["OrderItem"]] = relationship(back_populates="product")


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_name: Mapped[str] = mapped_column(String(120))
    customer_email: Mapped[str] = mapped_column(String(160), index=True)
    customer_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    delivery_address: Mapped[str | None] = mapped_column(String(240), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="pendiente", index=True)
    total: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", lazy="selectin"
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    quantity: Mapped[int] = mapped_column(Integer)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    order: Mapped[Order] = relationship(back_populates="items")
    product: Mapped[Product] = relationship(back_populates="order_items")
