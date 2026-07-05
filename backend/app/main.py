from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, SessionLocal, engine, wait_for_database
from .routers import admin, public
from .seed import seed_database


@asynccontextmanager
async def lifespan(_: FastAPI):
    wait_for_database()
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_database(db)
    yield


app = FastAPI(
    title="NovaByte Tech Store API",
    version="1.0.0",
    description="API de catálogo, inventario y pedidos para una tienda tecnológica.",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=settings.cors_origin_list != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(public.router, prefix="/api", tags=["Catálogo y pedidos"])
app.include_router(admin.router, prefix="/api/admin", tags=["Administración"])
