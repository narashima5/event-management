import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticateUser, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticateUser);

// Current user profile lookup and update
router.get('/me', UserController.getCurrentUserProfile);
router.patch('/me', UserController.updateCurrentProfile);
router.put('/me', UserController.updateCurrentProfile);

// Admin-only user management
router.get('/', requireRole('admin'), UserController.listUsers);
router.post('/', requireRole('admin'), UserController.createUser);
router.get('/:uid', requireRole('admin'), UserController.getUserDetails);
router.patch('/:uid/status', requireRole('admin'), UserController.updateUserStatus);
router.put('/:uid/status', requireRole('admin'), UserController.updateUserStatus);
router.patch('/:uid/role', requireRole('admin'), UserController.updateUserRole);
router.put('/:uid/role', requireRole('admin'), UserController.updateUserRole);

export default router;
