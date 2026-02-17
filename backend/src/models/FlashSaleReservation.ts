// src/models/FlashSaleReservation.ts
// Temporary reservation during checkout — expires if payment not completed

import mongoose, { Document, Schema } from 'mongoose';

export interface IFlashSaleReservation extends Document {
  userId: string;
  productId: string;
  reservedAt: Date;
  expiresAt: Date;       // 10 minutes to complete payment
  status: 'reserved' | 'confirmed' | 'expired' | 'cancelled';
  stripePaymentIntentId?: string;
}

const FlashSaleReservationSchema = new Schema<IFlashSaleReservation>(
  {
    userId:                { type: String, required: true },
    productId:             { type: String, required: true },
    reservedAt:            { type: Date, default: Date.now },
    expiresAt:             { type: Date, required: true },
    status:                { type: String, enum: ['reserved', 'confirmed', 'expired', 'cancelled'], default: 'reserved' },
    stripePaymentIntentId: { type: String },
  },
  { timestamps: true }
);

// One active reservation per user per product
FlashSaleReservationSchema.index({ userId: 1, productId: 1, status: 1 });

// Auto-expire via MongoDB TTL
FlashSaleReservationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IFlashSaleReservation>(
  'FlashSaleReservation',
  FlashSaleReservationSchema
);
