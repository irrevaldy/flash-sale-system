import mongoose from 'mongoose';
import dotenv from 'dotenv';

import User from '../models/User';
import Product from '../models/Product';
import Cart from '../models/Cart';
import Order from '../models/Order';
import FlashSale from '../models/FlashSale';

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ MongoDB connected');

    console.log('🧹 Clearing old data...');
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Cart.deleteMany({}),
      Order.deleteMany({}),
      FlashSale.deleteMany({}),
    ]);

    /* =========================
       USERS
    ========================== */

    const user = await User.create({
      email: 'john@example.com',
      passwordHash: '123456',
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+123456789',
      },
      addresses: [
        {
          type: 'shipping',
          firstName: 'John',
          lastName: 'Doe',
          street: '123 Main Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA',
          phone: '+123456789',
          isDefault: true,
        },
      ],
      tier: 'standard',
    });

    console.log('👤 User seeded');

    /* =========================
       PRODUCTS
    ========================== */

    const product1 = await Product.create({
      sku: 'SKU001',
      name: 'iPhone 15 Pro',
      description: 'Latest Apple smartphone with A17 chip',
      price: 1200,
      compareAtPrice: 1300,
      category: 'Electronics',
      subcategory: 'Smartphones',
      brand: 'Apple',
      images: [],
      specifications: {
        color: 'Black',
        storage: '256GB',
      },
      inventory: {
        totalStock: 100,
        reservedStock: 0,
        availableStock: 100,
      },
      seo: {
        slug: 'iphone-15-pro',
        metaTitle: 'Buy iPhone 15 Pro',
        metaDescription: 'Best price for iPhone 15 Pro',
      },
      status: 'active',
      tags: ['phone', 'apple'],
      rating: {
        average: 4.8,
        count: 120,
      },
    });

    const product2 = await Product.create({
      sku: 'SKU002',
      name: 'Gaming Laptop RTX',
      description: 'High performance RTX gaming laptop',
      price: 2000,
      compareAtPrice: 2200,
      category: 'Electronics',
      subcategory: 'Laptop',
      brand: 'Asus',
      images: [],
      specifications: {
        ram: '32GB',
        storage: '1TB SSD',
      },
      inventory: {
        totalStock: 50,
        reservedStock: 0,
        availableStock: 50,
      },
      seo: {
        slug: 'gaming-laptop-rtx',
      },
      status: 'active',
      tags: ['laptop', 'gaming'],
      rating: {
        average: 4.6,
        count: 80,
      },
    });

    console.log('📦 Products seeded');

    /* =========================
       FLASH SALE (ACTIVE)
    ========================== */

    const now = new Date();

    const flashSale = await FlashSale.create({
      name: 'Mega Flash Sale',
      description: 'Limited time mega discount',
      startTime: new Date(now.getTime() - 1000 * 60 * 10),
      endTime: new Date(now.getTime() + 1000 * 60 * 60),
      status: 'active',
      products: [
        {
          productId: product1._id,
          flashPrice: 999,
          originalPrice: product1.price,
          stockLimit: 20,
          soldCount: 0,
          maxPerUser: 2,
        },
      ],
      rules: {
        minPurchaseAmount: 0,
        maxDiscountPercentage: 70,
      },
    });

    console.log('⚡ Flash sale seeded');

    /* =========================
       CART
    ========================== */

    const cart = await Cart.create({
      userId: user._id.toString(), // IMPORTANT: string
      items: [
        {
          productId: product1._id,
          quantity: 1,
          priceAtAdd: 999,
          flashSaleId: flashSale._id,
          addedAt: new Date(),
        },
      ],
    });

    console.log('🛒 Cart seeded');

    /* =========================
       ORDER
    ========================== */

    const order = await Order.create({
      userId: user._id.toString(), // string
      items: [
        {
          productId: product1._id,
          quantity: 1,
          price: 999,
        },
      ],
      totalAmount: 999,
      status: 'paid',
      notes: 'Flash sale purchase',
    });

    console.log('🧾 Order seeded');

    console.log('🎉 Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seed();
