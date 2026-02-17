// src/seeds/seedProducts.ts
// v1.2 - Seed 100 products (multi-category) with STATIC working image URLs
// Run: npx ts-node src/seeds/seedProducts.ts

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';
import path from 'path';
import Product from '../models/Product';

// ✅ Make sure .env is loaded even when running from different folders
dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
});

/* =========================
   Helpers
========================= */

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randFloat = (min: number, max: number, decimals = 1) => {
  const n = Math.random() * (max - min) + min;
  return Number(n.toFixed(decimals));
};

const uniqueSku = () => `SKU-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
const uniqueSlugSuffix = () => crypto.randomBytes(3).toString('hex').toLowerCase();

/* =========================
   Catalog blueprint
========================= */

type CatalogCategory = {
  category: string;
  subcategories: string[];
  brands: string[];
  tags: string[];
  priceRange: [number, number];
};

const CATALOG: CatalogCategory[] = [
  {
    category: 'Electronics',
    subcategories: ['Smartphones', 'Laptops', 'Headphones', 'Cameras', 'Tablets'],
    brands: ['Apple', 'Samsung', 'Asus', 'Sony', 'Xiaomi', 'Lenovo', 'HP'],
    tags: ['electronics', 'gadget', 'tech'],
    priceRange: [80, 2500],
  },
  {
    category: 'Fashion',
    subcategories: ['T-Shirts', 'Shoes', 'Jackets', 'Bags', 'Accessories'],
    brands: ['Nike', 'Adidas', 'Zara', 'H&M', 'Uniqlo', 'Puma'],
    tags: ['fashion', 'style'],
    priceRange: [10, 300],
  },
  {
    category: 'Beauty',
    subcategories: ['Skincare', 'Makeup', 'Fragrance', 'Haircare'],
    brands: ['The Ordinary', 'L’Oréal', 'Maybelline', 'SK-II', 'Garnier'],
    tags: ['beauty', 'skincare'],
    priceRange: [5, 250],
  },
  {
    category: 'Home & Living',
    subcategories: ['Kitchen', 'Bedroom', 'Lighting', 'Decor', 'Furniture'],
    brands: ['Ikea', 'Philips', 'LocknLock', 'Krisbow', 'Oxone'],
    tags: ['home', 'living'],
    priceRange: [8, 1200],
  },
  {
    category: 'Sports',
    subcategories: ['Fitness', 'Outdoor', 'Cycling', 'Running'],
    brands: ['Decathlon', 'Nike', 'Adidas', 'Under Armour'],
    tags: ['sports', 'fitness'],
    priceRange: [10, 800],
  },
];

/* =========================
   STATIC image pool (guaranteed valid links)
   Using images.unsplash.com (not source.unsplash.com)
========================= */

const PRODUCT_IMAGES: Record<string, string[]> = {
  Electronics: [
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=900&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=900&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=900&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=900&q=80&auto=format&fit=crop',
  ],

  Fashion: [
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=900&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=900&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=900&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=900&q=80&auto=format&fit=crop',
  ],

  Beauty: [
    'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=900&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=900&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=900&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1556228578-ddc0e9a6e04c?w=900&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=900&q=80&auto=format&fit=crop',
  ],

  'Home & Living': [
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=900&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1567016432779-094069958ea5?w=900&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=900&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1493666438817-866a91353ca9?w=900&q=80&auto=format&fit=crop',
  ],

  Sports: [
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=900&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=900&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=900&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=900&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=900&q=80&auto=format&fit=crop',
  ],
};

/* =========================
   Product generator (matches schema)
========================= */

function makeProduct(i: number) {
  const cat = pick(CATALOG);
  const sub = pick(cat.subcategories);
  const brand = pick(cat.brands);

  const name = `${brand} ${sub} Item ${i + 1}`;
  const price = randInt(cat.priceRange[0], cat.priceRange[1]);

  const compareAtPrice =
    Math.random() < 0.65 ? Math.round(price * (1 + randFloat(0.05, 0.35, 2))) : undefined;

  const totalStock = randInt(10, 250);
  const reservedStock = randInt(0, Math.min(10, totalStock));
  const availableStock = Math.max(0, totalStock - reservedStock);

  const sku = uniqueSku();
  const slug = slugify(`${name}-${uniqueSlugSuffix()}`);

  // ✅ Static working images
  const imageUrl = pick(PRODUCT_IMAGES[cat.category] || PRODUCT_IMAGES.Electronics);

  return {
    sku,
    name,
    description: `High quality ${sub.toLowerCase()} by ${brand}. Perfect for daily use.`,
    price,
    ...(compareAtPrice ? { compareAtPrice } : {}),
    category: cat.category,
    subcategory: sub,
    brand,
    images: [imageUrl],
    specifications: {
      color: pick(['Black', 'White', 'Blue', 'Red', 'Green', 'Gray']),
      material: pick(['Aluminum', 'Plastic', 'Cotton', 'Leather', 'N/A']),
      warranty: pick(['7 days', '30 days', '1 year', '2 years']),
    },
    inventory: {
      totalStock,
      reservedStock,
      availableStock, // required by schema
    },
    seo: {
      slug, // required + unique + lowercase in schema
      metaTitle: `Buy ${name} Online`,
      metaDescription: `Shop ${name} at the best price. Fast delivery and trusted quality.`,
    },
    status: 'active' as const,
    tags: Array.from(
      new Set([
        ...cat.tags,
        cat.category.toLowerCase(),
        sub.toLowerCase(),
        brand.toLowerCase(),
      ])
    ),
    rating: {
      average: randFloat(3.8, 5.0, 1),
      count: randInt(0, 500),
    },
  };
}

/* =========================
   Seed runner
========================= */

async function seedProducts() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ Missing MONGODB_URI in environment (.env)');
    console.error('   Loaded env from:', path.resolve(__dirname, '../../.env'));
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('✅ MongoDB connected');

  console.log('🧹 Clearing old products...');
  await Product.deleteMany({});

  console.log('📦 Generating 100 products...');
  const docs = Array.from({ length: 100 }, (_, i) => makeProduct(i));

  const inserted = await Product.insertMany(docs, { ordered: false });
  console.log(`🎉 Seeded ${inserted.length} products successfully`);

  await mongoose.disconnect();
  process.exit(0);
}

seedProducts().catch((err) => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
