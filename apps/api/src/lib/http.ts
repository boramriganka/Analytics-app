import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import pino from 'pino';
import type { z } from 'zod';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});

export const JWT_SECRET =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === 'production'
    ? (() => {
        throw new Error('JWT_SECRET is required in production');
      })()
    : 'signalroom-dev-only-secret');

export interface AuthContext {
  userId: number | null; // null → guest demo session
  wsId: number;
  name: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    auth: AuthContext;
  }
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export function signToken(ctx: AuthContext, expiresIn: string | number = '7d'): string {
  return jwt.sign({ sub: ctx.userId ?? 'guest', wsId: ctx.wsId, name: ctx.name }, JWT_SECRET, { expiresIn: expiresIn as never });
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new HttpError(401, 'unauthenticated', 'Sign in or open the demo to continue.'));
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string | number; wsId: number; name: string };
    req.auth = {
      userId: payload.sub === 'guest' ? null : Number(payload.sub),
      wsId: payload.wsId,
      name: payload.name,
    };
    next();
  } catch {
    next(new HttpError(401, 'token_invalid', 'Your session has expired. Reopen the demo or sign in again.'));
  }
}

/** Parse and validate with zod; throws a structured 400 on failure. */
export function parse<T extends z.ZodTypeAny>(schema: T, data: unknown, what = 'request'): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new HttpError(400, 'validation_failed', `Invalid ${what}.`, result.error.flatten());
  }
  return result.data;
}

/** Wrap an async handler so rejections reach the error middleware. */
export function h(fn: (req: Request, res: Response) => Promise<void> | void) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
}

export function errorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  logger.error({ err, path: req.path }, 'unhandled error');
  res.status(500).json({ error: { code: 'internal', message: 'Something went wrong on our side.' } });
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = performance.now();
  res.on('finish', () => {
    logger.info(
      { method: req.method, path: req.path, status: res.statusCode, ms: Math.round(performance.now() - start) },
      'request'
    );
  });
  next();
}
