# NovaByte Tech Store

Proyecto full stack para examen de DevOps: tienda tecnológica con catálogo, filtros, carrito, pedidos, administración de inventario, PostgreSQL, pruebas, contenedores y despliegue automático en una VPS con Docker Swarm + Traefik.

## Funcionalidades

- Catálogo de celulares, laptops, computadoras y accesorios.
- Búsqueda por nombre, marca o descripción.
- Filtro por categoría y productos destacados.
- Carrito persistente en el navegador.
- Registro de pedidos con validación y descuento de stock.
- Panel administrativo para crear, editar y eliminar productos.
- Consulta de pedidos y cambio de estado.
- API documentada con Swagger.
- Health check de aplicación y base de datos.
- Datos iniciales automáticos para presentar la aplicación desde el primer arranque.

## Arquitectura

```text
Navegador
   │ HTTPS
   ▼
Traefik (VPS)
   ├── /api/*  ──► FastAPI ──► PostgreSQL
   └── /*      ──► Nginx + React
```

## Tecnologías

- Frontend: React + Vite + Nginx
- Backend: FastAPI + SQLAlchemy
- Base de datos: PostgreSQL
- DevOps: Docker, Docker Compose, Docker Swarm, Traefik, GitHub Actions y GHCR

## Ejecución local con Docker

1. Copia las variables:

```bash
cp .env.example .env
```

2. Cambia por lo menos `POSTGRES_PASSWORD` y `ADMIN_API_KEY`.

3. Levanta el proyecto:

```bash
docker compose up --build -d
```

4. Abre:

- Web: `http://localhost:8080`
- API: `http://localhost:8000/api`
- Swagger: `http://localhost:8000/api/docs`
- Health check: `http://localhost:8000/api/health`

Para apagarlo:

```bash
docker compose down
```

Para borrar también los datos:

```bash
docker compose down -v
```

## Uso del panel administrativo

En la web pulsa **Administrar** y escribe la misma clave definida en `ADMIN_API_KEY`. Esa clave se envía en el encabezado `X-Admin-Key` y protege las operaciones de administración.

## Pruebas sin Docker

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
DATABASE_URL=sqlite:///./test.db ADMIN_API_KEY=test-key pytest
```

Frontend:

```bash
cd frontend
npm install
npm run build
```

## Preparación del VPS

Modo actual (sin dominio todavía, servidor compartido): `deploy.sh` usa `docker compose` con
las imágenes ya publicadas en GHCR (`docker-compose.prod.yml`), expuestas directamente en
`FRONTEND_PORT`/`BACKEND_PORT`. No requiere Docker Swarm ni Traefik, así que no interfiere con
otros proyectos que corran en el mismo VPS.

El servidor solo necesita:

- Docker y Docker Compose instalados.

Clona el repositorio:

```bash
sudo mkdir -p /opt/novabyte
sudo chown -R $USER:$USER /opt/novabyte
git clone TU_URL_DEL_REPOSITORIO /opt/novabyte
cd /opt/novabyte
cp .env.example .env
nano .env
chmod +x deploy.sh
./deploy.sh
```

Cuando el ingeniero asigne el dominio, se puede migrar al modo con Docker Swarm + Traefik +
HTTPS automático usando `deploy-swarm.sh` y `stack.yml` (requiere `docker swarm init`, Traefik
desplegado y una red overlay externa `traefik-public`; ver comentarios en esos archivos).

## Variables para producción

```env
POSTGRES_DB=novabyte
POSTGRES_USER=novabyte
POSTGRES_PASSWORD=una-clave-larga
ADMIN_API_KEY=otra-clave-larga
GHCR_OWNER=tu_usuario_github
IMAGE_TAG=latest
FRONTEND_PORT=8081
BACKEND_PORT=8000
```

## Secrets de GitHub Actions

Configura en **Settings > Secrets and variables > Actions**:

- `VPS_HOST`: IP de Hetzner.
- `VPS_USER`: usuario SSH.
- `VPS_PASSWORD`: contraseña SSH.
- `VPS_PORT`: normalmente `22`.
- `GHCR_TOKEN`: token de GitHub con permiso `read:packages` para que el VPS descargue imágenes privadas. Si las imágenes son públicas, puede omitirse en el servidor, pero el workflow está preparado para usarlo.

El pipeline prueba backend y frontend, construye dos imágenes, las publica en GHCR y actualiza el stack en la VPS cuando haces push a `main`.

## Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Estado de API y PostgreSQL |
| GET | `/api/categories` | Lista de categorías |
| GET | `/api/products` | Lista y filtra productos |
| GET | `/api/products/{id}` | Detalle de producto |
| POST | `/api/orders` | Crea un pedido y descuenta stock |
| GET | `/api/admin/orders` | Lista pedidos, requiere clave admin |
| POST | `/api/admin/products` | Crea producto, requiere clave admin |
| PUT | `/api/admin/products/{id}` | Edita producto, requiere clave admin |
| DELETE | `/api/admin/products/{id}` | Desactiva producto, requiere clave admin |

## Guion breve para defender el examen

1. Mostrar que la web consume una API real y no datos escritos directamente en React.
2. Crear un pedido y comprobar que el stock disminuye.
3. Entrar al panel administrativo y crear o editar un producto.
4. Abrir `/api/docs` para demostrar los endpoints.
5. Abrir `/api/health` para verificar la conexión con PostgreSQL.
6. Enseñar el workflow de GitHub Actions y las imágenes en GHCR.
7. Hacer un pequeño cambio, push a `main` y observar el despliegue automático.

> Antes de presentar, reemplaza el dominio, las claves, el propietario de GHCR y el enlace del repositorio.
