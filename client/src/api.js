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

export async function createProduct(product, editPassword) {
  const headers = editPassword ? { 'X-Edit-Password': editPassword } : undefined;
  const { data } = await api.post('/products', product, { headers });
  return data;
}

export async function updateProduct(id, updates, editPassword) {
  const headers = editPassword ? { 'X-Edit-Password': editPassword } : undefined;
  const { data } = await api.put(`/products/${id}`, updates, { headers });
  return data;
}

export async function deleteProduct(id, editPassword) {
  const headers = editPassword ? { 'X-Edit-Password': editPassword } : undefined;
  await api.delete(`/products/${id}`, { headers });
}

export async function login(username, password, startingCash, startingBank) {
  const payload = { username, password };
  if (typeof startingCash !== 'undefined') payload.startingCash = Number(startingCash || 0);
  if (typeof startingBank !== 'undefined') payload.startingBank = Number(startingBank || 0);
  const { data } = await api.post('/auth/login', payload);
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  if (data.sessionId) localStorage.setItem('sessionId', data.sessionId);
  return data;
}

export async function register(username, password, masterPassword) {
  const { data } = await api.post('/auth/register', { username, password, masterPassword });
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

export async function createSale({ items, vat = 0, serviceFee = 0, payments }) {
  const sessionId = localStorage.getItem('sessionId');
  const headers = sessionId ? { 'X-Session-Id': sessionId } : undefined;
  const body = { items, vat, serviceFee };
  if (payments) body.payments = payments;
  const { data } = await api.post('/sales', body, { headers });
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

export async function keepSessionAlive() {
  const sessionId = localStorage.getItem('sessionId');
  if (!sessionId) return { ok: false, skipped: true };
  try {
    const headers = { 'X-Session-Id': sessionId };
    const { data } = await api.post('/sessions/heartbeat', {}, { headers });
    return data;
  } catch (e) {
    // If heartbeat fails with 404/409/401, surface minimal info
    return { ok: false, error: e?.response?.data?.message || e.message };
  }
}

// ===== Accounting =====
export async function fetchAccounts() {
  const { data } = await api.get('/accounting/accounts');
  return data;
}

export async function createAccount(account) {
  const { data } = await api.post('/accounting/accounts', account);
  return data;
}

export async function updateAccount(id, updates) {
  const { data } = await api.put(`/accounting/accounts/${id}`, updates);
  return data;
}

export async function deleteAccount(id) {
  const { data } = await api.delete(`/accounting/accounts/${id}`);
  return data;
}

export async function fetchTransactions(params) {
  const { data } = await api.get('/accounting/transactions', { params });
  return data;
}

export async function fetchSalesByType(params) {
  const { data } = await api.get('/accounting/transactions/sales-by-type', { params });
  return data;
}

export async function createTransaction(txn) {
  const { data } = await api.post('/accounting/transactions', txn);
  return data;
}

export async function updateTransaction(id, updates) {
  const { data } = await api.put(`/accounting/transactions/${id}`, updates);
  return data;
}

export async function deleteTransaction(id) {
  const { data } = await api.delete(`/accounting/transactions/${id}`);
  return data;
}


