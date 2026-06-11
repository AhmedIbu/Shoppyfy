import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
} from '../utils/jwt';

const publicUser = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  role: true,
  createdAt: true,
} as const;

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['BUYER', 'SELLER']).optional(),
});

const issueTokens = async (res: Response, userId: string, role: Role) => {
  const accessToken = signAccessToken({ userId, role });
  const refreshToken = signRefreshToken({ userId, role });
  await prisma.user.update({ where: { id: userId }, data: { refreshToken } });
  setAuthCookies(res, accessToken, refreshToken);
  return accessToken;
};

export const register = async (req: Request, res: Response) => {
  const data = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      password: await bcrypt.hash(data.password, 10),
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role === 'SELLER' ? Role.SELLER : Role.BUYER,
    },
    select: publicUser,
  });

  const accessToken = await issueTokens(res, user.id, user.role);
  res.status(201).json({ user, accessToken });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = z
    .object({ email: z.string().email(), password: z.string().min(1) })
    .parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const accessToken = await issueTokens(res, user.id, user.role);
  const { password: _p, refreshToken: _r, resetToken: _t, resetTokenExpiry: _e, ...safe } = user;
  res.json({ user: safe, accessToken });
};

export const refresh = async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw ApiError.unauthorized('No refresh token');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || user.refreshToken !== token) {
    throw ApiError.unauthorized('Refresh token revoked');
  }

  const accessToken = await issueTokens(res, user.id, user.role);
  res.json({ accessToken });
};

export const logout = async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      await prisma.user.update({ where: { id: payload.userId }, data: { refreshToken: null } });
    } catch {
      /* already invalid */
    }
  }
  clearAuthCookies(res);
  res.json({ message: 'Logged out' });
};

export const me = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: publicUser,
  });
  if (!user) throw ApiError.notFound('User not found');
  res.json({ user });
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = z.object({ email: z.string().email() }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  // Always respond 200 to avoid leaking which emails exist
  if (user) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000) },
    });
    // In production, email this link. In development we log it for convenience.
    console.log(`🔑 Password reset link: /reset-password?token=${resetToken}`);
  }

  res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token, password } = z
    .object({ token: z.string().min(1), password: z.string().min(8) })
    .parse(req.body);

  const user = await prisma.user.findFirst({
    where: { resetToken: token, resetTokenExpiry: { gt: new Date() } },
  });
  if (!user) throw ApiError.badRequest('Reset link is invalid or has expired');

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await bcrypt.hash(password, 10),
      resetToken: null,
      resetTokenExpiry: null,
      refreshToken: null,
    },
  });

  res.json({ message: 'Password updated. You can now sign in.' });
};
