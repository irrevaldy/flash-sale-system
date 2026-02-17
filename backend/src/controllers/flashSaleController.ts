// src/controllers/flashSaleController.ts
// Full flow: status → reserve → confirm (after payment)

import { Request, Response } from 'express';
import Product from '../models/Product';
import FlashSalePurchase from '../models/FlashSalePurchase';
import FlashSaleReservation from '../models/FlashSaleReservation';
import { FLASH_SALE_CONFIG, getFlashSaleStatus } from '../config/flashSaleConfig';

const RESERVATION_MINUTES = 10;

async function getEffectiveSoldCount(): Promise<number> {
  const [purchases, reservations] = await Promise.all([
    FlashSalePurchase.countDocuments({ productId: FLASH_SALE_CONFIG.productId }),
    FlashSaleReservation.countDocuments({
      productId: FLASH_SALE_CONFIG.productId,
      status: 'reserved',
      expiresAt: { $gt: new Date() },
    }),
  ]);
  return purchases + reservations;
}

// ─────────────────────────────────────────────
// GET /api/flash-sale/status
// ─────────────────────────────────────────────
export const getStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = getFlashSaleStatus();
    const soldCount = await getEffectiveSoldCount();
    const remaining = Math.max(0, FLASH_SALE_CONFIG.totalStock - soldCount);
    const product = await Product.findById(FLASH_SALE_CONFIG.productId).lean();

    res.json({
      status,
      startTime:  FLASH_SALE_CONFIG.startTime,
      endTime:    FLASH_SALE_CONFIG.endTime,
      totalStock: FLASH_SALE_CONFIG.totalStock,
      remaining,
      soldOut:    remaining === 0,
      flashPrice: FLASH_SALE_CONFIG.flashPrice,
      product: product ? {
        _id:           product._id,
        name:          product.name,
        images:        (product as any).images,
        category:      (product as any).category,
        originalPrice: product.price,
        flashPrice:    FLASH_SALE_CONFIG.flashPrice,
      } : null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// POST /api/flash-sale/reserve
// Soft-locks one item for 10 mins while user completes checkout
// ─────────────────────────────────────────────
export const reserveItem = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.body;
  if (!userId) { res.status(400).json({ success: false, error: 'userId is required' }); return; }

  try {
    const status = getFlashSaleStatus();
    if (status === 'upcoming') {
      res.status(400).json({ success: false, error: 'Sale has not started yet.', status, startTime: FLASH_SALE_CONFIG.startTime });
      return;
    }
    if (status === 'ended') {
      res.status(400).json({ success: false, error: 'Sale has ended.', status });
      return;
    }

    // Already confirmed purchase?
    const existing = await FlashSalePurchase.findOne({ userId, productId: FLASH_SALE_CONFIG.productId });
    if (existing) {
      res.status(400).json({ success: false, error: 'You have already purchased this item.', alreadyPurchased: true });
      return;
    }

    // Already has active reservation? Return it so checkout can continue
    const activeReservation = await FlashSaleReservation.findOne({
      userId,
      productId: FLASH_SALE_CONFIG.productId,
      status: 'reserved',
      expiresAt: { $gt: new Date() },
    });
    if (activeReservation) {
      const product = await Product.findById(FLASH_SALE_CONFIG.productId).lean();
      res.json({
        success: true,
        alreadyReserved: true,
        reservation: { reservationId: activeReservation._id, expiresAt: activeReservation.expiresAt },
        flashPrice: FLASH_SALE_CONFIG.flashPrice,
        product,
      });
      return;
    }

    // Stock check
    const soldCount = await getEffectiveSoldCount();
    if (soldCount >= FLASH_SALE_CONFIG.totalStock) {
      res.status(400).json({ success: false, error: 'Sorry, this item is sold out.', soldOut: true });
      return;
    }

    // Create reservation
    const expiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60_000);
    const reservation = await FlashSaleReservation.create({
      userId,
      productId: FLASH_SALE_CONFIG.productId,
      expiresAt,
      status: 'reserved',
    });

    const product = await Product.findById(FLASH_SALE_CONFIG.productId).lean();

    res.status(201).json({
      success: true,
      message: `Item reserved! Complete checkout within ${RESERVATION_MINUTES} minutes.`,
      reservation: { reservationId: reservation._id, expiresAt: reservation.expiresAt },
      flashPrice: FLASH_SALE_CONFIG.flashPrice,
      product,
    });
  } catch (error: any) {
    console.error('Reserve error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────
// POST /api/flash-sale/confirm
// Called after Stripe payment succeeds
// ─────────────────────────────────────────────
export const confirmPurchase = async (req: Request, res: Response): Promise<void> => {
  const { userId, stripePaymentIntentId } = req.body;
  if (!userId) { res.status(400).json({ success: false, error: 'userId is required' }); return; }

  try {
    const reservation = await FlashSaleReservation.findOne({
      userId,
      productId: FLASH_SALE_CONFIG.productId,
      status: 'reserved',
      expiresAt: { $gt: new Date() },
    });

    if (!reservation) {
      const existing = await FlashSalePurchase.findOne({ userId, productId: FLASH_SALE_CONFIG.productId });
      if (existing) { res.json({ success: true, alreadyConfirmed: true }); return; }
      res.status(400).json({ success: false, error: 'Reservation expired. Please try again.' });
      return;
    }

    await FlashSaleReservation.findByIdAndUpdate(reservation._id, {
      status: 'confirmed',
      stripePaymentIntentId,
    });

    await FlashSalePurchase.create({
      userId,
      productId: FLASH_SALE_CONFIG.productId,
      quantity: 1,
      price: FLASH_SALE_CONFIG.flashPrice,
      stripePaymentIntentId,
    });

    res.json({ success: true, message: 'Flash sale purchase confirmed!' });
  } catch (error: any) {
    if (error.code === 11000) { res.json({ success: true, alreadyConfirmed: true }); return; }
    console.error('Confirm error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────
// GET /api/flash-sale/check/:userId
// ─────────────────────────────────────────────
export const checkPurchase = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;
  try {
    const [purchase, reservation] = await Promise.all([
      FlashSalePurchase.findOne({ userId, productId: FLASH_SALE_CONFIG.productId }),
      FlashSaleReservation.findOne({
        userId,
        productId: FLASH_SALE_CONFIG.productId,
        status: 'reserved',
        expiresAt: { $gt: new Date() },
      }),
    ]);

    res.json({
      hasPurchased:   !!purchase,
      hasReservation: !!reservation,
      purchase:    purchase    ? { userId: purchase.userId, price: purchase.price, purchasedAt: purchase.purchasedAt } : null,
      reservation: reservation ? { expiresAt: reservation.expiresAt } : null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// POST /api/flash-sale/cancel-reservation
// ─────────────────────────────────────────────
export const cancelReservation = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.body;
  try {
    await FlashSaleReservation.updateMany(
      { userId, productId: FLASH_SALE_CONFIG.productId, status: 'reserved' },
      { status: 'cancelled' }
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
