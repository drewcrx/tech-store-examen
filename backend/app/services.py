from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from .models import Category, Order, OrderItem, Product
from .schemas import OrderCreate, ProductCreate, ProductUpdate


def list_products(
    db: Session,
    search: str | None = None,
    category_slug: str | None = None,
    featured: bool | None = None,
    include_inactive: bool = False,
) -> list[Product]:
    statement = select(Product).options(selectinload(Product.category)).order_by(Product.featured.desc(), Product.id.desc())

    if not include_inactive:
        statement = statement.where(Product.active.is_(True))
    if search:
        term = f"%{search.strip()}%"
        statement = statement.where(
            or_(Product.name.ilike(term), Product.brand.ilike(term), Product.description.ilike(term))
        )
    if category_slug:
        statement = statement.join(Product.category).where(Category.slug == category_slug)
    if featured is not None:
        statement = statement.where(Product.featured.is_(featured))

    return list(db.scalars(statement).unique().all())


def get_product_or_404(db: Session, product_id: int, include_inactive: bool = False) -> Product:
    statement = select(Product).options(selectinload(Product.category)).where(Product.id == product_id)
    if not include_inactive:
        statement = statement.where(Product.active.is_(True))
    product = db.scalar(statement)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")
    return product


def ensure_category(db: Session, category_id: int) -> None:
    if not db.get(Category, category_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La categoría no existe")


def create_product(db: Session, payload: ProductCreate) -> Product:
    ensure_category(db, payload.category_id)
    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return get_product_or_404(db, product.id, include_inactive=True)


def update_product(db: Session, product_id: int, payload: ProductUpdate) -> Product:
    product = get_product_or_404(db, product_id, include_inactive=True)
    changes = payload.model_dump(exclude_unset=True)
    if "category_id" in changes:
        ensure_category(db, changes["category_id"])
    for field, value in changes.items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return get_product_or_404(db, product.id, include_inactive=True)


def deactivate_product(db: Session, product_id: int) -> Product:
    product = get_product_or_404(db, product_id, include_inactive=True)
    product.active = False
    db.commit()
    db.refresh(product)
    return product


def create_order(db: Session, payload: OrderCreate) -> Order:
    aggregated: dict[int, int] = {}
    for item in payload.items:
        aggregated[item.product_id] = aggregated.get(item.product_id, 0) + item.quantity

    statement = (
        select(Product)
        .where(Product.id.in_(aggregated.keys()), Product.active.is_(True))
        .with_for_update()
    )
    products = {product.id: product for product in db.scalars(statement).all()}

    if len(products) != len(aggregated):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uno o más productos no están disponibles")

    for product_id, quantity in aggregated.items():
        product = products[product_id]
        if product.stock < quantity:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Stock insuficiente para {product.name}. Disponible: {product.stock}",
            )

    order = Order(
        customer_name=payload.customer_name,
        customer_email=str(payload.customer_email),
        customer_phone=payload.customer_phone,
        delivery_address=payload.delivery_address,
    )
    db.add(order)
    db.flush()

    total = Decimal("0.00")
    for product_id, quantity in aggregated.items():
        product = products[product_id]
        subtotal = product.price * quantity
        total += subtotal
        product.stock -= quantity
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=product.id,
                quantity=quantity,
                unit_price=product.price,
                subtotal=subtotal,
            )
        )

    order.total = total
    db.commit()

    return db.scalar(select(Order).options(selectinload(Order.items)).where(Order.id == order.id))


def list_orders(db: Session) -> list[Order]:
    statement = select(Order).options(selectinload(Order.items)).order_by(Order.created_at.desc())
    return list(db.scalars(statement).unique().all())


def update_order_status(db: Session, order_id: int, new_status: str) -> Order:
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido no encontrado")
    order.status = new_status
    db.commit()
    return db.scalar(select(Order).options(selectinload(Order.items)).where(Order.id == order.id))


def get_dashboard_stats(db: Session) -> dict[str, int]:
    return {
        "active_products": db.scalar(select(func.count(Product.id)).where(Product.active.is_(True))) or 0,
        "categories": db.scalar(select(func.count(Category.id))) or 0,
        "pending_orders": db.scalar(select(func.count(Order.id)).where(Order.status == "pendiente")) or 0,
        "low_stock_products": db.scalar(
            select(func.count(Product.id)).where(Product.active.is_(True), Product.stock <= 5)
        )
        or 0,
    }
