// src/routes/paymentRoutes.ts
import express from 'express';
import { createPaymentIntent, handleWebhook } from '../controllers/paymentController';

const router = express.Router();

// Webhook must use raw body — register BEFORE json middleware
// (In app.ts, mount this route before express.json())
router.post('/webhook', express.raw({ type: 'application/json' }),
  handleWebhook
);

// Create payment intent
router.post('/create-payment-intent', express.json(), createPaymentIntent);

export default router;
