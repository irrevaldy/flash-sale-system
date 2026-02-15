// src/models/Order.ts

import mongoose, { Schema, Model } from 'mongoose';

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
}

export interface IOrder {
  userId: string;
  items: IOrderItem[];
  totalAmount: number;
  status: 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrderMethods {
  updateStatus(
    status: IOrder['status'],
    note?: string
  ): void;
}

type OrderModel = Model<
  IOrder,
  {},
  IOrderMethods
>;

const OrderItemSchema = new Schema<IOrderItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
});

const OrderSchema = new Schema<
  IOrder,
  OrderModel,
  IOrderMethods
>(
  {
    userId: { type: String, required: true, index: true },
    items: { type: [OrderItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'paid', 'shipped', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    notes: { type: String },
  },
  { timestamps: true }
);

/* =======================
   METHODS
======================= */

OrderSchema.methods.updateStatus = function (
  this: IOrder,
  status: IOrder['status'],
  note?: string
) {
  this.status = status;

  if (note) {
    this.notes = note;
  }
};

export default mongoose.model<IOrder, OrderModel>(
  'Order',
  OrderSchema
);
