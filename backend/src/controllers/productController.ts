// src/controllers/productController.ts
// v2.2 - Fixed sorting logic for all sort types

import { Request, Response } from 'express';
import Product from '../models/Product';
import redisClient from '../config/redis';

export class ProductController {
  /**
   * GET /api/products
   * Get all products with filters and pagination
   */
  async getProducts(req: Request, res: Response): Promise<void> {
    try {
      const {
        category,
        search,
        minPrice,
        maxPrice,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20,
      } = req.query;

      // Build filter query
      const filter: any = { status: 'active' };

      if (category) {
        filter.category = category;
      }

      // Search with regex
      if (search) {
        const searchRegex = new RegExp(search as string, 'i');
        filter.$or = [
          { name: searchRegex },
          { description: searchRegex },
          { tags: searchRegex },
          { brand: searchRegex },
        ];
      }

      if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = Number(minPrice);
        if (maxPrice) filter.price.$lte = Number(maxPrice);
      }

      // Calculate pagination
      const skip = (Number(page) - 1) * Number(limit);

      let sortObj: any = {};
      const sortField = sortBy as string;

      // Handle negative sort fields (e.g., "-price" for descending)
      if (sortField.startsWith('-')) {
        const field = sortField.substring(1);
        sortObj[field] = -1;
      } else {
        // Use sortOrder parameter
        sortObj[sortField] = sortOrder === 'asc' ? 1 : -1;
      }

      // Execute query
      const [products, total] = await Promise.all([
        Product.find(filter)
          .sort(sortObj)
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Product.countDocuments(filter),
      ]);

      res.json({
        products,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error('Error getting products:', error);
      res.status(500).json({
        error: 'Failed to get products',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/products/:id
   * Get single product by ID
   */
  async getProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Try cache first
      const cacheKey = `product:${id}`;
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        res.json(JSON.parse(cached));
        return;
      }

      // Get from database
      const product = await Product.findById(id);

      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      // Cache for 5 minutes
      await redisClient.set(cacheKey, JSON.stringify(product), 'EX', 300);

      res.json(product);
    } catch (error) {
      console.error('Error getting product:', error);
      res.status(500).json({
        error: 'Failed to get product',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/products/slug/:slug
   * Get product by slug
   */
  async getProductBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;

      const product = await Product.findOne({
        'seo.slug': slug,
        status: 'active',
      });

      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      res.json(product);
    } catch (error) {
      console.error('Error getting product by slug:', error);
      res.status(500).json({
        error: 'Failed to get product',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/products/categories
   * Get all categories
   */
  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await Product.distinct('category', {
        status: 'active',
      });
      res.json({ categories });
    } catch (error) {
      console.error('Error getting categories:', error);
      res.status(500).json({
        error: 'Failed to get categories',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/products (Admin only)
   * Create new product
   */
  async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const productData = req.body;

      // Generate slug from name if not provided
      if (!productData.seo?.slug) {
        productData.seo = {
          ...productData.seo,
          slug: productData.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, ''),
        };
      }

      const product = new Product(productData);
      await product.save();

      res.status(201).json({
        success: true,
        product,
      });
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({
        error: 'Failed to create product',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * PUT /api/products/:id (Admin only)
   * Update product
   */
  async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      const product = await Product.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      // Invalidate cache
      await redisClient.del(`product:${id}`);

      res.json({
        success: true,
        product,
      });
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({
        error: 'Failed to update product',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * DELETE /api/products/:id (Admin only)
   * Soft delete product (set status to inactive)
   */
  async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const product = await Product.findByIdAndUpdate(
        id,
        { $set: { status: 'inactive' } },
        { new: true }
      );

      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      // Invalidate cache
      await redisClient.del(`product:${id}`);

      res.json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({
        error: 'Failed to delete product',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default new ProductController();
