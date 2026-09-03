import { Router } from 'express';
import { analyzeController } from '../controllers/analyze.controller.js';
import {
  getScanController,
  getAllScansController,
  migrateScansController,
  deleteScanController,
} from '../controllers/scan.controller.js';
import { getStatusController } from '../controllers/status.controller.js';
import { rateLimiterMiddleware } from '../middleware/rateLimit.middleware.js';
import { authAndLimitMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/analyze', rateLimiterMiddleware, authAndLimitMiddleware, analyzeController);
router.get('/analyze/status/:id', getStatusController);

// Support both singular and plural for absolute compatibility with frontend ports
router.get('/scans', getAllScansController);
router.get('/scans/:id', getScanController);
router.get('/scan/:id', getScanController);

// Migration & Deletion endpoints
router.post('/scans/migrate', migrateScansController);
router.delete('/scans/:id', deleteScanController);
router.delete('/scan/:id', deleteScanController);

export default router;
