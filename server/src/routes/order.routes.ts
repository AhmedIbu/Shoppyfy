import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import * as orders from '../controllers/order.controller';
import { confirmOrder } from '../controllers/checkout.controller';

const router = Router();

router.use(authenticate);
router.get('/', asyncHandler(orders.getMyOrders));
router.get('/:id', asyncHandler(orders.getOrder));
router.post('/:id/confirm', asyncHandler(confirmOrder));
router.post('/:id/cancel', asyncHandler(orders.cancelOrder));

export default router;
