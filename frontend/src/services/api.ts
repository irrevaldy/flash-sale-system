// src/services/api.ts
// v2.0 - Complete API service for enhanced backend

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// ==================== PRODUCT API ====================
export const productApi = {
  getAll: async (params?: {
    category?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    const response = await api.get('/api/products', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/api/products/${id}`);
    return response.data;
  },

  getBySlug: async (slug: string) => {
    const response = await api.get(`/api/products/slug/${slug}`);
    return response.data;
  },

  getCategories: async () => {
    const response = await api.get('/api/products/categories');
    return response.data;
  },
};

// ==================== CART API ====================
export const cartApi = {
  get: async (userId: string) => {
    const response = await api.get(`/api/cart/${userId}`);
    return response.data;
  },

  getSummary: async (userId: string) => {
    const response = await api.get(`/api/cart/${userId}/summary`);
    return response.data;
  },

  addItem: async (userId: string, productId: string, quantity: number, flashSaleId?: string) => {
    const response = await api.post(`/api/cart/${userId}/items`, {
      productId,
      quantity,
      flashSaleId,
    });
    return response.data;
  },

  updateQuantity: async (userId: string, productId: string, quantity: number) => {
    const response = await api.put(`/api/cart/${userId}/items/${productId}`, {
      quantity,
    });
    return response.data;
  },

  removeItem: async (userId: string, productId: string) => {
    const response = await api.delete(`/api/cart/${userId}/items/${productId}`);
    return response.data;
  },

  clear: async (userId: string) => {
    const response = await api.delete(`/api/cart/${userId}`);
    return response.data;
  },
};

// ==================== ORDER API ====================
export const orderApi = {
  checkout: async (orderData: any) => {
    const response = await api.post('/api/orders/checkout', orderData);
    return response.data;
  },

  getUserOrders: async (userId: string, page = 1, limit = 10) => {
    const response = await api.get(`/api/orders/${userId}`, {
      params: { page, limit },
    });
    return response.data;
  },

  getByOrderNumber: async (orderNumber: string) => {
    const response = await api.get(`/api/orders/detail/${orderNumber}`);
    return response.data;
  },

  getUserStats: async (userId: string) => {
    const response = await api.get(`/api/orders/stats/${userId}`);
    return response.data;
  },

  cancel: async (orderNumber: string, reason?: string) => {
    const response = await api.post(`/api/orders/${orderNumber}/cancel`, {
      reason,
    });
    return response.data;
  },
};

// ==================== USER API ====================
export const userApi = {
  register: async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) => {
    const response = await api.post('/api/users/register', userData);
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await api.post('/api/users/login', { email, password });
    return response.data;
  },

  getProfile: async (email: string) => {
    const response = await api.get(`/api/users/${email}`);
    return response.data;
  },

  updateProfile: async (email: string, updates: any) => {
    const response = await api.put(`/api/users/${email}`, updates);
    return response.data;
  },

  getDashboard: async (email: string) => {
    const response = await api.get(`/api/users/${email}/dashboard`);
    return response.data;
  },

  addAddress: async (email: string, address: any) => {
    const response = await api.post(`/api/users/${email}/addresses`, address);
    return response.data;
  },

  removeAddress: async (email: string, addressId: string) => {
    const response = await api.delete(`/api/users/${email}/addresses/${addressId}`);
    return response.data;
  },
};

export default api;
