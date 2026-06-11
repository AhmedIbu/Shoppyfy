import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import * as auth from '../controllers/auth.controller';

const router = Router();

router.post('/register', asyncHandler(auth.register));
router.post('/login', asyncHandler(auth.login));
router.post('/refresh', asyncHandler(auth.refresh));
router.post('/logout', asyncHandler(auth.logout));
router.get('/me', authenticate, asyncHandler(auth.me));
router.post('/forgot-password', asyncHandler(auth.forgotPassword));
router.post('/reset-password', asyncHandler(auth.resetPassword));

export default router;
