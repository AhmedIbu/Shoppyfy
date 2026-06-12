import crypto from 'crypto';
import { Request, Response } from 'express';
import { z } from 'zod';
import { OrderStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { razorpay } from '../config/razorpay';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { sendEmail, emails } from '../config/resend';

const SHIPPING_FLAT = 12;
const FREE_SHIPPING_THRESHOLD = 250;
const TAX_RATE = 0.08;

const orderNumber = () =>
  `SHP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')}`;

const addressSchema = z.object({
  fullName: z.string().min(1),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(2).default('US'),
  phone: z.string().optional(),
});

const checkoutSchema = z.union([
  z.object({ addressId: z.string().min(1) }),
  z.object({ address: addressSchema, saveAddress: z.boolean().optional() }),
]);

export const createPaymentIntent = async (req: Request, res: Response) => {
  const body = checkoutSchema.parse(req.body);
  const userId = req.user!.userId;

  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: { include: { product: true } } },
  });
  if (!cart || cart.items.length === 0) throw ApiError.badRequest('Your cart is empty');

  for (const item of cart.items) {
    if (!item.product.isActive) throw ApiError.badRequest(`${item.product.name} is no longer available`);
    if (item.product.stock < item.quantity) {
      throw ApiError.badRequest(`Only ${item.product.stock} left of ${item.product.name}`);
    }
  }

  let ship: z.infer<typeof addressSchema>;
  if ('addressId' in body) {
    const address = await prisma.address.findUnique({ where: { id: body.addressId } });
    if (!address || address.userId !== userId) throw ApiError.notFound('Address not found');
    ship = {
      fullName: address.fullName,
      line1: address.line1,
      line2: address.line2 ?? undefined,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone ?? undefined,
    };
  } else {
    ship = body.address;
    if (body.saveAddress) {
      await prisma.address.create({ data: { userId, ...ship } });
    }
  }

  const subtotal = cart.items.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0
  );
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + shipping + tax) * 100) / 100;

  const order = await prisma.order.create({
    data: {
      orderNumber: orderNumber(),
      userId,
      status: OrderStatus.PENDING,
      subtotal,
      shipping,
      tax,
      total,
      shipFullName: ship.fullName,
      shipLine1: ship.line1,
      shipLine2: ship.line2,
      shipCity: ship.city,
      shipState: ship.state,
      shipPostalCode: ship.postalCode,
      shipCountry: ship.country,
      shipPhone: ship.phone,
      items: {
        create: cart.items.map((item) => ({
          productId: item.productId,
          productName: item.product.name,
          imageUrl: item.product.images[0] ?? null,
          price: item.product.price,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
        })),
      },
    },
    include: { items: true },
  });

  // Razorpay amounts are in paise (₹1 = 100 paise)
  const rzpOrder = await razorpay.orders.create({
    amount: Math.round(total * 100),
    currency: 'INR',
    receipt: order.orderNumber,
    notes: { orderId: order.id, orderNumber: order.orderNumber, userId },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { razorpayOrderId: rzpOrder.id },
  });

  res.status(201).json({
    razorpayOrderId: rzpOrder.id,
    keyId: env.razorpay.keyId,
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: total,
  });
};

/** Marks an order paid: decrement stock, clear the buyer's cart. Idempotent. */
const fulfillOrder = async (orderId: string) => {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || order.status !== OrderStatus.PENDING) return order;

  const fulfilled = await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      if (item.productId) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }
    await tx.cartItem.deleteMany({ where: { cart: { userId: order.userId } } });
    return tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.PAID,
        estimatedDelivery: new Date(Date.now() + 5 * 24 * 3600 * 1000),
      },
    });
  });

  // Send order confirmation email (non-blocking)
  prisma.user
    .findUnique({ where: { id: order.userId }, select: { email: true } })
    .then((user) => {
      if (!user) return;
      const itemLines = order.items
        .map(
          (i) =>
            `<div class="item">${i.productName} × ${i.quantity} — ₹${Number(i.price).toFixed(2)}</div>`
        )
        .join('');
      return sendEmail(
        user.email,
        `SEMMAI — Order confirmed #${order.orderNumber}`,
        emails.orderConfirmed(order.orderNumber, itemLines, `₹${Number(order.total).toFixed(2)}`)
      );
    })
    .catch((err) => console.error('[email] order confirmed:', err));

  return fulfilled;
};

const confirmSchema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export const confirmOrder = async (req: Request, res: Response) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = confirmSchema.parse(
    req.body
  );

  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order || order.userId !== req.user!.userId) throw ApiError.notFound('Order not found');
  if (!order.razorpayOrderId) throw ApiError.badRequest('Order has no payment attached');
  if (order.razorpayOrderId !== razorpay_order_id) {
    throw ApiError.badRequest('Payment does not match this order');
  }

  // Verify the payment signature: HMAC-SHA256(order_id|payment_id, key_secret)
  const expected = crypto
    .createHmac('sha256', env.razorpay.keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');
  if (expected !== razorpay_signature) {
    throw ApiError.badRequest('Invalid payment signature');
  }

  const fulfilled = await fulfillOrder(order.id);
  res.json({ order: fulfilled });
};

export const razorpayWebhook = async (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature'];
  if (!env.razorpay.webhookSecret) {
    return res.status(400).send('Webhook secret not configured');
  }
  if (typeof signature !== 'string') {
    return res.status(400).send('Missing webhook signature');
  }

  const expected = crypto
    .createHmac('sha256', env.razorpay.webhookSecret)
    .update(req.body)
    .digest('hex');
  if (expected !== signature) {
    return res.status(400).send('Webhook signature verification failed');
  }

  const event = JSON.parse(req.body.toString());

  if (event.event === 'payment.captured') {
    const orderId = event.payload?.payment?.entity?.notes?.orderId;
    if (orderId) await fulfillOrder(orderId);
  }

  if (event.event === 'payment.failed') {
    const orderId = event.payload?.payment?.entity?.notes?.orderId;
    if (orderId) {
      await prisma.order.updateMany({
        where: { id: orderId, status: OrderStatus.PENDING },
        data: { status: OrderStatus.CANCELLED },
      });
    }
  }

  res.json({ received: true });
};
