import { Request, Response } from 'express';
import { OrderStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';

const orderInclude = {
  items: { include: { product: { select: { slug: true } } } },
};

export const getMyOrders = async (req: Request, res: Response) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: 'desc' },
    include: orderInclude,
  });
  res.json({ orders });
};

export const getOrder = async (req: Request, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: orderInclude,
  });
  if (!order) throw ApiError.notFound('Order not found');
  if (order.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
    throw ApiError.forbidden();
  }
  res.json({ order });
};

export const cancelOrder = async (req: Request, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { items: true },
  });
  if (!order || order.userId !== req.user!.userId) throw ApiError.notFound('Order not found');

  const cancellable: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.PAID, OrderStatus.PROCESSING];
  if (!cancellable.includes(order.status)) {
    throw ApiError.badRequest(`Orders in status ${order.status} cannot be cancelled`);
  }

  // Restore stock for paid orders (stock is only decremented once payment succeeds)
  const updated = await prisma.$transaction(async (tx) => {
    if (order.status !== OrderStatus.PENDING) {
      for (const item of order.items) {
        if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
    }
    return tx.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.CANCELLED },
      include: orderInclude,
    });
  });

  res.json({ order: updated });
};
