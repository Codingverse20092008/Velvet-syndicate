import { Router } from 'express';
import analyticsRoutes from './analytics';
import settingsRoutes from './settings';

const router = Router();

router.use('/analytics', analyticsRoutes);
router.use('/settings', settingsRoutes);

export default router;
