import { Router } from 'express';
import { AuditController } from '../controllers/auditController';
import { authenticateUser, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticateUser);

// Admin-only audit log inspection
router.get('/', requireRole('admin'), AuditController.listLogs);

export default router;
