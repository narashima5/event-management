import { Router } from 'express';
import { ProgramController } from '../controllers/programController';
import { authenticateUser, requireRole, requireProgramAccess } from '../middleware/auth';

const router = Router();

router.use(authenticateUser);

// List programs: admin sees all; coordinator and jury only see assigned programs
router.get('/', ProgramController.listPrograms);

// Create program: admin only
router.post('/', requireRole('admin'), ProgramController.createProgram);

// Program specific routes - verify user has program access!
router.get('/:programId', requireProgramAccess, ProgramController.getProgram);
router.put('/:programId', requireRole('admin'), ProgramController.updateProgram);
router.patch('/:programId/status', requireRole('admin'), ProgramController.updateStatus);

// Participants for a program: Admin or assigned Coordinator
router.get(
  '/:programId/participants',
  requireProgramAccess,
  requireRole('admin', 'coordinator'),
  ProgramController.getProgramParticipants
);

// Calculate results: Admin or assigned Coordinator
router.post(
  '/:programId/calculate-results',
  requireProgramAccess,
  requireRole('admin', 'coordinator'),
  ProgramController.calculateResults
);

// Publish results: Admin only
router.post(
  '/:programId/publish-results',
  requireRole('admin'),
  ProgramController.publishResults
);

// Unpublish results: Admin only
router.post(
  '/:programId/unpublish-results',
  requireRole('admin'),
  ProgramController.unpublishResults
);

// View results: Admin, assigned coordinator, or assigned jury
router.get(
  '/:programId/results',
  requireProgramAccess,
  ProgramController.getResults
);

export default router;
