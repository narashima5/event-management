import { Router } from 'express';
import { RegistrationController } from '../controllers/registrationController';
import { authenticateUser, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticateUser);

router.get('/:id', requireRole('admin', 'coordinator'), RegistrationController.getRegistration);
router.patch(
  '/:id/attendance',
  requireRole('admin', 'coordinator'),
  RegistrationController.markAttendance
);
router.patch('/:id/status', requireRole('admin'), RegistrationController.updateStatus);

export default router;
