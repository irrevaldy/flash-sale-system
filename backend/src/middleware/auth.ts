import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    tier?: string;
  };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing Authorization Bearer token' });
      return;
    }

    const token = header.substring('Bearer '.length).trim();
    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret) {
      res.status(500).json({ error: 'JWT_ACCESS_SECRET is not set' });
      return;
    }

    const payload = jwt.verify(token, secret) as any;

    req.user = {
      id: payload.sub,
      email: payload.email,
      tier: payload.tier,
    };

    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
