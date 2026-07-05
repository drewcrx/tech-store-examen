from fastapi.testclient import TestClient

from app.main import app


def test_health_endpoint():
    with TestClient(app) as client:
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json()["database"] == "connected"


def test_catalog_and_order_flow():
    with TestClient(app) as client:
        products_response = client.get("/api/products")
        assert products_response.status_code == 200
        products = products_response.json()
        assert len(products) >= 4

        product = next(item for item in products if item["stock"] > 0)
        initial_stock = product["stock"]

        order_response = client.post(
            "/api/orders",
            json={
                "customer_name": "Cliente de Prueba",
                "customer_email": "cliente@example.com",
                "customer_phone": "0999999999",
                "delivery_address": "Quito",
                "items": [{"product_id": product["id"], "quantity": 1}],
            },
        )
        assert order_response.status_code == 201
        assert float(order_response.json()["total"]) > 0

        updated_product = client.get(f"/api/products/{product['id']}").json()
        assert updated_product["stock"] == initial_stock - 1


def test_admin_is_protected():
    with TestClient(app) as client:
        denied = client.get("/api/admin/products")
        assert denied.status_code == 401

        allowed = client.get("/api/admin/products", headers={"X-Admin-Key": "test-key"})
        assert allowed.status_code == 200
