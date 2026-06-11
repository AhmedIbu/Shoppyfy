import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';

const wishlistInclude = {
  product: {
    include: {
      category: true,
      seller: { select: { id: true, firstName: true, lastName: true } },
    },
  },
};

export const getWishlist = async (req: Request, res: Response) => {
  const items = await prisma.wishlist.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: 'desc' },
    include: wishlistInclude,
  });
  res.json({ items });
};

export const toggleWishlist = async (req: Request, res: Response) => {
  const { productId } = req.params;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw ApiError.notFound('Product not found');

  const existing = await prisma.wishlist.findUnique({
    where: { userId_productId: { userId: req.user!.userId, productId } },
  });

  if (existing) {
    await prisma.wishlist.delete({ where: { id: existing.id } });
    return res.json({ added: false, productId });
  }

  await prisma.wishlist.create({ data: { userId: req.user!.userId, productId } });
  res.status(201).json({ added: true, productId });
};

export const removeFromWishlist = async (req: Request, res: Response) => {
  const { productId } = req.params;
  await prisma.wishlist.deleteMany({ where: { userId: req.user!.userId, productId } });
  res.json({ removed: true, productId });
};
