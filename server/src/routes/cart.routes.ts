import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import * as cart from '../controllers/cart.controller';

const router = Router();

router.use(authenticate);
router.get('/', asyncHandler(cart.getCart));
router.post('/items', asyncHandler(cart.addItem));
router.patch('/items/:itemId', asyncHandler(cart.updateItem));
router.delete('/items/:itemId', asyncHandler(cart.removeItem));
router.delete('/', asyncHandler(cart.clearCart));

export default router;
