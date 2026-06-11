import jwt, { SignOptions } from 'jsonwebtoken';
import { Response } from 'express';
import { Role } from '@prisma/client';
import { env } from '../config/env';

export interface JwtPayload {
  userId: string;
  role: Role;
}

export const signAccessToken = (payload: JwtPayload) =>
  jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
  } as SignOptions);

export const signRefreshToken = (payload: JwtPayload) =>
  jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  } as SignOptions);

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, env.jwt.accessSecret) as JwtPayload;

export const verifyRefreshToken = (token: string) =>
  jwt.verify(token, env.jwt.refreshSecret) as JwtPayload;

// In production the client and API live on different domains (e.g. two
// vercel.app deployments), so cookies must be SameSite=None; Secure.
const cookieBase = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: (env.isProd ? 'none' : 'lax') as 'none' | 'lax',
  path: '/',
};

export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie('accessToken', accessToken, { ...cookieBase, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { ...cookieBase, maxAge: 7 * 24 * 60 * 60 * 1000 });
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie('accessToken', cookieBase);
  res.clearCookie('refreshToken', cookieBase);
};
