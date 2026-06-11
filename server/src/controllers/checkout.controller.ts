import { Request, Response } from 'express';
import { z } from 'zod';
import { OrderStatus } from '@prisma/client';
import Stripe from 'stripe';
import { prisma } from '../config/prisma';
import { stripe } from '../config/stripe';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

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

/**
 * Creates a PENDING order from the user's cart (server-side pricing) and a
 * Stripe PaymentIntent for the total. Returns the clientSecret for the
 * Payment Element on the client.
 */
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

  // Resolve the shipping address
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
  });

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(total * 100),
    currency: 'usd',
    automatic_payment_methods: { enabled: true },
    metadata: { orderId: order.id, orderNumber: order.orderNumber, userId },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { stripePaymentIntentId: paymentIntent.id },
  });

  res.status(201).json({
    clientSecret: paymentIntent.client_secret,
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: total,
  });
};

/** Marks an order paid: decrement stock, clear the buyer's cart. Idempotent. */
const fulfillOrder = async (orderId: string) => {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || order.status !== OrderStatus.PENDING) return order;

  return prisma.$transaction(async (tx) => {
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
};

/**
 * Client-side confirmation fallback for local dev (no webhook forwarding).
 * Verifies the PaymentIntent status with Stripe before fulfilling.
 */
export const confirmOrder = async (req: Request, res: Response) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order || order.userId !== req.user!.userId) throw ApiError.notFound('Order not found');
  if (!order.stripePaymentIntentId) throw ApiError.badRequest('Order has no payment intent');

  const intent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
  if (intent.status !== 'succeeded') {
    throw ApiError.badRequest(`Payment not completed (status: ${intent.status})`);
  }

  const fulfilled = await fulfillOrder(order.id);
  res.json({ order: fulfilled });
};

/** Stripe webhook — mounted with express.raw() BEFORE the JSON body parser. */
export const stripeWebhook = async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'];
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature as string,
      env.stripe.webhookSecret
    );
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed: ${(err as Error).message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const orderId = intent.metadata?.orderId;
    if (orderId) await fulfillOrder(orderId);
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const orderId = intent.metadata?.orderId;
    if (orderId) {
      await prisma.order.updateMany({
        where: { id: orderId, status: OrderStatus.PENDING },
        data: { status: OrderStatus.CANCELLED },
      });
    }
  }

  res.json({ received: true });
};
