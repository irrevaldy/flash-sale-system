// src/routes/flashSaleRoutes.ts

import { Router } from 'express';
import {
  getStatus,
  reserveItem,
  confirmPurchase,
  checkPurchase,
  cancelReservation,
} from '../controllers/flashSaleController';

const router = Router();

router.get('/status',               getStatus);
router.post('/reserve',             reserveItem);
router.post('/confirm',             confirmPurchase);
router.get('/check/:userId',        checkPurchase);
router.post('/cancel-reservation',  cancelReservation);

export default router;
