import { Router } from 'express';
import { EventController } from '../controllers/eventController';
import { authenticateUser, requireRole } from '../middleware/auth';

const router = Router();

// Public routes for events are under /api/public/events
// Protected admin & internal routes:
router.use(authenticateUser);

router.get('/', EventController.listEvents);
router.get('/:id', EventController.getEvent);
router.post('/', requireRole('admin'), EventController.createEvent);
router.put('/:id', requireRole('admin'), EventController.updateEvent);
router.patch('/:id/status', requireRole('admin'), EventController.updateEventStatus);
router.delete('/:id', requireRole('admin'), EventController.deleteEvent);

export default router;
