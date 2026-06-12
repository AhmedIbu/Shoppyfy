import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { uploadBuffer } from '../config/cloudinary';

const publicUser = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  role: true,
  createdAt: true,
} as const;

export const updateProfile = async (req: Request, res: Response) => {
  const data = z
    .object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      email: z.string().email().optional(),
    })
    .parse(req.body);

  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: { ...data, email: data.email?.toLowerCase() },
    select: publicUser,
  });
  res.json({ user });
};

export const uploadAvatar = async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest('No image provided');
  const { url } = await uploadBuffer(req.file.buffer, 'shoppyfy/avatars');
  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: { avatarUrl: url },
    select: publicUser,
  });
  res.json({ user });
};

export const changePassword = async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = z
    .object({ currentPassword: z.string().min(1), newPassword: z.string().min(8) })
    .parse(req.body);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.userId } });
  if (!(await bcrypt.compare(currentPassword, user.password))) {
    throw ApiError.badRequest('Current password is incorrect');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(newPassword, 10) },
  });
  res.json({ message: 'Password updated' });
};

// ── Addresses ────────────────────────────────────────────

const addressSchema = z.object({
  label: z.string().optional(),
  fullName: z.string().min(1),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(2).default('US'),
  phone: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export const listAddresses = async (req: Request, res: Response) => {
  const addresses = await prisma.address.findMany({
    where: { userId: req.user!.userId },
    orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
  });
  res.json({ addresses });
};

export const createAddress = async (req: Request, res: Response) => {
  const data = addressSchema.parse(req.body);
  if (data.isDefault) {
    await prisma.address.updateMany({
      where: { userId: req.user!.userId },
      data: { isDefault: false },
    });
  }
  const address = await prisma.address.create({
    data: { ...data, userId: req.user!.userId },
  });
  res.status(201).json({ address });
};

export const updateAddress = async (req: Request, res: Response) => {
  const data = addressSchema.partial().parse(req.body);
  const existing = await prisma.address.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== req.user!.userId) throw ApiError.notFound('Address not found');

  if (data.isDefault) {
    await prisma.address.updateMany({
      where: { userId: req.user!.userId },
      data: { isDefault: false },
    });
  }
  const address = await prisma.address.update({ where: { id: existing.id }, data });
  res.json({ address });
};

export const deleteAddress = async (req: Request, res: Response) => {
  const existing = await prisma.address.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== req.user!.userId) throw ApiError.notFound('Address not found');
  await prisma.address.delete({ where: { id: existing.id } });
  res.json({ deleted: true });
};

// ── Account deletion ────────────────────────────────────

export const deleteMe = async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const orderCount = await prisma.order.count({ where: { userId } });

  if (orderCount > 0) {
    // Anonymize: preserve order history (required for business records) but remove personal data
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted_${userId}@semmai.deleted`,
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
    // No orders — hard delete (cascades to cart, wishlist, addresses, reviews)
    await prisma.user.delete({ where: { id: userId } });
  }

  // Clear auth cookies
  const { clearAuthCookies } = await import('../utils/jwt');
  clearAuthCookies(res);
  res.json({ deleted: true });
};
