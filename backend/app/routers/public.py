from fastapi import APIRouter, Depends, Query
from sqlalchemy import text, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Category
from ..schemas import CategoryOut, MessageOut, OrderCreate, OrderOut, ProductOut
from ..services import create_order, get_product_or_404, list_products

router = APIRouter()


@router.get("", response_model=MessageOut)
def api_root() -> MessageOut:
    return MessageOut(message="NovaByte API funcionando")


@router.get("/health")
def health(db: Session = Depends(get_db)) -> dict[str, str]:
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected", "service": "novabyte-api"}


@router.get("/categories", response_model=list[CategoryOut])
def categories(db: Session = Depends(get_db)) -> list[Category]:
    return list(db.scalars(select(Category).order_by(Category.name)).all())


@router.get("/products", response_model=list[ProductOut])
def products(
    search: str | None = Query(default=None, max_length=100),
    category: str | None = Query(default=None, max_length=80),
    featured: bool | None = None,
    db: Session = Depends(get_db),
):
    return list_products(db, search=search, category_slug=category, featured=featured)


@router.get("/products/{product_id}", response_model=ProductOut)
def product_detail(product_id: int, db: Session = Depends(get_db)):
    return get_product_or_404(db, product_id)


@router.post("/orders", response_model=OrderOut, status_code=201)
def place_order(payload: OrderCreate, db: Session = Depends(get_db)):
    return create_order(db, payload)
