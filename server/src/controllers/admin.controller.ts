import { Request, Response } from 'express';
import { z } from 'zod';
import { OrderStatus, Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { sendEmail, emails } from '../config/resend';

export const adminStats = async (_req: Request, res: Response) => {
  const [userCount, productCount, orderCount, paidOrders] = await Promise.all([
    prisma.user.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.order.count(),
    prisma.order.findMany({
      where: { status: { notIn: [OrderStatus.PENDING, OrderStatus.CANCELLED] } },
      select: { total: true },
    }),
  ]);

  const revenue = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);
  res.json({
    stats: {
      userCount,
      productCount,
      orderCount,
      revenue: Math.round(revenue * 100) / 100,
    },
  });
};

export const listUsers = async (req: Request, res: Response) => {
  const { search } = z.object({ search: z.string().optional() }).parse(req.query);
  const users = await prisma.user.findMany({
    where: search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      _count: { select: { orders: true, products: true } },
    },
  });
  res.json({ users });
};

export const updateUserRole = async (req: Request, res: Response) => {
  const { role } = z.object({ role: z.nativeEnum(Role) }).parse(req.body);
  if (req.params.id === req.user!.userId) {
    throw ApiError.badRequest('You cannot change your own role');
  }
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { role },
    select: { id: true, email: true, role: true },
  });
  res.json({ user });
};

export const deleteUser = async (req: Request, res: Response) => {
  if (req.params.id === req.user!.userId) {
    throw ApiError.badRequest('You cannot delete your own account');
  }

  const target = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, _count: { select: { orders: true } } },
  });
  if (!target) throw ApiError.notFound('User not found');

  if (target._count.orders > 0) {
    // Anonymize instead of hard-delete to preserve order history
    await prisma.user.update({
      where: { id: target.id },
      data: {
        email: `deleted_${target.id}@shoppyfy.deleted`,
        password: '',
        firstName: 'Deleted',
        lastName: 'User',
        avatarUrl: null,
        refreshToken: null,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });
  } else {
    await prisma.user.delete({ where: { id: target.id } });
  }

  res.json({ deleted: true });
};

export const listAllOrders = async (req: Request, res: Response) => {
  const { status } = z.object({ status: z.nativeEnum(OrderStatus).optional() }).parse(req.query);
  const orders = await prisma.order.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      items: true,
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });
  res.json({ orders });
};

const updateOrderSchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  trackingNumber: z.string().optional(),
  carrier: z.string().optional(),
  estimatedDelivery: z.coerce.date().optional(),
});

export const updateOrder = async (req: Request, res: Response) => {
  const data = updateOrderSchema.parse(req.body);

  const existing = await prisma.order.findUnique({
    where: { id: req.params.id },
    select: { status: true, orderNumber: true, trackingNumber: true, carrier: true, userId: true },
  });
  if (!existing) throw ApiError.notFound('Order not found');

  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: {
      ...data,
      ...(data.status === OrderStatus.DELIVERED ? { deliveredAt: new Date() } : {}),
    },
    include: { items: true },
  });

  // Send status change emails when order moves to SHIPPED or DELIVERED
  if (data.status && data.status !== existing.status) {
    prisma.user
      .findUnique({ where: { id: existing.userId }, select: { email: true } })
      .then((user) => {
        if (!user) return;
        if (data.status === OrderStatus.SHIPPED) {
          return sendEmail(
            user.email,
            `Shoppyfy — Your order has shipped`,
            emails.orderShipped(
              existing.orderNumber,
              data.trackingNumber ?? existing.trackingNumber,
              data.carrier ?? existing.carrier
            )
          );
        }
        if (data.status === OrderStatus.DELIVERED) {
          return sendEmail(
            user.email,
            `Shoppyfy — Your order has been delivered`,
            emails.orderDelivered(existing.orderNumber)
          );
        }
      })
      .catch((err) => console.error('[email] order status update:', err));
  }

  res.json({ order });
};

export const listAllProducts = async (_req: Request, res: Response) => {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      category: true,
      seller: { select: { firstName: true, lastName: true, email: true } },
    },
  });
  res.json({ products });
};
