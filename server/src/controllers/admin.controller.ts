import { Request, Response } from 'express';
import { z } from 'zod';
import { OrderStatus, ProductCondition, Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { sendEmail, emails } from '../config/resend';
import { uploadBuffer } from '../config/cloudinary';

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
        email: `deleted_${target.id}@semmai.deleted`,
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
            `SEMMAI — Your order has shipped`,
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
            `SEMMAI — Your order has been delivered`,
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

// ── Product authoring (admin only) ──────────────────────────────────

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const uniqueProductSlug = async (name: string, excludeId?: string) => {
  const base = slugify(name) || 'item';
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

const uniqueCategorySlug = async (name: string, excludeId?: string) => {
  const base = slugify(name) || 'category';
  let slug = base;
  let n = 1;
  while (
    await prisma.category.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
    })
  ) {
    slug = `${base}-${++n}`;
  }
  return slug;
};

/** Accepts an array, a comma-separated string, or a JSON array string. */
const asStringArray = (v: unknown): string[] | undefined => {
  if (v === undefined || v === null) return undefined;
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string' && x.length > 0);
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return [];
    if (s.startsWith('[')) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === 'string');
      } catch {
        /* fall through to comma split */
      }
    }
    return s
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return undefined;
};

const csv = z
  .union([z.array(z.string()), z.string()])
  .transform((v) => (Array.isArray(v) ? v : v.split(',').map((s) => s.trim()).filter(Boolean)));

const productSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().min(1, 'Please add a short description'),
  price: z.coerce.number().positive('Price must be greater than 0'),
  comparePrice: z.coerce.number().positive().optional(),
  categoryId: z.string().min(1),
  sizes: csv.default([]),
  colors: csv.default([]),
  brand: z.string().optional(),
  condition: z.nativeEnum(ProductCondition).default(ProductCondition.NEW),
  stock: z.coerce.number().int().min(0).default(0),
  isActive: z.coerce.boolean().default(true),
  isFeatured: z.coerce.boolean().default(false),
});

const uploadImages = async (files?: Express.Multer.File[]) => {
  if (!files || files.length === 0) return [];
  const results = await Promise.all(files.map((f) => uploadBuffer(f.buffer, 'semmai/products')));
  return results.map((r) => r.url);
};

export const createProduct = async (req: Request, res: Response) => {
  const data = productSchema.parse(req.body);

  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) throw ApiError.badRequest('Invalid category');

  const uploaded = await uploadImages(req.files as Express.Multer.File[]);
  // Allow image URLs in the body too (dev/seed convenience)
  const bodyImages = asStringArray(req.body.imageUrls) ?? [];
  const images = [...uploaded, ...bodyImages];
  if (images.length === 0) throw ApiError.badRequest('At least one product image is required');

  const product = await prisma.product.create({
    data: {
      ...data,
      slug: await uniqueProductSlug(data.name),
      images,
      sellerId: req.user!.userId, // the admin owns the catalog
    },
    include: { category: true },
  });
  res.status(201).json({ product });
};

export const updateProduct = async (req: Request, res: Response) => {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound('Product not found');

  const data = productSchema.partial().parse(req.body);

  if (data.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) throw ApiError.badRequest('Invalid category');
  }

  const uploaded = await uploadImages(req.files as Express.Multer.File[]);
  // `keepImages` is the surviving list after the editor removes some; it replaces the base set.
  // (Named distinctly from the multer `images` file field to avoid a multipart collision.)
  const keep = asStringArray(req.body.keepImages);
  let images: string[] | undefined;
  if (keep !== undefined || uploaded.length > 0) {
    images = [...(keep ?? existing.images), ...uploaded];
    if (images.length === 0) throw ApiError.badRequest('A product must have at least one image');
  }

  const product = await prisma.product.update({
    where: { id: existing.id },
    data: {
      ...data,
      ...(data.name ? { slug: await uniqueProductSlug(data.name, existing.id) } : {}),
      ...(images ? { images } : {}),
    },
    include: { category: true },
  });
  res.json({ product });
};

export const deleteProduct = async (req: Request, res: Response) => {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound('Product not found');
  // Hard delete: cart/wishlist/reviews cascade; order_items keep their snapshot (productId set null).
  await prisma.product.delete({ where: { id: existing.id } });
  res.json({ deleted: true });
};

// ── Category authoring (admin only) ─────────────────────────────────

export const createCategory = async (req: Request, res: Response) => {
  const { name } = z.object({ name: z.string().min(2) }).parse(req.body);

  const existing = await prisma.category.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  });
  if (existing) throw ApiError.badRequest('A category with that name already exists');

  let imageUrl: string | undefined;
  const file = (req.files as Express.Multer.File[] | undefined)?.[0] ?? req.file;
  if (file) {
    const { url } = await uploadBuffer(file.buffer, 'semmai/categories');
    imageUrl = url;
  } else if (typeof req.body.imageUrl === 'string' && req.body.imageUrl.trim()) {
    imageUrl = req.body.imageUrl.trim();
  }

  const category = await prisma.category.create({
    data: { name, slug: await uniqueCategorySlug(name), imageUrl },
  });
  res.status(201).json({ category });
};

export const updateCategory = async (req: Request, res: Response) => {
  const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound('Category not found');

  const { name } = z.object({ name: z.string().min(2).optional() }).parse(req.body);

  let imageUrl: string | undefined;
  const file = (req.files as Express.Multer.File[] | undefined)?.[0] ?? req.file;
  if (file) {
    const { url } = await uploadBuffer(file.buffer, 'semmai/categories');
    imageUrl = url;
  } else if (typeof req.body.imageUrl === 'string' && req.body.imageUrl.trim()) {
    imageUrl = req.body.imageUrl.trim();
  }

  const category = await prisma.category.update({
    where: { id: existing.id },
    data: {
      ...(name ? { name, slug: await uniqueCategorySlug(name, existing.id) } : {}),
      ...(imageUrl ? { imageUrl } : {}),
    },
  });
  res.json({ category });
};

export const deleteCategory = async (req: Request, res: Response) => {
  const existing = await prisma.category.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { products: true } } },
  });
  if (!existing) throw ApiError.notFound('Category not found');
  if (existing._count.products > 0) {
    throw ApiError.badRequest(
      `This category still has ${existing._count.products} product(s). Move or delete them first.`
    );
  }
  await prisma.category.delete({ where: { id: existing.id } });
  res.json({ deleted: true });
};
