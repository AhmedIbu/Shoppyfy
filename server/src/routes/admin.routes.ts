import { Router } from 'express';
import { Role } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate, authorize } from '../middleware/auth';
import * as admin from '../controllers/admin.controller';

const router = Router();

router.use(authenticate, authorize(Role.ADMIN));
router.get('/stats', asyncHandler(admin.adminStats));
router.get('/users', asyncHandler(admin.listUsers));
router.patch('/users/:id/role', asyncHandler(admin.updateUserRole));
router.delete('/users/:id', asyncHandler(admin.deleteUser));
router.get('/orders', asyncHandler(admin.listAllOrders));
router.patch('/orders/:id', asyncHandler(admin.updateOrder));
router.get('/products', asyncHandler(admin.listAllProducts));

export default router;
