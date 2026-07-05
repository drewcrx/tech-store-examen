import { useEffect, useMemo, useState } from 'react'
import { api } from './api'

const money = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' })

const emptyProduct = {
  name: '',
  brand: '',
  description: '',
  price: '',
  stock: 0,
  image_url: '/images/product-placeholder.svg',
  featured: false,
  active: true,
  category_id: '',
}

function useCart() {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('novabyte-cart') || '[]')
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem('novabyte-cart', JSON.stringify(items))
  }, [items])

  const add = (product) => {
    setItems((current) => {
      const found = current.find((item) => item.id === product.id)
      if (found) {
        return current.map((item) =>
          item.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
            : item,
        )
      }
      return [...current, { ...product, quantity: 1 }]
    })
  }

  const update = (id, quantity) => {
    setItems((current) =>
      current
        .map((item) => item.id === id ? { ...item, quantity: Math.max(0, Math.min(quantity, item.stock)) } : item)
        .filter((item) => item.quantity > 0),
    )
  }

  const remove = (id) => setItems((current) => current.filter((item) => item.id !== id))
  const clear = () => setItems([])
  const count = items.reduce((sum, item) => sum + item.quantity, 0)
  const total = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)

  return { items, add, update, remove, clear, count, total }
}

function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return <div className={`toast ${type}`}>{message}</div>
}

function ProductCard({ product, onAdd, onDetails }) {
  const soldOut = product.stock === 0
  return (
    <article className="product-card">
      <div className="product-image-wrap">
        {product.featured && <span className="badge">Destacado</span>}
        <img src={product.image_url} alt={product.name} className="product-image" />
      </div>
      <div className="product-content">
        <div className="product-meta">
          <span>{product.brand}</span>
          <span>{product.category.name}</span>
        </div>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <div className="stock-line">
          <span className={soldOut ? 'stock sold-out' : product.stock <= 5 ? 'stock low' : 'stock'}>
            {soldOut ? 'Agotado' : `${product.stock} disponibles`}
          </span>
          <strong>{money.format(product.price)}</strong>
        </div>
        <div className="card-actions">
          <button className="button secondary" onClick={() => onDetails(product)}>Detalles</button>
          <button className="button primary" onClick={() => onAdd(product)} disabled={soldOut}>
            Añadir
          </button>
        </div>
      </div>
    </article>
  )
}

function Modal({ title, children, onClose, wide = false }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className={`modal ${wide ? 'wide' : ''}`} onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar">×</button>
        </header>
        {children}
      </section>
    </div>
  )
}

function ProductDetails({ product, onClose, onAdd }) {
  return (
    <Modal title={product.name} onClose={onClose}>
      <div className="detail-layout">
        <img src={product.image_url} alt={product.name} />
        <div>
          <span className="eyebrow">{product.brand} · {product.category.name}</span>
          <p>{product.description}</p>
          <div className="detail-price">{money.format(product.price)}</div>
          <p className="muted">Inventario disponible: {product.stock}</p>
          <button className="button primary full" disabled={!product.stock} onClick={() => { onAdd(product); onClose() }}>
            {product.stock ? 'Añadir al carrito' : 'Producto agotado'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function CartModal({ cart, onClose, onCheckout }) {
  return (
    <Modal title="Tu carrito" onClose={onClose}>
      {cart.items.length === 0 ? (
        <div className="empty-state"><span>⌁</span><p>Tu carrito todavía está vacío.</p></div>
      ) : (
        <>
          <div className="cart-list">
            {cart.items.map((item) => (
              <div className="cart-item" key={item.id}>
                <img src={item.image_url} alt="" />
                <div className="cart-item-info">
                  <strong>{item.name}</strong>
                  <span>{money.format(item.price)}</span>
                </div>
                <div className="quantity-control">
                  <button onClick={() => cart.update(item.id, item.quantity - 1)}>−</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => cart.update(item.id, item.quantity + 1)}>+</button>
                </div>
                <button className="remove-button" onClick={() => cart.remove(item.id)}>Eliminar</button>
              </div>
            ))}
          </div>
          <div className="cart-total"><span>Total</span><strong>{money.format(cart.total)}</strong></div>
          <button className="button primary full" onClick={onCheckout}>Continuar con el pedido</button>
        </>
      )}
    </Modal>
  )
}

function CheckoutModal({ cart, onClose, onSuccess, onError }) {
  const [form, setForm] = useState({ customer_name: '', customer_email: '', customer_phone: '', delivery_address: '' })
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      const order = await api.createOrder({
        ...form,
        items: cart.items.map((item) => ({ product_id: item.id, quantity: item.quantity })),
      })
      cart.clear()
      onSuccess(`Pedido #${order.id} registrado correctamente por ${money.format(order.total)}.`)
      onClose()
    } catch (error) {
      onError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Finalizar pedido" onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <label>Nombre completo<input required value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></label>
        <label>Correo electrónico<input required type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} /></label>
        <label>Teléfono<input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} /></label>
        <label>Dirección de entrega<input value={form.delivery_address} onChange={(e) => setForm({ ...form, delivery_address: e.target.value })} /></label>
        <div className="checkout-summary"><span>Total del pedido</span><strong>{money.format(cart.total)}</strong></div>
        <button className="button primary full" disabled={submitting}>{submitting ? 'Registrando…' : 'Confirmar pedido'}</button>
      </form>
    </Modal>
  )
}

function StatCard({ label, value }) {
  return <div className="stat-card"><span>{label}</span><strong>{value ?? '—'}</strong></div>
}

function AdminPanel({ categories, onClose, onCatalogRefresh, notify }) {
  const [key, setKey] = useState(() => sessionStorage.getItem('novabyte-admin-key') || '')
  const [authenticated, setAuthenticated] = useState(false)
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState(null)
  const [tab, setTab] = useState('products')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyProduct)
  const [loading, setLoading] = useState(false)

  const loadAdmin = async (adminKey = key) => {
    setLoading(true)
    try {
      const [productData, orderData, statsData] = await Promise.all([
        api.adminProducts(adminKey), api.adminOrders(adminKey), api.adminStats(adminKey),
      ])
      sessionStorage.setItem('novabyte-admin-key', adminKey)
      setProducts(productData)
      setOrders(orderData)
      setStats(statsData)
      setAuthenticated(true)
    } catch (error) {
      setAuthenticated(false)
      notify(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const beginEdit = (product) => {
    setEditing(product)
    setForm({
      name: product.name,
      brand: product.brand,
      description: product.description,
      price: product.price,
      stock: product.stock,
      image_url: product.image_url,
      featured: product.featured,
      active: product.active,
      category_id: product.category_id,
    })
  }

  const resetForm = () => {
    setEditing(null)
    setForm({ ...emptyProduct, category_id: categories[0]?.id || '' })
  }

  const submitProduct = async (event) => {
    event.preventDefault()
    const payload = { ...form, price: Number(form.price), stock: Number(form.stock), category_id: Number(form.category_id) }
    try {
      if (editing) {
        await api.updateProduct(key, editing.id, payload)
        notify('Producto actualizado.')
      } else {
        await api.createProduct(key, payload)
        notify('Producto creado.')
      }
      resetForm()
      await loadAdmin()
      onCatalogRefresh()
    } catch (error) {
      notify(error.message, 'error')
    }
  }

  const removeProduct = async (product) => {
    if (!window.confirm(`¿Desactivar ${product.name}?`)) return
    try {
      await api.deleteProduct(key, product.id)
      notify('Producto desactivado.')
      await loadAdmin()
      onCatalogRefresh()
    } catch (error) {
      notify(error.message, 'error')
    }
  }

  const changeStatus = async (orderId, status) => {
    try {
      await api.updateOrderStatus(key, orderId, status)
      await loadAdmin()
      notify('Estado del pedido actualizado.')
    } catch (error) {
      notify(error.message, 'error')
    }
  }

  return (
    <Modal title="Administración NovaByte" onClose={onClose} wide>
      {!authenticated ? (
        <div className="admin-login">
          <p>Ingresa la clave definida en <code>ADMIN_API_KEY</code>.</p>
          <input type="password" placeholder="Clave administrativa" value={key} onChange={(e) => setKey(e.target.value)} />
          <button className="button primary" disabled={!key || loading} onClick={() => loadAdmin()}>{loading ? 'Verificando…' : 'Ingresar'}</button>
        </div>
      ) : (
        <div className="admin-layout">
          <div className="stats-grid">
            <StatCard label="Productos activos" value={stats?.active_products} />
            <StatCard label="Categorías" value={stats?.categories} />
            <StatCard label="Pedidos pendientes" value={stats?.pending_orders} />
            <StatCard label="Stock bajo" value={stats?.low_stock_products} />
          </div>

          <div className="admin-tabs">
            <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>Productos</button>
            <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>Pedidos</button>
          </div>

          {tab === 'products' ? (
            <div className="admin-products-grid">
              <form className="admin-form" onSubmit={submitProduct}>
                <h3>{editing ? 'Editar producto' : 'Nuevo producto'}</h3>
                <label>Nombre<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
                <label>Marca<input required value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></label>
                <label>Descripción<textarea required minLength="10" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
                <div className="two-columns">
                  <label>Precio<input required type="number" min="0.01" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
                  <label>Stock<input required type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></label>
                </div>
                <label>Categoría<select required value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                  <option value="">Selecciona</option>
                  {categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
                </select></label>
                <label>Ruta de imagen<input required value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></label>
                <div className="check-row">
                  <label><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Destacado</label>
                  <label><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Activo</label>
                </div>
                <div className="form-actions">
                  {editing && <button type="button" className="button secondary" onClick={resetForm}>Cancelar</button>}
                  <button className="button primary">{editing ? 'Guardar cambios' : 'Crear producto'}</button>
                </div>
              </form>

              <div className="admin-list">
                {products.map((product) => (
                  <div className={`admin-product-row ${product.active ? '' : 'inactive'}`} key={product.id}>
                    <img src={product.image_url} alt="" />
                    <div><strong>{product.name}</strong><span>{product.brand} · {product.stock} unidades · {money.format(product.price)}</span></div>
                    <button onClick={() => beginEdit(product)}>Editar</button>
                    <button className="danger-link" disabled={!product.active} onClick={() => removeProduct(product)}>Desactivar</button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="orders-table-wrap">
              <table className="orders-table">
                <thead><tr><th>Pedido</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Fecha</th></tr></thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>#{order.id}<small>{order.items.length} producto(s)</small></td>
                      <td>{order.customer_name}<small>{order.customer_email}</small></td>
                      <td>{money.format(order.total)}</td>
                      <td><select value={order.status} onChange={(e) => changeStatus(order.id, e.target.value)}>
                        <option value="pendiente">Pendiente</option>
                        <option value="confirmado">Confirmado</option>
                        <option value="enviado">Enviado</option>
                        <option value="entregado">Entregado</option>
                        <option value="cancelado">Cancelado</option>
                      </select></td>
                      <td>{new Date(order.created_at).toLocaleDateString('es-EC')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!orders.length && <div className="empty-state"><p>Aún no hay pedidos.</p></div>}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

export default function App() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [featuredOnly, setFeaturedOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [toast, setToast] = useState(null)
  const cart = useCart()

  const notify = (message, type = 'success') => setToast({ message, type, id: Date.now() })

  const loadProducts = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.products({ search, category, featured: featuredOnly ? true : '' })
      setProducts(data)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api.categories().then(setCategories).catch((loadError) => setError(loadError.message))
  }, [])

  useEffect(() => {
    const timer = setTimeout(loadProducts, 250)
    return () => clearTimeout(timer)
  }, [search, category, featuredOnly])

  const featuredCount = useMemo(() => products.filter((product) => product.featured).length, [products])

  const addToCart = (product) => {
    cart.add(product)
    notify(`${product.name} fue añadido al carrito.`)
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#inicio"><img src="/logo.svg" alt="" /><span>NovaByte<small>Tech Store</small></span></a>
        <nav>
          <a href="#catalogo">Catálogo</a>
          <a href="#ventajas">Ventajas</a>
          <button className="nav-button" onClick={() => setModal('admin')}>Administrar</button>
          <button className="cart-button" onClick={() => setModal('cart')} aria-label="Abrir carrito">Carrito <span>{cart.count}</span></button>
        </nav>
      </header>

      <main>
        <section className="hero" id="inicio">
          <div className="hero-copy">
            <span className="eyebrow">Tecnología útil, sin ruido</span>
            <h1>Equipos que impulsan tus ideas.</h1>
            <p>Explora celulares, laptops, computadoras y accesorios seleccionados para estudiar, trabajar y crear.</p>
            <div className="hero-actions"><a className="button primary" href="#catalogo">Ver catálogo</a><button className="button secondary" onClick={() => setFeaturedOnly(true)}>Ver destacados</button></div>
            <div className="hero-metrics"><div><strong>{products.length || 8}+</strong><span>Productos</span></div><div><strong>{categories.length || 4}</strong><span>Categorías</span></div><div><strong>{featuredCount || 5}</strong><span>Destacados</span></div></div>
          </div>
          <div className="hero-visual">
            <div className="orb orb-one"></div><div className="orb orb-two"></div>
            <img src="/images/hero-devices.svg" alt="Conjunto de dispositivos tecnológicos" />
            <div className="floating-card top"><span>Inventario</span><strong>En tiempo real</strong></div>
            <div className="floating-card bottom"><span>Pedidos</span><strong>Flujo completo</strong></div>
          </div>
        </section>

        <section className="benefits" id="ventajas">
          <article><span>01</span><div><h3>Catálogo conectado</h3><p>Los productos provienen de PostgreSQL mediante una API real.</p></div></article>
          <article><span>02</span><div><h3>Stock protegido</h3><p>Cada pedido valida disponibilidad antes de descontar inventario.</p></div></article>
          <article><span>03</span><div><h3>Despliegue continuo</h3><p>GitHub Actions construye y publica las imágenes Docker.</p></div></article>
        </section>

        <section className="catalog-section" id="catalogo">
          <div className="section-heading"><div><span className="eyebrow">Catálogo NovaByte</span><h2>Encuentra tu próximo equipo</h2></div><p>{products.length} resultados</p></div>
          <div className="filters">
            <div className="search-box"><span>⌕</span><input placeholder="Buscar producto o marca" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">Todas las categorías</option>{categories.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select>
            <label className="toggle"><input type="checkbox" checked={featuredOnly} onChange={(e) => setFeaturedOnly(e.target.checked)} /><span></span>Solo destacados</label>
          </div>

          {loading ? <div className="loading-grid">{Array.from({ length: 4 }).map((_, index) => <div className="skeleton" key={index}></div>)}</div>
            : error ? <div className="error-state"><h3>No se pudo cargar el catálogo</h3><p>{error}</p><button className="button secondary" onClick={loadProducts}>Reintentar</button></div>
            : products.length ? <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} onAdd={addToCart} onDetails={(item) => { setSelectedProduct(item); setModal('details') }} />)}</div>
            : <div className="empty-state"><span>⌕</span><p>No encontramos productos con esos filtros.</p></div>}
        </section>
      </main>

      <footer><div className="brand footer-brand"><img src="/logo.svg" alt="" /><span>NovaByte<small>Tech Store</small></span></div><p>Proyecto full stack preparado para una demostración DevOps.</p><a href="/api/docs" target="_blank" rel="noreferrer">Documentación API ↗</a></footer>

      {modal === 'details' && selectedProduct && <ProductDetails product={selectedProduct} onClose={() => setModal(null)} onAdd={addToCart} />}
      {modal === 'cart' && <CartModal cart={cart} onClose={() => setModal(null)} onCheckout={() => setModal('checkout')} />}
      {modal === 'checkout' && <CheckoutModal cart={cart} onClose={() => setModal(null)} onSuccess={(message) => { notify(message); loadProducts() }} onError={(message) => notify(message, 'error')} />}
      {modal === 'admin' && <AdminPanel categories={categories} onClose={() => setModal(null)} onCatalogRefresh={loadProducts} notify={notify} />}
      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
