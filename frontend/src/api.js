const API_BASE = '/api'

async function request(path, options = {}) {
  const { headers = {}, ...rest } = options
  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })

  if (!response.ok) {
    let message = 'No se pudo completar la solicitud'
    try {
      const data = await response.json()
      message = data.detail || data.message || message
    } catch {
      // Respuesta sin JSON.
    }
    throw new Error(message)
  }

  if (response.status === 204) return null
  return response.json()
}

export const api = {
  categories: () => request('/categories'),
  products: ({ search = '', category = '', featured = '' } = {}) => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (category) params.set('category', category)
    if (featured !== '') params.set('featured', featured)
    return request(`/products${params.size ? `?${params}` : ''}`)
  },
  createOrder: (payload) => request('/orders', { method: 'POST', body: JSON.stringify(payload) }),
  adminProducts: (key) => request('/admin/products', { headers: { 'X-Admin-Key': key } }),
  adminOrders: (key) => request('/admin/orders', { headers: { 'X-Admin-Key': key } }),
  adminStats: (key) => request('/admin/stats', { headers: { 'X-Admin-Key': key } }),
  createProduct: (key, payload) => request('/admin/products', {
    method: 'POST',
    headers: { 'X-Admin-Key': key },
    body: JSON.stringify(payload),
  }),
  updateProduct: (key, id, payload) => request(`/admin/products/${id}`, {
    method: 'PUT',
    headers: { 'X-Admin-Key': key },
    body: JSON.stringify(payload),
  }),
  deleteProduct: (key, id) => request(`/admin/products/${id}`, {
    method: 'DELETE',
    headers: { 'X-Admin-Key': key },
  }),
  updateOrderStatus: (key, id, status) => request(`/admin/orders/${id}/status`, {
    method: 'PATCH',
    headers: { 'X-Admin-Key': key },
    body: JSON.stringify({ status }),
  }),
}
