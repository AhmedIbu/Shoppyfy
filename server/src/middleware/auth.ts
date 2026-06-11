import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

const extractToken = (req: Request): string | null => {
  if (req.cookies?.accessToken) return req.cookies.accessToken;
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
};

/** Requires a valid access token (cookie or Bearer header). */
export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (!token) return next(ApiError.unauthorized());
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired token'));
  }
};

/** Attaches req.user when a valid token is present, but never rejects. */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = verifyAccessToken(token);
    } catch {
      /* anonymous */
    }
  }
  next();
};

/** Role gate — use after authenticate. Admins pass every gate. */
export const authorize =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (req.user.role === Role.ADMIN || roles.includes(req.user.role)) return next();
    next(ApiError.forbidden(`Requires role: ${roles.join(' or ')}`));
  };
