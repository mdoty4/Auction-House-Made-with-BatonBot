import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { placeBidService, getBidHistoryService } from '../services/bidService';

const router = Router();

router.post('/', authMiddleware, (req, res, next) => {
  placeBidService(req.user.id, req.body)
    .then((d) => res.json({ success: true, data: d }))
    .catch(next);
});

router.get('/:listingId/history', (req, res, next) => {
  getBidHistoryService(req.params.listingId)
    .then((d) => res.json({ success: true, data: d }))
    .catch(next);
});

export const bidsRoutes = router;