import { Router } from 'express';
import { registerService, loginService } from '../services/authService';
import { registerSchema, loginSchema } from '../utils/schemas';
import { authMiddleware } from '../middleware/auth';

const router = Router();

function validate(schema: any) {
  return (req: any, res: any, next: any) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error: any) {
      const errors = error.errors?.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') || error.message;
      return res.status(400).json({ success: false, error: `Validation failed: ${errors}` });
    }
  };
}

router.post('/register', validate(registerSchema), (req, res, next) => {
  registerService(req.body)
    .then((u) => res.json({ success: true, data: u }))
    .catch(next);
});

router.post('/login', validate(loginSchema), (req, res, next) => {
  loginService(req.body)
    .then((d) => res.json({ success: true, data: d }))
    .catch(next);
});

declare module 'express-serve-static-core' {
  interface Request {
    user?: any;
  }
}

router.get('/me', authMiddleware, (req, res) => {
  res.json({ success: true, data: req.user });
});

export const authRoutes = router;
