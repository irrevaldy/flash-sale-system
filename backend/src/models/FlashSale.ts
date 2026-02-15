// src/models/FlashSale.ts

import mongoose, { Schema, Model } from 'mongoose';

export interface IFlashSaleProduct {
  productId: mongoose.Types.ObjectId;
  flashPrice: number;
  originalPrice: number;
  stockLimit: number;
  soldCount: number;
  maxPerUser: number;
}

export interface IFlashSale {
  name: string;
  description: string;
  startTime: Date;
  endTime: Date;
  status: 'scheduled' | 'active' | 'ended' | 'cancelled';
  products: IFlashSaleProduct[];
  rules: {
    minPurchaseAmount: number;
    maxDiscountPercentage: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IFlashSaleMethods {
  isActive(): boolean;
  getProduct(productId: string): IFlashSaleProduct | undefined;
}

type FlashSaleModel = Model<
  IFlashSale,
  {},
  IFlashSaleMethods
>;

const FlashSaleProductSchema = new Schema<IFlashSaleProduct>({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  flashPrice: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, required: true, min: 0 },
  stockLimit: { type: Number, required: true, min: 1 },
  soldCount: { type: Number, default: 0, min: 0 },
  maxPerUser: { type: Number, default: 1, min: 1 },
});

const FlashSaleSchema = new Schema<
  IFlashSale,
  FlashSaleModel,
  IFlashSaleMethods
>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['scheduled', 'active', 'ended', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
    products: {
      type: [FlashSaleProductSchema],
      default: [],
    },
    rules: {
      minPurchaseAmount: { type: Number, default: 0 },
      maxDiscountPercentage: {
        type: Number,
        default: 70,
        min: 0,
        max: 100,
      },
    },
  },
  { timestamps: true }
);

FlashSaleSchema.index({ status: 1, startTime: 1, endTime: 1 });

/* =======================
   METHODS
======================= */

FlashSaleSchema.methods.isActive = function (
  this: IFlashSale
): boolean {
  const now = new Date();
  return (
    this.status === 'active' &&
    this.startTime <= now &&
    this.endTime > now
  );
};

FlashSaleSchema.methods.getProduct = function (
  this: IFlashSale,
  productId: string
): IFlashSaleProduct | undefined {
  return this.products.find(
    (p) => p.productId.toString() === productId
  );
};

export default mongoose.model<
  IFlashSale,
  FlashSaleModel
>('FlashSale', FlashSaleSchema);
