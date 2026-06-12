import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { subscribe } from '../controllers/newsletter.controller';

const router = Router();

router.post('/', asyncHandler(subscribe));

export default router;
