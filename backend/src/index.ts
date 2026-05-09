import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './routes/auth.routes';
import { listingsRoutes } from './routes/listings.routes';
import { bidsRoutes } from './routes/bids.routes';
import { cartRoutes } from './routes/cart.routes';
import { ordersRoutes } from './routes/orders.routes';
import { categoryRoutes } from './routes/category.routes';

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Async error wrapper for routes - ensures Promise rejections are caught
app.use((req: any, res: any, next: any) => {
  Promise.resolve(next()).catch((err) => next(err));
});

// Auth routes
app.use('/api/auth', authRoutes);

// Listings routes
app.use('/api/listings', listingsRoutes);

// Bids routes
app.use('/api/bids', bidsRoutes);

// Cart routes
app.use('/api/cart', cartRoutes);

// Orders routes
app.use('/api/orders', ordersRoutes);

// Category routes
app.use('/api/categories', categoryRoutes);

// Global error handling middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});