import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { listCategories } from '../controllers/product.controller';

const router = Router();

router.get('/', asyncHandler(listCategories));

export default router;
