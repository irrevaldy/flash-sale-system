// src/models/Product.ts
// v2.1 - Fixed with text search index

import mongoose, { Schema, Model } from 'mongoose';

export interface IProduct {
  sku: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  category: string;
  subcategory?: string;
  brand?: string;
  images: string[];
  specifications: Record<string, any>;
  inventory: {
    totalStock: number;
    reservedStock: number;
    availableStock: number;
  };
  seo: {
    slug: string;
    metaTitle?: string;
    metaDescription?: string;
  };
  status: 'active' | 'inactive' | 'discontinued';
  tags: string[];
  rating: {
    average: number;
    count: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IProductMethods {
  isInStock(quantity?: number): boolean;
}

type ProductModel = Model<IProduct, {}, IProductMethods>;

const ProductSchema = new Schema<IProduct, ProductModel, IProductMethods>(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    compareAtPrice: {
      type: Number,
      min: 0,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    subcategory: {
      type: String,
      index: true,
    },
    brand: {
      type: String,
      index: true,
    },
    images: {
      type: [String],
      default: [],
    },
    specifications: {
      type: Schema.Types.Mixed,
      default: {},
    },
    inventory: {
      totalStock: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      reservedStock: {
        type: Number,
        default: 0,
        min: 0,
      },
      availableStock: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    seo: {
      slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
      },
      metaTitle: String,
      metaDescription: String,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'discontinued'],
      default: 'active',
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
  },
  { timestamps: true }
);

// ==================== INDEXES ====================

// Text search index for name, description, and tags
ProductSchema.index({
  name: 'text',
  description: 'text',
  tags: 'text',
  brand: 'text',
});

// Compound indexes for common queries
ProductSchema.index({ category: 1, status: 1 });
ProductSchema.index({ price: 1, status: 1 });
ProductSchema.index({ 'rating.average': -1 });

// ==================== METHODS ====================

ProductSchema.methods.isInStock = function (
  this: IProduct,
  quantity: number = 1
): boolean {
  return this.inventory.availableStock >= quantity;
};

// ==================== PRE-SAVE HOOK ====================

ProductSchema.pre('save', function (next) {
  // Calculate available stock
  this.inventory.availableStock =
    this.inventory.totalStock - this.inventory.reservedStock;
  next();
});

export default mongoose.model<IProduct, ProductModel>('Product', ProductSchema);
