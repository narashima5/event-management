import { Router } from 'express';
import { AssignmentController } from '../controllers/assignmentController';
import { authenticateUser, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticateUser);

// Admin only
router.get('/', requireRole('admin'), AssignmentController.listAssignments);
router.post('/', requireRole('admin'), AssignmentController.createAssignment);
router.delete('/:id', requireRole('admin'), AssignmentController.deleteAssignment);

export default router;
