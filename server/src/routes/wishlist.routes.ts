import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import * as wishlist from '../controllers/wishlist.controller';

const router = Router();

router.use(authenticate);
router.get('/', asyncHandler(wishlist.getWishlist));
router.post('/:productId', asyncHandler(wishlist.toggleWishlist));
router.delete('/:productId', asyncHandler(wishlist.removeFromWishlist));

export default router;
