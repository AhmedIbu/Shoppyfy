import { Router } from 'express';
import { Role } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';
import * as seller from '../controllers/seller.controller';

const router = Router();

router.use(authenticate, authorize(Role.SELLER));
router.get('/stats', asyncHandler(seller.sellerStats));
router.get('/products', asyncHandler(seller.listMyProducts));
router.post('/products', upload.array('images', 6), asyncHandler(seller.createProduct));
router.patch('/products/:id', upload.array('images', 6), asyncHandler(seller.updateProduct));
router.delete('/products/:id', asyncHandler(seller.deleteProduct));
router.get('/orders', asyncHandler(seller.listMySales));

export default router;
