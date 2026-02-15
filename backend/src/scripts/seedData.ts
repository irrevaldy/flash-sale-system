// src/scripts/seedData.ts

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product';
import FlashSale from '../models/FlashSale';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/flash-sale-store';

const sampleProducts = [
  {
    sku: 'HEADPHONE-001',
    name: 'Premium Wireless Headphones',
    description: 'High-quality noise-canceling wireless headphones with 30-hour battery life. Perfect for music lovers and professionals.',
    price: 299.99,
    compareAtPrice: 399.99,
    category: 'electronics',
    subcategory: 'audio',
    brand: 'TechBrand',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500',
    ],
    specifications: {
      color: 'Black',
      weight: '250g',
      battery: '30 hours',
      connectivity: 'Bluetooth 5.0',
    },
    inventory: {
      totalStock: 100,
      reservedStock: 0,
      availableStock: 100,
    },
    seo: {
      slug: 'premium-wireless-headphones',
      metaTitle: 'Premium Wireless Headphones - High Quality Audio',
      metaDescription: 'Experience superior sound quality with our premium wireless headphones',
    },
    status: 'active',
    tags: ['wireless', 'bluetooth', 'noise-canceling', 'headphones'],
    rating: { average: 4.8, count: 324 },
  },
  {
    sku: 'LAPTOP-001',
    name: 'Ultra-Thin Laptop Pro',
    description: 'Powerful ultrabook with latest generation processor, 16GB RAM, and 512GB SSD. Perfect for professionals and students.',
    price: 1299.99,
    compareAtPrice: 1699.99,
    category: 'electronics',
    subcategory: 'computers',
    brand: 'TechPro',
    images: [
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500',
    ],
    specifications: {
      processor: 'Intel Core i7',
      ram: '16GB',
      storage: '512GB SSD',
      display: '14-inch 2K',
      weight: '1.2kg',
    },
    inventory: {
      totalStock: 50,
      reservedStock: 0,
      availableStock: 50,
    },
    seo: {
      slug: 'ultra-thin-laptop-pro',
      metaTitle: 'Ultra-Thin Laptop Pro - Powerful & Portable',
      metaDescription: 'Lightweight laptop with powerful performance',
    },
    status: 'active',
    tags: ['laptop', 'ultrabook', 'portable', 'professional'],
    rating: { average: 4.6, count: 189 },
  },
  {
    sku: 'WATCH-001',
    name: 'Smart Fitness Watch',
    description: 'Track your fitness goals with GPS, heart rate monitor, sleep tracking, and 7-day battery life.',
    price: 199.99,
    compareAtPrice: 299.99,
    category: 'electronics',
    subcategory: 'wearables',
    brand: 'FitTech',
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
    ],
    specifications: {
      display: 'AMOLED',
      battery: '7 days',
      waterproof: 'IP68',
      sensors: 'GPS, Heart Rate, SpO2',
    },
    inventory: {
      totalStock: 200,
      reservedStock: 0,
      availableStock: 200,
    },
    seo: {
      slug: 'smart-fitness-watch',
      metaTitle: 'Smart Fitness Watch - Track Your Health',
      metaDescription: 'Advanced fitness tracking with heart rate and GPS',
    },
    status: 'active',
    tags: ['smartwatch', 'fitness', 'wearable', 'health'],
    rating: { average: 4.7, count: 567 },
  },
  {
    sku: 'CAMERA-001',
    name: 'Professional DSLR Camera',
    description: '24MP full-frame camera with 4K video recording. Includes 18-55mm kit lens. Perfect for photography enthusiasts.',
    price: 899.99,
    compareAtPrice: 1299.99,
    category: 'electronics',
    subcategory: 'cameras',
    brand: 'PhotoPro',
    images: [
      'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=500',
    ],
    specifications: {
      sensor: '24MP Full Frame',
      video: '4K @ 30fps',
      lens: '18-55mm Kit Lens',
      iso: '100-51200',
    },
    inventory: {
      totalStock: 30,
      reservedStock: 0,
      availableStock: 30,
    },
    seo: {
      slug: 'professional-dslr-camera',
      metaTitle: 'Professional DSLR Camera - 24MP Full Frame',
      metaDescription: 'Capture stunning photos with our professional DSLR',
    },
    status: 'active',
    tags: ['camera', 'dslr', 'photography', '4k'],
    rating: { average: 4.9, count: 234 },
  },
  {
    sku: 'TABLET-001',
    name: 'Pro Tablet 12.9"',
    description: 'Large screen tablet perfect for productivity and entertainment. Comes with stylus support and keyboard compatibility.',
    price: 799.99,
    compareAtPrice: 999.99,
    category: 'electronics',
    subcategory: 'tablets',
    brand: 'TechPro',
    images: [
      'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=500',
    ],
    specifications: {
      display: '12.9-inch Retina',
      storage: '256GB',
      connectivity: 'WiFi + 5G',
      stylus: 'Included',
    },
    inventory: {
      totalStock: 75,
      reservedStock: 0,
      availableStock: 75,
    },
    seo: {
      slug: 'pro-tablet-129',
      metaTitle: 'Pro Tablet 12.9" - Productivity & Entertainment',
      metaDescription: 'Large screen tablet for work and play',
    },
    status: 'active',
    tags: ['tablet', 'productivity', 'entertainment', 'stylus'],
    rating: { average: 4.5, count: 412 },
  },
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    console.log('');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🗑️  Clearing existing products...');
    await Product.deleteMany({});
    await FlashSale.deleteMany({});

    // Insert sample products
    console.log('📦 Inserting sample products...');
    const products = await Product.insertMany(sampleProducts);
    console.log(`✅ Inserted ${products.length} products`);

    // Create a flash sale
    console.log('⚡ Creating flash sale...');
    const flashSale = new FlashSale({
      name: 'Weekend Electronics Sale',
      description: 'Get up to 50% off on selected electronics this weekend!',
      startTime: new Date(Date.now() - 60 * 60 * 1000), // Started 1 hour ago
      endTime: new Date(Date.now() + 47 * 60 * 60 * 1000), // Ends in 47 hours
      status: 'active',
      products: [
        {
          productId: products[0]._id, // Headphones
          flashPrice: 199.99,
          originalPrice: 299.99,
          stockLimit: 50,
          soldCount: 0,
          maxPerUser: 2,
        },
        {
          productId: products[2]._id, // Smart Watch
          flashPrice: 149.99,
          originalPrice: 199.99,
          stockLimit: 100,
          soldCount: 0,
          maxPerUser: 1,
        },
        {
          productId: products[4]._id, // Tablet
          flashPrice: 599.99,
          originalPrice: 799.99,
          stockLimit: 30,
          soldCount: 0,
          maxPerUser: 1,
        },
      ],
      rules: {
        minPurchaseAmount: 0,
        maxDiscountPercentage: 50,
      },
    });

    await flashSale.save();
    console.log('✅ Flash sale created');

    console.log('');
    console.log('='.repeat(60));
    console.log('🎉 Database seeded successfully!');
    console.log('='.repeat(60));
    console.log('');
    console.log('Sample data created:');
    console.log(`  • ${products.length} products`);
    console.log(`  • 1 active flash sale with 3 products`);
    console.log('');
    console.log('You can now:');
    console.log('  1. Start the server: npm run dev');
    console.log('  2. Browse products: GET /api/products');
    console.log('  3. View flash sale products at discounted prices');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run seeding
seedDatabase();
