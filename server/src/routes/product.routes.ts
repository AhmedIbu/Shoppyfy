import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import * as products from '../controllers/product.controller';

const router = Router();

router.get('/', asyncHandler(products.listProducts));
router.get('/:idOrSlug', asyncHandler(products.getProduct));
router.post('/:productId/reviews', authenticate, asyncHandler(products.createReview));

export default router;
