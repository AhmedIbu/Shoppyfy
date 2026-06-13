import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env';
import { notFound, errorHandler } from './middleware/error';
import { razorpayWebhook } from './controllers/checkout.controller';
import { asyncHandler } from './utils/asyncHandler';

import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import categoryRoutes from './routes/category.routes';
import cartRoutes from './routes/cart.routes';
import wishlistRoutes from './routes/wishlist.routes';
import orderRoutes from './routes/order.routes';
import checkoutRoutes from './routes/checkout.routes';
import userRoutes from './routes/user.routes';
import adminRoutes from './routes/admin.routes';
import newsletterRoutes from './routes/newsletter.routes';

const app = express();

app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(cookieParser());
if (!env.isProd) app.use(morgan('dev'));

// Razorpay webhook needs the raw body for signature verification — mount before express.json()
app.post('/api/webhooks/razorpay', express.raw({ type: 'application/json' }), asyncHandler(razorpayWebhook));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'semmai-api' }));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/newsletter', newsletterRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
