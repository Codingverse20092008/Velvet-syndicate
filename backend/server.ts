import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Import env early to validate
import { env } from './src/lib/env';

// Import routes
import authRoutes from './src/routes/auth';
import cartRoutes from './src/routes/cart';
import ordersRoutes from './src/routes/orders';
import productsRoutes from './src/routes/products';
import userRoutes from './src/routes/user';
import addressRoutes from './src/routes/address';
import eventsRoutes from './src/routes/events';
import feedbackRoutes from './src/routes/feedback';
import adminRoutes from './src/routes/admin';

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy (required for Render and secure cookies)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing
app.use(express.json());

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Import error handler
import { errorHandler } from './src/lib/api-handler-express';

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/user', userRoutes);
app.use('/api/user/addresses', addressRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin', adminRoutes);

// Error handling
app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`);
    console.log(`📦 API endpoints available at http://localhost:${PORT}/api/*`);
  });
}

export default app;
