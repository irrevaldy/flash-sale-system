// src/models/FlashSalePurchase.ts
// Tracks who has successfully purchased during the flash sale
// One document per user purchase — enforces one-per-user

import mongoose, { Document, Schema } from 'mongoose';

export interface IFlashSalePurchase extends Document {
  userId: string;           // user email
  productId: string;        // product purchased
  purchasedAt: Date;
  quantity: number;         // always 1
  price: number;            // flash sale price paid
  orderNumber?: string;     // linked order if created
}

const FlashSalePurchaseSchema = new Schema<IFlashSalePurchase>(
  {
    userId:      { type: String, required: true },
    productId:   { type: String, required: true },
    purchasedAt: { type: Date,   default: Date.now },
    quantity:    { type: Number, default: 1 },
    price:       { type: Number, required: true },
    orderNumber: { type: String },
  },
  { timestamps: true }
);

// ✅ Unique index: one purchase per user per product
FlashSalePurchaseSchema.index({ userId: 1, productId: 1 }, { unique: true });

export default mongoose.model<IFlashSalePurchase>(
  'FlashSalePurchase',
  FlashSalePurchaseSchema
);
