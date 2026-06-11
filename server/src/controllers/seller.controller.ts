import { Request, Response } from 'express';
import { z } from 'zod';
import { OrderStatus, ProductCondition } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { uploadBuffer } from '../config/cloudinary';

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const uniqueSlug = async (name: string, excludeId?: string) => {
  const base = slugify(name);
  let slug = base;
  let n = 1;
  while (
    await prisma.product.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
    })
  ) {
    slug = `${base}-${++n}`;
  }
  return slug;
};

const csv = z
  .union([z.array(z.string()), z.string()])
  .transform((v) => (Array.isArray(v) ? v : v.split(',').map((s) => s.trim()).filter(Boolean)));

const productSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10),
  price: z.coerce.number().positive(),
  comparePrice: z.coerce.number().positive().optional(),
  categoryId: z.string().min(1),
  sizes: csv.default([]),
  colors: csv.default([]),
  brand: z.string().optional(),
  condition: z.nativeEnum(ProductCondition).default(ProductCondition.NEW),
  stock: z.coerce.number().int().min(0).default(0),
  isActive: z.coerce.boolean().default(true),
});

const uploadImages = async (files?: Express.Multer.File[]) => {
  if (!files || files.length === 0) return [];
  const results = await Promise.all(files.map((f) => uploadBuffer(f.buffer)));
  return results.map((r) => r.url);
};

export const listMyProducts = async (req: Request, res: Response) => {
  const products = await prisma.product.findMany({
    where: { sellerId: req.user!.userId },
    orderBy: { createdAt: 'desc' },
    include: { category: true, _count: { select: { orderItems: true } } },
  });
  res.json({ products });
};

export const createProduct = async (req: Request, res: Response) => {
  const data = productSchema.parse(req.body);

  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) throw ApiError.badRequest('Invalid category');

  const uploaded = await uploadImages(req.files as Express.Multer.File[]);
  // Allow image URLs in the body too (handy for seeding/dev without Cloudinary)
  const bodyImages: string[] = Array.isArray(req.body.imageUrls)
    ? req.body.imageUrls
    : typeof req.body.imageUrls === 'string' && req.body.imageUrls
      ? req.body.imageUrls.split(',').map((s: string) => s.trim())
      : [];
  const images = [...uploaded, ...bodyImages];
  if (images.length === 0) throw ApiError.badRequest('At least one product image is required');

  const product = await prisma.product.create({
    data: {
      ...data,
      slug: await uniqueSlug(data.name),
      images,
      sellerId: req.user!.userId,
    },
    include: { category: true },
  });
  res.status(201).json({ product });
};

export const updateProduct = async (req: Request, res: Response) => {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound('Product not found');
  if (existing.sellerId !== req.user!.userId && req.user!.role !== 'ADMIN') {
    throw ApiError.forbidden('You can only edit your own listings');
  }

  const data = productSchema.partial().parse(req.body);
  const uploaded = await uploadImages(req.files as Express.Multer.File[]);

  const product = await prisma.product.update({
    where: { id: existing.id },
    data: {
      ...data,
      ...(data.name ? { slug: await uniqueSlug(data.name, existing.id) } : {}),
      ...(uploaded.length > 0 ? { images: [...existing.images, ...uploaded] } : {}),
    },
    include: { category: true },
  });
  res.json({ product });
};

export const deleteProduct = async (req: Request, res: Response) => {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound('Product not found');
  if (existing.sellerId !== req.user!.userId && req.user!.role !== 'ADMIN') {
    throw ApiError.forbidden('You can only delete your own listings');
  }
  // Soft-delete keeps order history intact
  await prisma.product.update({ where: { id: existing.id }, data: { isActive: false } });
  res.json({ deleted: true });
};

/** Orders that contain at least one of this seller's products. */
export const listMySales = async (req: Request, res: Response) => {
  const orders = await prisma.order.findMany({
    where: {
      status: { notIn: [OrderStatus.PENDING, OrderStatus.CANCELLED] },
      items: { some: { product: { sellerId: req.user!.userId } } },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      items: { where: { product: { sellerId: req.user!.userId } } },
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });
  res.json({ orders });
};

export const sellerStats = async (req: Request, res: Response) => {
  const sellerId = req.user!.userId;
  const [productCount, activeCount, soldItems] = await Promise.all([
    prisma.product.count({ where: { sellerId } }),
    prisma.product.count({ where: { sellerId, isActive: true, stock: { gt: 0 } } }),
    prisma.orderItem.findMany({
      where: {
        product: { sellerId },
        order: { status: { notIn: [OrderStatus.PENDING, OrderStatus.CANCELLED] } },
      },
      select: { price: true, quantity: true },
    }),
  ]);

  const revenue = soldItems.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
  const unitsSold = soldItems.reduce((sum, i) => sum + i.quantity, 0);

  res.json({
    stats: {
      productCount,
      activeCount,
      unitsSold,
      revenue: Math.round(revenue * 100) / 100,
    },
  });
};
