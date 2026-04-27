import { Router } from 'express';
import analyticsRoutes from './analytics';

const router = Router();

router.use('/analytics', analyticsRoutes);

export default router;
