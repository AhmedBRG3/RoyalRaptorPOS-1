import axios from 'axios';
import { API_URL } from './config';

export const api = axios.create({ baseURL: `${API_URL}/api` });

// Attach token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function fetchProducts(q) {
  const params = q ? { q } : undefined;
  const { data } = await api.get('/products', { params });
  return data;
}

export async function createProduct(product) {
  const { data } = await api.post('/products', product);
  return data;
}

export async function updateProduct(id, updates) {
  const { data } = await api.put(`/products/${id}`, updates);
  return data;
}

export async function deleteProduct(id) {
  await api.delete(`/products/${id}`);
}

export async function login(username, password, startingBalance) {
  const payload = { username, password };
  if (typeof startingBalance !== 'undefined') payload.startingBalance = Number(startingBalance || 0);
  const { data } = await api.post('/auth/login', payload);
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  if (data.sessionId) localStorage.setItem('sessionId', data.sessionId);
  return data;
}

export async function register(username, password) {
  const { data } = await api.post('/auth/register', { username, password });
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data;
}

export async function fetchUsers() {
  const { data } = await api.get('/auth/users');
  return data;
}

export async function updateUser(id, updates) {
  const { data } = await api.put(`/auth/users/${id}`, updates);
  return data;
}

export async function fetchOrders() {
  const { data } = await api.get('/orders');
  return data;
}

export async function createOrder(items) {
  const { data } = await api.post('/orders', { items });
  return data;
}

export async function createSale({ items, vat = 0, serviceFee = 0 }) {
  const sessionId = localStorage.getItem('sessionId');
  const headers = sessionId ? { 'X-Session-Id': sessionId } : undefined;
  const { data } = await api.post('/sales', { items, vat, serviceFee }, { headers });
  return data;
}

export async function fetchSessions() {
  const { data } = await api.get('/sessions');
  return data;
}

export async function fetchSales() {
  const { data } = await api.get('/sales');
  return data;
}

export async function refundSale(id) {
  const { data } = await api.post(`/sales/${id}/refund`);
  return data;
}

export async function closeSession() {
  const sessionId = localStorage.getItem('sessionId');
  if (!sessionId) return;
  try {
    await api.post(`/sessions/${sessionId}/close`);
  } catch (e) {
    // Optionally handle error
  }
  localStorage.removeItem('sessionId');
}


