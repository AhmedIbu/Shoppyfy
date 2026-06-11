import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import { createPaymentIntent } from '../controllers/checkout.controller';

const router = Router();

router.post('/create-payment-intent', authenticate, asyncHandler(createPaymentIntent));

export default router;
