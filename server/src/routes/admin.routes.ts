import { Router } from 'express';
import { Role } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';
import * as admin from '../controllers/admin.controller';

const router = Router();

router.use(authenticate, authorize(Role.ADMIN));
router.get('/stats', asyncHandler(admin.adminStats));
router.get('/users', asyncHandler(admin.listUsers));
router.patch('/users/:id/role', asyncHandler(admin.updateUserRole));
router.delete('/users/:id', asyncHandler(admin.deleteUser));
router.get('/orders', asyncHandler(admin.listAllOrders));
router.patch('/orders/:id', asyncHandler(admin.updateOrder));

// Catalog authoring
router.get('/products', asyncHandler(admin.listAllProducts));
// upload.any() — product images arrive under per-variant field names (variant_0, …)
router.post('/products', upload.any(), asyncHandler(admin.createProduct));
router.patch('/products/:id', upload.any(), asyncHandler(admin.updateProduct));
router.delete('/products/:id', asyncHandler(admin.deleteProduct));

router.post('/categories', upload.array('image', 1), asyncHandler(admin.createCategory));
router.patch('/categories/:id', upload.array('image', 1), asyncHandler(admin.updateCategory));
router.delete('/categories/:id', asyncHandler(admin.deleteCategory));

export default router;
