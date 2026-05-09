import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { loginSchema, registerSchema } from '../utils/schemas';
import { z } from 'zod';

export async function registerService(data: z.infer<typeof registerSchema>) {
  const validated = registerSchema.parse(data);

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: validated.email },
  });

  if (existingUser) {
    const error: Error = new Error('User with this email already exists');
    error.name = 'ConflictError';
    throw error;
  }

  // Hash password
  const hash = await bcrypt.hash(validated.password, 10);

  // Create user
  return prisma.user.create({
    data: {
      email: validated.email,
      passwordHash: hash,
      name: validated.name,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
     createdAt: true,
     },
   });
 }

export async function loginService(data: z.infer<typeof loginSchema>) {
  const validated = loginSchema.parse(data);

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: validated.email },
  });

  if (!user) {
    const error: Error = new Error('Invalid credentials');
    error.name = 'UnauthorizedError';
    throw error;
  }

  // Verify password
  const passwordValid = await bcrypt.compare(validated.password, user.passwordHash);
  if (!passwordValid) {
    const error: Error = new Error('Invalid credentials');
    error.name = 'UnauthorizedError';
    throw error;
  }

  // Generate JWT
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  };
 }
