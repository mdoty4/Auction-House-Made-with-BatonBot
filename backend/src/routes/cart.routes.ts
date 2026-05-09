import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  addToCartService,
  updateCartItemService,
  removeCartItemService,
  saveForLaterService,
  moveToCartService,
  clearCartService,
  getCartService,
} from '../services/cartService';

const router = Router();

// GET /cart - fetch cart with listing details
router.get('/', authMiddleware, async (req, res, next) => {
  const cart = await getCartService(req.user.id);
  res.json({ success: true, data: cart });
});

// POST /cart/items - add item to cart
router.post('/items', authMiddleware, (req, res, next) =>
  addToCartService(req.user.id, req.body)
    .then((d) => res.json({ success: true, data: d }))
    .catch(next)
);

// PUT /cart/items - update item quantity
router.put('/items', authMiddleware, (req, res, next) =>
  updateCartItemService(req.user.id, req.body)
    .then((d) => res.json({ success: true, data: d }))
    .catch(next)
);

// DELETE /cart/items/:listingId - remove single item from cart
router.delete('/items/:listingId', authMiddleware, async (req, res, next) => {
  try {
    const result = await removeCartItemService(req.user.id, req.params.listingId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /cart/items/:listingId/save - save item for later (remove from cart)
router.post('/items/:listingId/save', authMiddleware, async (req, res, next) => {
  try {
    const result = await saveForLaterService(req.user.id, req.params.listingId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// POST /cart/saved/:listingId/restore - move saved item back to cart
router.post('/saved/:listingId/restore', authMiddleware, async (req, res, next) => {
  try {
    const result = await moveToCartService(req.user.id, req.params.listingId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

// DELETE /cart/clear - clear entire cart
router.delete('/clear', authMiddleware, (req, res, next) =>
  clearCartService(req.user.id)
    .then((d) => res.json({ success: true, data: d }))
    .catch(next)
);

export const cartRoutes = router;