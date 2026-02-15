// src/services/api.ts

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Internal types (not exported)
interface SaleStatus {
  status: 'upcoming' | 'active' | 'ended' | 'sold_out';
  startTime: string;
  endTime: string;
  totalStock: number;
  remainingStock: number;
  productName: string;
}

interface PurchaseResponse {
  success: boolean;
  message: string;
  remainingStock?: number;
}

interface UserPurchaseStatus {
  hasPurchased: boolean;
  purchaseTime?: string;
}

export const saleApi = {
  /**
   * Get current sale status
   */
  getStatus: async (): Promise<SaleStatus> => {
    const response = await api.get<SaleStatus>('/api/sale/status');
    return response.data;
  },

  /**
   * Attempt to purchase item
   */
  purchase: async (userId: string): Promise<PurchaseResponse> => {
    const response = await api.post<PurchaseResponse>('/api/sale/purchase', {
      userId,
    });
    return response.data;
  },

  /**
   * Check if user has purchased
   */
  checkUserPurchase: async (userId: string): Promise<UserPurchaseStatus> => {
    const response = await api.get<UserPurchaseStatus>(`/api/sale/user/${userId}`);
    return response.data;
  },
};

export default api;
