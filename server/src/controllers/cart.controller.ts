import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';

const cartInclude = {
  items: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          comparePrice: true,
          images: true,
          stock: true,
          brand: true,
        },
      },
    },
  },
};

const getOrCreateCart = async (userId: string) => {
  return prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
    include: cartInclude,
  });
};

const cartTotals = (cart: { items: { quantity: number; product: { price: unknown } }[] }) => {
  const subtotal = cart.items.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0
  );
  return { subtotal: Math.round(subtotal * 100) / 100, itemCount: cart.items.reduce((n, i) => n + i.quantity, 0) };
};

export const getCart = async (req: Request, res: Response) => {
  const cart = await getOrCreateCart(req.user!.userId);
  res.json({ cart, ...cartTotals(cart) });
};

const addItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).default(1),
  size: z.string().optional(),
  color: z.string().optional(),
});

export const addItem = async (req: Request, res: Response) => {
  const { productId, quantity, size, color } = addItemSchema.parse(req.body);

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.isActive) throw ApiError.notFound('Product not found');
  if (product.stock < quantity) throw ApiError.badRequest('Not enough stock available');

  const cart = await getOrCreateCart(req.user!.userId);

  const existing = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId, size: size ?? null, color: color ?? null },
  });

  if (existing) {
    const newQty = Math.min(existing.quantity + quantity, product.stock);
    await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: newQty } });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId, quantity, size, color },
    });
  }

  const updated = await prisma.cart.findUniqueOrThrow({
    where: { id: cart.id },
    include: cartInclude,
  });
  res.status(201).json({ cart: updated, ...cartTotals(updated) });
};

export const updateItem = async (req: Request, res: Response) => {
  const { itemId } = req.params;
  const { quantity } = z.object({ quantity: z.coerce.number().int().min(1) }).parse(req.body);

  const item = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: { cart: true, product: true },
  });
  if (!item || item.cart.userId !== req.user!.userId) throw ApiError.notFound('Cart item not found');
  if (quantity > item.product.stock) throw ApiError.badRequest('Not enough stock available');

  await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });

  const cart = await prisma.cart.findUniqueOrThrow({
    where: { id: item.cartId },
    include: cartInclude,
  });
  res.json({ cart, ...cartTotals(cart) });
};

export const removeItem = async (req: Request, res: Response) => {
  const { itemId } = req.params;
  const item = await prisma.cartItem.findUnique({ where: { id: itemId }, include: { cart: true } });
  if (!item || item.cart.userId !== req.user!.userId) throw ApiError.notFound('Cart item not found');

  await prisma.cartItem.delete({ where: { id: itemId } });

  const cart = await prisma.cart.findUniqueOrThrow({
    where: { id: item.cartId },
    include: cartInclude,
  });
  res.json({ cart, ...cartTotals(cart) });
};

export const clearCart = async (req: Request, res: Response) => {
  const cart = await getOrCreateCart(req.user!.userId);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  const updated = await prisma.cart.findUniqueOrThrow({
    where: { id: cart.id },
    include: cartInclude,
  });
  res.json({ cart: updated, ...cartTotals(updated) });
};
