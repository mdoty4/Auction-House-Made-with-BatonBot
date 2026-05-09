import { Router } from 'express';
import {
  getFilteredListingsService,
  getListingByIdService,
  createListingService,
  getSellerListingsService,
  getSellerMetricsService,
  endListingService,
  relistListingService,
  deleteListingService,
  updateListingService,
} from '../services/listingService';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// ─── Public routes ───────────────────────────────────────────────────────────

router.get('/', (req, res, next) => {
  const page = req.query.page ? Number(req.query.page) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  getFilteredListingsService(req.query, page, limit)
    .then((d) => res.json({ success: true, data: d }))
    .catch(next);
});

// ─── Seller Dashboard routes (require auth) ──────────────────────────────────
// NOTE: These MUST be defined BEFORE /:id routes so Express matches the
// literal "/seller" path instead of treating it as an :id parameter.

/**
 * GET /listings/seller
 * Fetch the authenticated seller's listings filtered by status query param.
 * Query: ?status=active|sold|ended|draft
 */
router.get('/seller', authMiddleware, (req, res, next) => {
  const status = (req.query.status as string) || 'active';
  const page = req.query.page ? Number(req.query.page) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  getSellerListingsService(req.user.id, status, page, limit)
    .then((d) => res.json({ success: true, data: d }))
    .catch(next);
});

/**
 * GET /listings/seller/metrics
 * Return seller performance metrics: views, conversion rate, avg sell time, etc.
 */
router.get('/seller/metrics', authMiddleware, (req, res, next) => {
  getSellerMetricsService(req.user.id)
    .then((d) => res.json({ success: true, data: d }))
    .catch(next);
});

// ─── Public: get single listing ──────────────────────────────────────────────

router.get('/:id', (req, res, next) => {
  getListingByIdService(req.params.id)
    .then((d) => res.json({ success: true, data: d }))
    .catch(next);
});

// ─── Authenticated: create listing ───────────────────────────────────────────

router.post('/', authMiddleware, (req, res, next) => {
  createListingService(req.user.id, req.body)
    .then((d) => res.json({ success: true, data: d }))
    .catch(next);
});

// ─── Listing actions (require auth) ──────────────────────────────────────────

/**
 * PUT /listings/:id
 * Update an existing listing (seller only).
 */
router.put('/:id', authMiddleware, (req, res, next) => {
  updateListingService(req.user.id, req.params.id, req.body)
    .then((d) => res.json({ success: true, data: d }))
    .catch(next);
});

/**
 * POST /listings/:id/end
 * Force-end an active listing (seller only).
 */
router.post('/:id/end', authMiddleware, (req, res, next) => {
  endListingService(req.user.id, req.params.id)
    .then((d) => res.json({ success: true, data: d }))
    .catch(next);
});

/**
 * POST /listings/:id/relist
 * Relist a sold/ended listing (seller only).
 */
router.post('/:id/relist', authMiddleware, (req, res, next) => {
  relistListingService(req.user.id, req.params.id)
    .then((d) => res.json({ success: true, data: d }))
    .catch(next);
});

/**
 * DELETE /listings/:id
 * Delete a listing permanently (seller only).
 */
router.delete('/:id', authMiddleware, (req, res, next) => {
  deleteListingService(req.user.id, req.params.id)
    .then((d) => res.json({ success: true, data: d }))
    .catch(next);
});

export const listingsRoutes = router;
