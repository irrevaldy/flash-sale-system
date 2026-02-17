// src/controllers/paymentController.ts
// Stripe payment integration (FIXED: raw webhook body + update Order status)

import Stripe from 'stripe';
import { Request, Response } from 'express';
import Order from '../models/Order';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

// ─────────────────────────────────────────────
// POST /api/payments/create-payment-intent
// ─────────────────────────────────────────────
export const createPaymentIntent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, currency = 'usd' } = req.body;

    if (!amount || amount <= 0) {
      res.status(400).json({ error: 'Invalid amount' });
      return;
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(amount) * 100), // convert to cents
      currency,
      automatic_payment_methods: { enabled: true },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error('Stripe error (createPaymentIntent):', error);
    res.status(500).json({ error: error.message || 'Stripe error' });
  }
};

// ─────────────────────────────────────────────
// POST /api/payments/webhook
// IMPORTANT: This route MUST be mounted with express.raw({ type: 'application/json' })
// ─────────────────────────────────────────────
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'];

  // Debug: confirm we received RAW body (Buffer)
  console.log('✅ Stripe webhook hit');
  console.log('Body is Buffer:', Buffer.isBuffer(req.body));

  if (!sig) {
    res.status(400).json({ error: 'Missing stripe-signature header' });
    return;
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    res.status(500).json({ error: 'Missing STRIPE_WEBHOOK_SECRET in server env' });
    return;
  }

  let event: Stripe.Event;

  try {
    // ✅ req.body MUST be the raw Buffer here
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      sig as string,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).json({ error: `Webhook Error: ${err.message}` });
    return;
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.log(`✅ Payment succeeded: ${pi.id}`);

        // ✅ Update order by PaymentIntent ID
        const updated = await Order.findOneAndUpdate(
          { 'payment.stripePaymentIntentId': pi.id },
          {
            $set: {
              status: 'confirmed',
              'payment.status': 'paid',
              'payment.paidAt': new Date(),
              'payment.transactionId': pi.latest_charge?.toString(),
            },
            $push: {
              timeline: {
                status: 'confirmed',
                timestamp: new Date(),
                note: 'Payment confirmed by Stripe webhook',
              },
            },
          },
          { new: true }
        );

        if (!updated) {
          console.warn(`⚠️ No order found for payment_intent ${pi.id}. Did you save stripePaymentIntentId in Order.payment?`);
        }

        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.log(`❌ Payment failed: ${pi.id}`);

        const updated = await Order.findOneAndUpdate(
          { 'payment.stripePaymentIntentId': pi.id },
          {
            $set: {
              'payment.status': 'failed',
            },
            $push: {
              timeline: {
                status: 'pending',
                timestamp: new Date(),
                note: 'Payment failed (Stripe webhook)',
              },
            },
          },
          { new: true }
        );

        if (!updated) {
          console.warn(`⚠️ No order found for payment_intent ${pi.id}.`);
        }

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (dbErr: any) {
    console.error('Webhook handler error (DB update):', dbErr);
    // Stripe expects a 2xx for successful receipt; if your DB fails you can return 500
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};
