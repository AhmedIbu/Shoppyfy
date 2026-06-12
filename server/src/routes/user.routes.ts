import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';
import * as users from '../controllers/user.controller';

const router = Router();

router.use(authenticate);
router.patch('/profile', asyncHandler(users.updateProfile));
router.post('/avatar', upload.single('avatar'), asyncHandler(users.uploadAvatar));
router.patch('/password', asyncHandler(users.changePassword));

router.delete('/me', asyncHandler(users.deleteMe));

router.get('/addresses', asyncHandler(users.listAddresses));
router.post('/addresses', asyncHandler(users.createAddress));
router.patch('/addresses/:id', asyncHandler(users.updateAddress));
router.delete('/addresses/:id', asyncHandler(users.deleteAddress));

export default router;
