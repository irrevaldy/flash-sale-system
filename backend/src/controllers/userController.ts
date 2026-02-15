// src/controllers/userController.ts

import { Request, Response } from 'express';
import User from '../models/User';
import Order from '../models/Order';

export class UserController {
  /**
   * POST /api/users/register
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName, phone } = req.body;

      if (!email || !password || !firstName || !lastName) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const emailNormalized = Array.isArray(email) ? email[0].toLowerCase() : email.toLowerCase();

      const existingUser = await User.findOne({ email: emailNormalized });
      if (existingUser) {
        res.status(400).json({ error: 'Email already registered' });
        return;
      }

      const user = new User({
        email: emailNormalized,
        passwordHash: password,
        profile: { firstName, lastName, phone },
      });

      await user.save();

      const userResponse = user.toObject();
      delete (userResponse as any).passwordHash;

      res.status(201).json({
        success: true,
        user: userResponse,
        message: 'User registered successfully',
      });
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).json({
        error: 'Failed to register user',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/users/login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password required' });
        return;
      }

      const emailNormalized = Array.isArray(email) ? email[0].toLowerCase() : email.toLowerCase();

      const user = await User.findOne({ email: emailNormalized });
      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      user.lastLoginAt = new Date();
      await user.save();

      const userResponse = user.toObject();
      delete (userResponse as any).passwordHash;

      res.json({
        success: true,
        user: userResponse,
        message: 'Login successful',
      });
    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({
        error: 'Login failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/users/:email
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const email = req.params.email;
      const emailNormalized = Array.isArray(email) ? email[0].toLowerCase() : email.toLowerCase();

      const user = await User.findOne({ email: emailNormalized }).select('-passwordHash');
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json(user);
    } catch (error) {
      console.error('Error getting profile:', error);
      res.status(500).json({
        error: 'Failed to get profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * PUT /api/users/:email
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const email = req.params.email;
      const emailNormalized = Array.isArray(email) ? email[0].toLowerCase() : email.toLowerCase();

      const updates = req.body;
      delete updates.passwordHash;
      delete updates.email;

      const user = await User.findOneAndUpdate(
        { email: emailNormalized },
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-passwordHash');

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        success: true,
        user,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({
        error: 'Failed to update profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/users/:email/addresses
   */
  async addAddress(req: Request, res: Response): Promise<void> {
    try {
      const email = req.params.email;
      const emailNormalized = Array.isArray(email) ? email[0].toLowerCase() : email.toLowerCase();

      const address = req.body;

      const user = await User.findOne({ email: emailNormalized });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (address.isDefault) {
        user.addresses.forEach(addr => (addr.isDefault = false));
      }

      user.addresses.push(address);
      await user.save();

      res.json({
        success: true,
        addresses: user.addresses,
        message: 'Address added successfully',
      });
    } catch (error) {
      console.error('Error adding address:', error);
      res.status(500).json({
        error: 'Failed to add address',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * DELETE /api/users/:email/addresses/:addressId
   */
  async removeAddress(req: Request, res: Response): Promise<void> {
    try {
      const email = req.params.email;
      const emailNormalized = Array.isArray(email) ? email[0].toLowerCase() : email.toLowerCase();

      const { addressId } = req.params;

      const user = await User.findOne({ email: emailNormalized });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      user.addresses = user.addresses.filter(addr => addr._id?.toString() !== addressId);
      await user.save();

      res.json({
        success: true,
        addresses: user.addresses,
        message: 'Address removed successfully',
      });
    } catch (error) {
      console.error('Error removing address:', error);
      res.status(500).json({
        error: 'Failed to remove address',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/users/:email/dashboard
   */
  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const email = req.params.email;
      const emailNormalized = Array.isArray(email) ? email[0].toLowerCase() : email.toLowerCase();

      const user = await User.findOne({ email: emailNormalized }).select('-passwordHash');
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const recentOrders = await Order.find({ userId: emailNormalized })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      const orderStats = await Order.aggregate([
        { $match: { userId: emailNormalized } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);

      res.json({
        user,
        recentOrders,
        orderStats,
        stats: user.stats,
      });
    } catch (error) {
      console.error('Error getting dashboard:', error);
      res.status(500).json({
        error: 'Failed to get dashboard',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default new UserController();
