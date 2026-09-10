import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDb } from '../db/connection';

export const JWT_SECRET = process.env.JWT_SECRET || 'footyheroes-secret-key-2026';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * JWT authentication middleware
 * Extracts and verifies Bearer token, attaches user to req.user
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const db = getDb();
    const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(decoded.userId) as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional auth — attaches user if token present, but does not block
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const db = getDb();
      const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(decoded.userId) as AuthUser | undefined;
      if (user) req.user = user;
    } catch { /* ignore */ }
  }
  next();
}

/**
 * Role-based access control middleware factory
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role) && req.user.role !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
