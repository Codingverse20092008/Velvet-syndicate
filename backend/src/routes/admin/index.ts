import { Router } from 'express';
import settingsRoutes from './settings';

const router = Router();

router.use('/settings', settingsRoutes);

export default router;
