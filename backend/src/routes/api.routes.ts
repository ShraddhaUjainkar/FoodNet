import { Router } from 'express';
import { analyzeController } from '../controllers/analyze.controller.js';
import { getScanController, getAllScansController } from '../controllers/scan.controller.js';
import { getStatusController } from '../controllers/status.controller.js';
import { rateLimiterMiddleware } from '../middleware/rateLimit.middleware.js';

const router = Router();

router.post('/analyze', rateLimiterMiddleware, analyzeController);
router.get('/analyze/status/:id', getStatusController);

// Support both singular and plural for absolute compatibility with frontend ports
router.get('/scans', getAllScansController);
router.get('/scans/:id', getScanController);
router.get('/scan/:id', getScanController);

export default router;
