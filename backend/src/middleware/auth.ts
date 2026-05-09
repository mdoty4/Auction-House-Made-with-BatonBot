import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';

export async function authMiddleware(req: any, res: any, next: any) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    req.user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!req.user) throw new Error('User not found');
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
}