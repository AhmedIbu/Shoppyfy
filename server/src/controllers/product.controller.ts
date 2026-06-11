import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';

const productInclude = {
  category: true,
  seller: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.ProductInclude;

/** Attach average rating + review count to a list of products. */
const withRatings = async <T extends { id: string }>(products: T[]) => {
  if (products.length === 0) return products.map((p) => ({ ...p, avgRating: 0, reviewCount: 0 }));
  const grouped = await prisma.review.groupBy({
    by: ['productId'],
    where: { productId: { in: products.map((p) => p.id) } },
    _avg: { rating: true },
    _count: true,
  });
  const map = new Map(grouped.map((g) => [g.productId, g]));
  return products.map((p) => ({
    ...p,
    avgRating: Number(map.get(p.id)?._avg.rating?.toFixed(1) ?? 0),
    reviewCount: map.get(p.id)?._count ?? 0,
  }));
};

const listQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(), // category slug
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  condition: z.enum(['NEW', 'LIKE_NEW', 'GOOD', 'FAIR']).optional(),
  sizes: z.string().optional(), // comma-separated
  featured: z.coerce.boolean().optional(),
  sort: z.enum(['newest', 'price-asc', 'price-desc', 'name']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

export const listProducts = async (req: Request, res: Response) => {
  const q = listQuerySchema.parse(req.query);

  const where: Prisma.ProductWhereInput = { isActive: true };
  if (q.search) {
    where.OR = [
      { name: { contains: q.search, mode: 'insensitive' } },
      { description: { contains: q.search, mode: 'insensitive' } },
      { brand: { contains: q.search, mode: 'insensitive' } },
    ];
  }
  if (q.category) where.category = { slug: q.category };
  if (q.condition) where.condition = q.condition;
  if (q.featured) where.isFeatured = true;
  if (q.sizes) where.sizes = { hasSome: q.sizes.split(',') };
  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    where.price = {
      ...(q.minPrice !== undefined ? { gte: q.minPrice } : {}),
      ...(q.maxPrice !== undefined ? { lte: q.maxPrice } : {}),
    };
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    q.sort === 'price-asc'
      ? { price: 'asc' }
      : q.sort === 'price-desc'
        ? { price: 'desc' }
        : q.sort === 'name'
          ? { name: 'asc' }
          : { createdAt: 'desc' };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: productInclude,
    }),
  ]);

  res.json({
    products: await withRatings(products),
    pagination: {
      page: q.page,
      limit: q.limit,
      total,
      totalPages: Math.ceil(total / q.limit),
    },
  });
};

export const getProduct = async (req: Request, res: Response) => {
  const { idOrSlug } = req.params;
  const product = await prisma.product.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], isActive: true },
    include: {
      ...productInclude,
      reviews: {
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
      },
    },
  });
  if (!product) throw ApiError.notFound('Product not found');

  const [withRating] = await withRatings([product]);

  const related = await prisma.product.findMany({
    where: { categoryId: product.categoryId, id: { not: product.id }, isActive: true },
    take: 4,
    include: productInclude,
  });

  res.json({ product: withRating, related: await withRatings(related) });
};

export const listCategories = async (_req: Request, res: Response) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: { where: { isActive: true } } } } },
  });
  res.json({
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      imageUrl: c.imageUrl,
      productCount: c._count.products,
    })),
  });
};

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  comment: z.string().max(2000).optional(),
});

export const createReview = async (req: Request, res: Response) => {
  const { productId } = req.params;
  const data = reviewSchema.parse(req.body);

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw ApiError.notFound('Product not found');
  if (product.sellerId === req.user!.userId) {
    throw ApiError.forbidden('You cannot review your own listing');
  }

  const review = await prisma.review.upsert({
    where: { userId_productId: { userId: req.user!.userId, productId } },
    create: { userId: req.user!.userId, productId, ...data },
    update: data,
    include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
  });

  res.status(201).json({ review });
};
