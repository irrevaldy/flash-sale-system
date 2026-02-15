// src/controllers/orderController.ts

import { Request, Response } from 'express';
import Order from '../models/Order';
import Cart from '../models/Cart';
import Product from '../models/Product';
import FlashSale from '../models/FlashSale';
import mongoose from 'mongoose';

export class OrderController {
  /**
   * POST /api/orders/checkout
   * Create order from cart
   */
  async checkout(req: Request, res: Response): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { userId, shipping, payment } = req.body;

      // Validate input
      if (!userId || !shipping || !payment) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Get cart
      const cart = await Cart.findOne({ userId }).populate('items.productId').session(session);
      if (!cart || cart.items.length === 0) {
        res.status(400).json({ error: 'Cart is empty' });
        await session.abortTransaction();
        return;
      }

      // Validate stock and prepare order items
      const orderItems = [];
      let subtotal = 0;

      for (const cartItem of cart.items) {
        const product: any = cartItem.productId;

        // Check stock
        if (!product.isInStock(cartItem.quantity)) {
          res.status(400).json({
            error: `Insufficient stock for ${product.name}`,
          });
          await session.abortTransaction();
          return;
        }

        // Calculate price with discount
        let pricePerUnit = cartItem.priceAtAdd;
        let discountAmount = 0;

        if (cartItem.flashSaleId) {
          const flashSale = await FlashSale.findById(cartItem.flashSaleId).session(session);
          if (flashSale && flashSale.isActive()) {
            const flashProduct = flashSale.getProduct(product._id);
            if (flashProduct) {
              pricePerUnit = flashProduct.flashPrice;
              discountAmount = (product.price - flashProduct.flashPrice) * cartItem.quantity;
            }
          }
        }

        orderItems.push({
          productId: product._id,
          productSnapshot: {
            name: product.name,
            sku: product.sku,
            image: product.images[0] || '',
          },
          quantity: cartItem.quantity,
          pricePerUnit,
          flashSaleId: cartItem.flashSaleId,
          discountAmount,
        });

        subtotal += pricePerUnit * cartItem.quantity;

        // Reserve stock
        product.inventory.reservedStock += cartItem.quantity;
        product.inventory.totalStock -= cartItem.quantity;
        await product.save({ session });
      }

      // Calculate pricing
      const discount = orderItems.reduce((sum, item) => sum + item.discountAmount, 0);
      const tax = subtotal * 0.1; // 10% tax
      const shippingCost = subtotal > 50 ? 0 : 10;
      const total = subtotal + tax + shippingCost;

      // Generate order number
      const orderNumber = `FS-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

      // Create order
      const order = new Order({
        orderNumber,
        userId,
        status: 'pending',
        items: orderItems,
        pricing: {
          subtotal: Number(subtotal.toFixed(2)),
          discount: Number(discount.toFixed(2)),
          tax: Number(tax.toFixed(2)),
          shipping: Number(shippingCost.toFixed(2)),
          total: Number(total.toFixed(2)),
        },
        shipping,
        payment: {
          ...payment,
          status: 'pending',
        },
      });

      await order.save({ session });

      // Clear cart
      cart.clear();
      await cart.save({ session });

      // Commit transaction
      await session.commitTransaction();

      res.status(201).json({
        success: true,
        order,
        message: 'Order created successfully',
      });
    } catch (error) {
      await session.abortTransaction();
      console.error('Error during checkout:', error);
      res.status(500).json({
        error: 'Checkout failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      session.endSession();
    }
  }

  /**
   * GET /api/orders/:userId
   * Get user's orders
   */
  async getUserOrders(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      const [orders, total] = await Promise.all([
        Order.find({ userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Order.countDocuments({ userId }),
      ]);

      res.json({
        orders,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error('Error getting user orders:', error);
      res.status(500).json({
        error: 'Failed to get orders',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/orders/detail/:orderNumber
   * Get order by order number
   */
  async getOrder(req: Request, res: Response): Promise<void> {
    try {
      const { orderNumber } = req.params;

      const order = await Order.findOne({ orderNumber });

      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      res.json(order);
    } catch (error) {
      console.error('Error getting order:', error);
      res.status(500).json({
        error: 'Failed to get order',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * PUT /api/orders/:orderNumber/status
   * Update order status (Admin)
   */
  async updateOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      const { orderNumber } = req.params;
      const { status, note } = req.body;

      if (!status) {
        res.status(400).json({ error: 'Status is required' });
        return;
      }

      const order = await Order.findOne({ orderNumber });

      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      order.updateStatus(status, note);
      await order.save();

      res.json({
        success: true,
        order,
        message: 'Order status updated',
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({
        error: 'Failed to update order status',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/orders/:orderNumber/cancel
   * Cancel order
   */
  async cancelOrder(req: Request, res: Response): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { orderNumber } = req.params;
      const { reason } = req.body;

      const order = await Order.findOne({ orderNumber }).session(session);

      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        await session.abortTransaction();
        return;
      }

      if (!['pending', 'confirmed'].includes(order.status)) {
        res.status(400).json({ error: 'Order cannot be cancelled' });
        await session.abortTransaction();
        return;
      }

      // Restore stock
      for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.productId,
          {
            $inc: {
              'inventory.totalStock': item.quantity,
            },
          },
          { session }
        );
      }

      // Update order status
      order.updateStatus('cancelled', reason || 'Cancelled by user');
      await order.save({ session });

      await session.commitTransaction();

      res.json({
        success: true,
        order,
        message: 'Order cancelled successfully',
      });
    } catch (error) {
      await session.abortTransaction();
      console.error('Error cancelling order:', error);
      res.status(500).json({
        error: 'Failed to cancel order',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      session.endSession();
    }
  }

  /**
   * GET /api/orders/stats/:userId
   * Get user order statistics
   */
  async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const stats = await Order.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: '$pricing.total' },
            averageOrderValue: { $avg: '$pricing.total' },
          },
        },
      ]);

      res.json(stats[0] || { totalOrders: 0, totalSpent: 0, averageOrderValue: 0 });
    } catch (error) {
      console.error('Error getting user stats:', error);
      res.status(500).json({
        error: 'Failed to get user stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default new OrderController();
