import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { createMockOrderService, getOrdersService } from '../services/orderService';

const router = Router();

router.post('/', authMiddleware, (req, res, next) =>
  createMockOrderService(req.user.id, req.body)
    .then((d) => res.json({ success: true, data: d }))
    .catch(next)
);

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const orders = await getOrdersService(req.user.id);
    res.json({ success: true, data: orders });
  } catch (e) {
    next(e);
  }
});

export const ordersRoutes = router;