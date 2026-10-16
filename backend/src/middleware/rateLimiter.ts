import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const ipMap = new Map<string, RateLimitEntry>();

export const rateLimiter = (req: Request, res: Response, next: NextFunction): void => {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const windowMs = env.API_RATE_LIMIT_WINDOW_MS;
  const maxRequests = env.API_RATE_LIMIT_MAX_REQUESTS;

  let entry = ipMap.get(ip);
  if (!entry || now > entry.resetTime) {
    entry = { count: 1, resetTime: now + windowMs };
    ipMap.set(ip, entry);
  } else {
    entry.count += 1;
  }

  if (entry.count > maxRequests) {
    res.status(429).json({
      success: false,
      data: null,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please slow down and try again shortly.',
      },
    });
    return;
  }

  next();
};
