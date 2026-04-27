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

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true
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

// Error handling
app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`);
    console.log(`📦 API endpoints available at http://localhost:${PORT}/api/*`);
  });
}

export default app;
