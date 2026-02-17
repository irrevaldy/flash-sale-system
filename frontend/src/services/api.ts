// src/services/api.ts
// v3.0 - Complete API service with all endpoints

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ==================== PRODUCT API ====================
export const productApi = {
  async getAll(params?: {
    category?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  }) {
    const response = await api.get('/api/products', { params });
    return response.data;
  },

  async getById(id: string) {
    const response = await api.get(`/api/products/${id}`);
    return response.data;
  },

  async getBySlug(slug: string) {
    const response = await api.get(`/api/products/slug/${slug}`);
    return response.data;
  },

  async getCategories() {
    const response = await api.get('/api/products/categories');
    return response.data;
  },
};

// ==================== USER API ====================
export const userApi = {
  async register(payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) {
    const response = await api.post('/api/users/register', payload);
    return response.data;
  },

  async login(email: string, password: string) {
    const response = await api.post('/api/users/login', {
      email,
      password,
    });
    return response.data;
  },

  async getProfile(email: string) {
    const response = await api.get(`/api/users/${email}`);
    return response.data;
  },

  async updateProfile(email: string, updates: any) {
    const response = await api.put(`/api/users/${email}`, updates);
    return response.data;
  },

  async addAddress(email: string, address: any) {
    const response = await api.post(`/api/users/${email}/addresses`, address);
    return response.data;
  },

  async removeAddress(email: string, addressId: string) {
    const response = await api.delete(`/api/users/${email}/addresses/${addressId}`);
    return response.data;
  },

  async getDashboard(email: string) {
    const response = await api.get(`/api/users/${email}/dashboard`);
    return response.data;
  },
};

// ==================== CART API ====================
export const cartApi = {
  async getCart(userId: string) {
    const response = await api.get(`/api/cart/${userId}`);
    return response.data;
  },

  async addItem(userId: string, productId: string, quantity: number = 1) {
    const response = await api.post(`/api/cart/${userId}/items`, {
      productId,
      quantity,
    });
    return response.data;
  },

  async updateItem(userId: string, productId: string, quantity: number) {
    const response = await api.put(`/api/cart/${userId}/items/${productId}`, {
      quantity,
    });
    return response.data;
  },

  async removeItem(userId: string, productId: string) {
    const response = await api.delete(`/api/cart/${userId}/items/${productId}`);
    return response.data;
  },

  async clearCart(userId: string) {
    const response = await api.delete(`/api/cart/${userId}`);
    return response.data;
  },
};

// ==================== ORDER API ====================
export const orderApi = {
  async checkout(orderData: any) {
    const response = await api.post('/api/orders/checkout', orderData);
    return response.data;
  },

  async getUserOrders(userId: string, page = 1, limit = 10) {
    const response = await api.get(`/api/orders/${userId}`, {
      params: { page, limit },
    });
    return response.data;
  },

  async getByOrderNumber(orderNumber: string) {
    const response = await api.get(`/api/orders/detail/${orderNumber}`);
    return response.data;
  },

  async getUserStats(userId: string) {
    const response = await api.get(`/api/orders/stats/${userId}`);
    return response.data;
  },

  async cancel(orderNumber: string, reason?: string) {
    const response = await api.post(`/api/orders/${orderNumber}/cancel`, { reason });
    return response.data;
  },

  async updateStatus(orderNumber: string, status: string, note?: string) {
    const response = await api.put(`/api/orders/${orderNumber}/status`, { status, note });
    return response.data;
  },
};

// ==================== FLASH SALE API ====================
export const flashSaleApi = {
  async getStatus() {
    const response = await api.get('/api/flash-sale/status');
    return response.data;
  },

  // Reserve item (soft lock) — call on "Buy Now" click
  async reserve(userId: string) {
    const response = await api.post('/api/flash-sale/reserve', { userId });
    return response.data;
  },

  // Confirm purchase after Stripe payment succeeds
  async confirm(userId: string, stripePaymentIntentId: string) {
    const response = await api.post('/api/flash-sale/confirm', { userId, stripePaymentIntentId });
    return response.data;
  },

  // Check if user has purchased or has active reservation
  async checkPurchase(userId: string) {
    const response = await api.get(`/api/flash-sale/check/${userId}`);
    return response.data;
  },

  // Cancel reservation if user exits checkout
  async cancelReservation(userId: string) {
    const response = await api.post('/api/flash-sale/cancel-reservation', { userId });
    return response.data;
  },
};

export default api;
