// src/models/Cart.ts

import mongoose, { Schema, Model } from 'mongoose';

export interface ICartItem {
  productId: mongoose.Types.ObjectId;
  quantity: number;
  priceAtAdd: number;
  flashSaleId?: mongoose.Types.ObjectId;
  addedAt: Date;
}

export interface ICart {
  userId: string;
  items: ICartItem[];
  expiresAt: Date;
  updatedAt: Date;
}

export interface ICartMethods {
  addItem(
    productId: mongoose.Types.ObjectId,
    quantity: number,
    price: number,
    flashSaleId?: mongoose.Types.ObjectId
  ): void;

  updateItemQuantity(
    productId: mongoose.Types.ObjectId,
    quantity: number
  ): void;

  removeItem(productId: mongoose.Types.ObjectId): void;

  clear(): void;

  getTotal(): number;
}

type CartModel = Model<ICart, {}, ICartMethods>;

const CartItemSchema = new Schema<ICartItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  priceAtAdd: { type: Number, required: true, min: 0 },
  flashSaleId: { type: Schema.Types.ObjectId, ref: 'FlashSale' },
  addedAt: { type: Date, default: Date.now },
});

const CartSchema = new Schema<
  ICart,
  CartModel,
  ICartMethods
>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    items: { type: [CartItemSchema], default: [] },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

CartSchema.methods.addItem = function (
  this: ICart,
  productId,
  quantity,
  price,
  flashSaleId
) {
  const existingItem = this.items.find(
    (item) => item.productId.toString() === productId.toString()
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    this.items.push({
      productId,
      quantity,
      priceAtAdd: price,
      flashSaleId,
      addedAt: new Date(),
    });
  }
};

CartSchema.methods.updateItemQuantity = function (
  this: ICart,
  productId,
  quantity
) {
  const item = this.items.find(
    (item) => item.productId.toString() === productId.toString()
  );

  if (!item) return;

  if (quantity <= 0) {
    this.items = this.items.filter(
      (item) => item.productId.toString() !== productId.toString()
    );
  } else {
    item.quantity = quantity;
  }
};

CartSchema.methods.removeItem = function (
  this: ICart,
  productId
) {
  this.items = this.items.filter(
    (item) => item.productId.toString() !== productId.toString()
  );
};

CartSchema.methods.clear = function (this: ICart) {
  this.items = [];
};

CartSchema.methods.getTotal = function (this: ICart): number {
  return this.items.reduce(
    (total, item) => total + item.priceAtAdd * item.quantity,
    0
  );
};

CartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<ICart, CartModel>(
  'Cart',
  CartSchema
);
