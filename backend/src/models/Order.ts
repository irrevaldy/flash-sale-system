// src/models/Order.ts
// v2.3 - Added stripePaymentIntentId to support Stripe verification + webhook updates

import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  productSnapshot: {
    name: string;
    sku: string;
    image: string;
  };
  quantity: number;
  pricePerUnit: number;
  flashSaleId?: mongoose.Types.ObjectId;
  discountAmount: number;
}

export interface IOrder extends Document {
  orderNumber: string;
  userId: string;
  status:
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
    | 'refunded';
  items: IOrderItem[];
  pricing: {
    subtotal: number;
    discount: number;
    tax: number;
    shipping: number;
    total: number;
  };
  shipping: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  payment: {
    method: string;
    status: 'pending' | 'paid' | 'failed' | 'refunded';

    // ✅ Stripe
    stripePaymentIntentId?: string;

    transactionId?: string;
    paidAt?: Date;
  };
  timeline: Array<{
    status: string;
    timestamp: Date;
    note?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;

  updateStatus(newStatus: string, note?: string): void;
}

const OrderItemSchema = new Schema<IOrderItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productSnapshot: {
    name: { type: String, required: true },
    sku: { type: String, required: true },
    image: { type: String, required: true },
  },
  quantity: { type: Number, required: true, min: 1 },
  pricePerUnit: { type: Number, required: true, min: 0 },
  flashSaleId: { type: Schema.Types.ObjectId, ref: 'FlashSale' },
  discountAmount: { type: Number, default: 0, min: 0 },
});

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, uppercase: true },

    userId: { type: String, required: true },

    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
      default: 'pending',
    },

    items: {
      type: [OrderItemSchema],
      required: true,
      validate: {
        validator: function (items: IOrderItem[]) {
          return items.length > 0;
        },
        message: 'Order must have at least one item',
      },
    },

    pricing: {
      subtotal: { type: Number, required: true, min: 0 },
      discount: { type: Number, default: 0, min: 0 },
      tax: { type: Number, default: 0, min: 0 },
      shipping: { type: Number, default: 0, min: 0 },
      total: { type: Number, required: true, min: 0 },
    },

    shipping: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, required: true, default: 'USA' },
    },

    payment: {
      method: {
        type: String,
        required: true,
        enum: ['credit_card', 'debit_card', 'paypal', 'cod'],
      },
      status: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending',
      },

      // ✅ store PI id so you can verify or update later (webhook)
      stripePaymentIntentId: { type: String, index: true },

      transactionId: String,
      paidAt: Date,
    },

    timeline: {
      type: [
        {
          status: { type: String, required: true },
          timestamp: { type: Date, required: true, default: Date.now },
          note: String,
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });

OrderSchema.pre('save', function (next) {
  if (this.isNew && this.timeline.length === 0) {
    this.timeline.push({
      status: this.status,
      timestamp: new Date(),
      note: 'Order created',
    });
  }
  next();
});

OrderSchema.methods.updateStatus = function (newStatus: string, note?: string) {
  this.status = newStatus;
  this.timeline.push({ status: newStatus, timestamp: new Date(), note });
};

export default mongoose.model<IOrder>('Order', OrderSchema);
