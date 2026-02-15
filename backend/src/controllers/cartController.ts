// src/controllers/cartController.ts

import { Request, Response } from 'express';
import Cart from '../models/Cart';
import Product from '../models/Product';
import FlashSale from '../models/FlashSale';

export class CartController {
  /**
   * GET /api/cart/:userId
   * Get user's cart
   */
  async getCart(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      let cart = await Cart.findOne({ userId }).populate('items.productId');

      if (!cart) {
        // Create empty cart if doesn't exist
        cart = new Cart({ userId, items: [] });
        await cart.save();
      }

      res.json(cart);
    } catch (error) {
      console.error('Error getting cart:', error);
      res.status(500).json({
        error: 'Failed to get cart',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/cart/:userId/items
   * Add item to cart
   */
  async addToCart(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { productId, quantity = 1, flashSaleId } = req.body;

      if (!productId) {
        res.status(400).json({ error: 'Product ID is required' });
        return;
      }

      // Check if product exists and is in stock
      const product = await Product.findById(productId);
      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      if (!product.isInStock(quantity)) {
        res.status(400).json({ error: 'Insufficient stock' });
        return;
      }

      // Determine price (flash sale or regular)
      let price = product.price;
      if (flashSaleId) {
        const flashSale = await FlashSale.findById(flashSaleId);
        if (flashSale && flashSale.isActive()) {
          const flashProduct = flashSale.getProduct(productId);
          if (flashProduct) {
            price = flashProduct.flashPrice;
          }
        }
      }

      // Find or create cart
      let cart = await Cart.findOne({ userId });
      if (!cart) {
        cart = new Cart({ userId });
      }

      // Add item
      cart.addItem(productId, quantity, price, flashSaleId);
      await cart.save();

      // Populate and return
      await cart.populate('items.productId');
      
      res.json({
        success: true,
        cart,
        message: 'Item added to cart',
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      res.status(500).json({
        error: 'Failed to add to cart',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * PUT /api/cart/:userId/items/:productId
   * Update cart item quantity
   */
  async updateCartItem(req: Request, res: Response): Promise<void> {
    try {
      const { userId, productId } = req.params;
      const { quantity } = req.body;

      if (quantity === undefined) {
        res.status(400).json({ error: 'Quantity is required' });
        return;
      }

      const cart = await Cart.findOne({ userId });
      if (!cart) {
        res.status(404).json({ error: 'Cart not found' });
        return;
      }

      // Check stock before updating
      if (quantity > 0) {
        const product = await Product.findById(productId);
        if (!product || !product.isInStock(quantity)) {
          res.status(400).json({ error: 'Insufficient stock' });
          return;
        }
      }

      cart.updateItemQuantity(productId as any, quantity);
      await cart.save();
      await cart.populate('items.productId');

      res.json({
        success: true,
        cart,
        message: 'Cart updated',
      });
    } catch (error) {
      console.error('Error updating cart:', error);
      res.status(500).json({
        error: 'Failed to update cart',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * DELETE /api/cart/:userId/items/:productId
   * Remove item from cart
   */
  async removeFromCart(req: Request, res: Response): Promise<void> {
    try {
      const { userId, productId } = req.params;

      const cart = await Cart.findOne({ userId });
      if (!cart) {
        res.status(404).json({ error: 'Cart not found' });
        return;
      }

      cart.removeItem(productId as any);
      await cart.save();
      await cart.populate('items.productId');

      res.json({
        success: true,
        cart,
        message: 'Item removed from cart',
      });
    } catch (error) {
      console.error('Error removing from cart:', error);
      res.status(500).json({
        error: 'Failed to remove from cart',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * DELETE /api/cart/:userId
   * Clear cart
   */
  async clearCart(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const cart = await Cart.findOne({ userId });
      if (!cart) {
        res.status(404).json({ error: 'Cart not found' });
        return;
      }

      cart.clear();
      await cart.save();

      res.json({
        success: true,
        cart,
        message: 'Cart cleared',
      });
    } catch (error) {
      console.error('Error clearing cart:', error);
      res.status(500).json({
        error: 'Failed to clear cart',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/cart/:userId/summary
   * Get cart summary with totals
   */
  async getCartSummary(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const cart = await Cart.findOne({ userId }).populate('items.productId');
      
      if (!cart) {
        res.json({
          items: [],
          subtotal: 0,
          tax: 0,
          shipping: 0,
          total: 0,
        });
        return;
      }

      const subtotal = cart.getTotal();
      const tax = subtotal * 0.1; // 10% tax
      const shipping = subtotal > 50 ? 0 : 10; // Free shipping over $50
      const total = subtotal + tax + shipping;

      res.json({
        items: cart.items,
        subtotal: Number(subtotal.toFixed(2)),
        tax: Number(tax.toFixed(2)),
        shipping: Number(shipping.toFixed(2)),
        total: Number(total.toFixed(2)),
      });
    } catch (error) {
      console.error('Error getting cart summary:', error);
      res.status(500).json({
        error: 'Failed to get cart summary',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default new CartController();
