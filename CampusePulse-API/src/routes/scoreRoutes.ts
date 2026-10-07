import { Router } from 'express';
import { ScoreController } from '../controllers/scoreController';
import { authenticateUser, requireRole, requireProgramAccess } from '../middleware/auth';

const router = Router();

router.use(authenticateUser);

// Jury gets evaluations for assigned program
router.get(
  '/programs/:programId/evaluations',
  requireProgramAccess,
  requireRole('jury'),
  ScoreController.getJuryEvaluations
);

// Jury saves draft or submits score for participant
router.post(
  '/programs/:programId/registrations/:registrationId',
  requireProgramAccess,
  requireRole('jury'),
  ScoreController.saveOrSubmitScore
);

// Admin unlocks a locked score
router.post(
  '/:scoreId/unlock',
  requireRole('admin'),
  ScoreController.unlockScore
);

// Admin or assigned Coordinator gets all jury scores for a program
router.get(
  '/programs/:programId/all',
  requireProgramAccess,
  requireRole('admin', 'coordinator'),
  ScoreController.getProgramScores
);

export default router;
