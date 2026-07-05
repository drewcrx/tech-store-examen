from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import Category, Product


CATEGORIES = [
    ("Celulares", "celulares", "Smartphones para trabajo, estudio y entretenimiento."),
    ("Laptops", "laptops", "Equipos portátiles para productividad y alto rendimiento."),
    ("Computadoras", "computadoras", "Computadoras de escritorio y equipos compactos."),
    ("Accesorios", "accesorios", "Periféricos y complementos para tu espacio tecnológico."),
]

PRODUCTS = [
    {
        "name": "Nova X12 Pro 5G",
        "brand": "NovaMobile",
        "description": "Smartphone 5G con pantalla AMOLED de 6.7 pulgadas, 256 GB y cámara principal de 108 MP.",
        "price": Decimal("699.00"),
        "stock": 12,
        "image_url": "/images/nova-x12.svg",
        "featured": True,
        "category_slug": "celulares",
    },
    {
        "name": "PixelOne Lite",
        "brand": "PixelOne",
        "description": "Celular equilibrado con 128 GB, batería de larga duración y fotografía computacional.",
        "price": Decimal("389.90"),
        "stock": 20,
        "image_url": "/images/pixelone-lite.svg",
        "featured": False,
        "category_slug": "celulares",
    },
    {
        "name": "AeroBook 14",
        "brand": "Aero",
        "description": "Laptop ultraligera de 14 pulgadas, 16 GB de RAM y SSD NVMe de 512 GB.",
        "price": Decimal("899.00"),
        "stock": 8,
        "image_url": "/images/aerobook-14.svg",
        "featured": True,
        "category_slug": "laptops",
    },
    {
        "name": "Titan G15",
        "brand": "TitanCore",
        "description": "Laptop gaming con pantalla de 144 Hz, 32 GB de RAM y gráficos dedicados.",
        "price": Decimal("1499.00"),
        "stock": 5,
        "image_url": "/images/titan-g15.svg",
        "featured": True,
        "category_slug": "laptops",
    },
    {
        "name": "CoreStation S5",
        "brand": "CoreStation",
        "description": "Computadora de escritorio para oficina y desarrollo con 16 GB de RAM y SSD de 1 TB.",
        "price": Decimal("779.50"),
        "stock": 7,
        "image_url": "/images/corestation-s5.svg",
        "featured": False,
        "category_slug": "computadoras",
    },
    {
        "name": "MiniBox Studio",
        "brand": "MiniBox",
        "description": "Mini PC silenciosa y compacta, ideal para programación, multimedia y trabajo remoto.",
        "price": Decimal("649.00"),
        "stock": 10,
        "image_url": "/images/minibox-studio.svg",
        "featured": True,
        "category_slug": "computadoras",
    },
    {
        "name": "PulseKeys Mechanical",
        "brand": "Pulse",
        "description": "Teclado mecánico compacto con iluminación regulable y conexión USB-C.",
        "price": Decimal("79.90"),
        "stock": 25,
        "image_url": "/images/pulsekeys.svg",
        "featured": False,
        "category_slug": "accesorios",
    },
    {
        "name": "AirSound Pro",
        "brand": "AirSound",
        "description": "Audífonos inalámbricos con cancelación de ruido, micrófono y estuche de carga.",
        "price": Decimal("119.00"),
        "stock": 18,
        "image_url": "/images/airsound-pro.svg",
        "featured": True,
        "category_slug": "accesorios",
    },
]


def seed_database(db: Session) -> None:
    category_count = db.scalar(select(func.count(Category.id))) or 0
    if category_count:
        return

    categories = [Category(name=name, slug=slug, description=description) for name, slug, description in CATEGORIES]
    db.add_all(categories)
    db.flush()
    category_by_slug = {category.slug: category for category in categories}

    for product_data in PRODUCTS:
        data = product_data.copy()
        category_slug = data.pop("category_slug")
        db.add(Product(**data, category_id=category_by_slug[category_slug].id))

    db.commit()
