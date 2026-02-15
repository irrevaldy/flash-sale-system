// src/types/index.ts

export interface SaleConfig {
  startTime: string; // ISO 8601 format
  endTime: string;   // ISO 8601 format
  totalStock: number;
  productName: string;
}

export interface SaleStatus {
  status: 'upcoming' | 'active' | 'ended' | 'sold_out';
  startTime: string;
  endTime: string;
  totalStock: number;
  remainingStock: number;
  productName: string;
}

export interface PurchaseRequest {
  userId: string;
}

export interface PurchaseResponse {
  success: boolean;
  message: string;
  remainingStock?: number;
}

export interface UserPurchaseStatus {
  hasPurchased: boolean;
  purchaseTime?: string;
}

export enum ErrorMessages {
  SALE_NOT_STARTED = 'Sale has not started yet',
  SALE_ENDED = 'Sale has ended',
  SOLD_OUT = 'Product is sold out',
  ALREADY_PURCHASED = 'You have already purchased this item',
  INVALID_USER_ID = 'Invalid user ID provided',
  SYSTEM_ERROR = 'System error occurred. Please try again',
}
