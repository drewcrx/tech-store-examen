from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import (
    DashboardStatsOut,
    MessageOut,
    OrderOut,
    OrderStatusUpdate,
    ProductCreate,
    ProductOut,
    ProductUpdate,
)
from ..security import require_admin
from ..services import (
    create_product,
    deactivate_product,
    get_dashboard_stats,
    list_orders,
    list_products,
    update_order_status,
    update_product,
)

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("/stats", response_model=DashboardStatsOut)
def stats(db: Session = Depends(get_db)):
    return get_dashboard_stats(db)


@router.get("/products", response_model=list[ProductOut])
def admin_products(db: Session = Depends(get_db)):
    return list_products(db, include_inactive=True)


@router.post("/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def add_product(payload: ProductCreate, db: Session = Depends(get_db)):
    return create_product(db, payload)


@router.put("/products/{product_id}", response_model=ProductOut)
def edit_product(product_id: int, payload: ProductUpdate, db: Session = Depends(get_db)):
    return update_product(db, product_id, payload)


@router.delete("/products/{product_id}", response_model=MessageOut)
def remove_product(product_id: int, db: Session = Depends(get_db)):
    product = deactivate_product(db, product_id)
    return MessageOut(message=f"{product.name} fue desactivado")


@router.get("/orders", response_model=list[OrderOut])
def orders(db: Session = Depends(get_db)):
    return list_orders(db)


@router.patch("/orders/{order_id}/status", response_model=OrderOut)
def change_order_status(order_id: int, payload: OrderStatusUpdate, db: Session = Depends(get_db)):
    return update_order_status(db, order_id, payload.status)
