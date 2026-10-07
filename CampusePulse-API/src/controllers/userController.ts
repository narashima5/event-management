import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database/firestore';
import { User, UserSchema } from '../types';
import { AuditService } from '../services/auditService';

export class UserController {
  static async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      let query = db.collection('users');

      if (req.query.role) {
        query = query.where('role', '==', req.query.role);
      }
      if (req.query.status) {
        query = query.where('status', '==', req.query.status);
      }

      const snapshot = await query.get();
      const users = snapshot.docs.map((d: any) => ({
        uid: d.id,
        ...d.data(),
      }));

      res.json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  }

  static async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, role, phone, department } = req.body;
      if (!name || !email || !role) {
        res.status(400).json({ success: false, message: 'Name, email and role are required' });
        return;
      }

      const db = getDb();
      const existing = await db.collection('users').where('email', '==', email.toLowerCase()).get();
      if (!existing.empty) {
        res.status(409).json({ success: false, message: 'User with this email already exists' });
        return;
      }

      const uid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();

      const newUser: User = {
        uid,
        name,
        email: email.toLowerCase(),
        role,
        phone,
        department,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      };

      await db.collection('users').doc(uid).set(newUser);

      await AuditService.logAction({
        userId: req.user!.uid,
        userName: req.user!.name,
        userRole: 'admin',
        action: 'USER_CREATED',
        entity: 'user',
        entityId: uid,
        metadata: { name, email, role },
      });

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: newUser,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const uid = String(req.params.uid);
      const { status } = req.body;
      if (!['ACTIVE', 'INACTIVE'].includes(status)) {
        res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE' });
        return;
      }

      const db = getDb();
      const userRef = db.collection('users').doc(uid);
      const doc = await userRef.get();

      if (!doc.exists) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      await userRef.update({
        status,
        updatedAt: new Date().toISOString(),
      });

      await AuditService.logAction({
        userId: req.user!.uid,
        userName: req.user!.name,
        userRole: 'admin',
        action: 'USER_STATUS_UPDATED',
        entity: 'user',
        entityId: uid,
        metadata: { newStatus: status },
      });

      res.json({
        success: true,
        message: `User status updated to ${status}`,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get specific user details with active assignments (Admin only)
   */
  static async getUserDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const uid = String(req.params.uid);
      const db = getDb();
      const userDoc = await db.collection('users').doc(uid).get();

      if (!userDoc.exists) {
        res.status(404).json({ success: false, message: 'User not found', code: 'USER_NOT_FOUND' });
        return;
      }

      const userData = userDoc.data();
      const asgnSnapshot = await db
        .collection('assignments')
        .where('userId', '==', uid)
        .get();

      const assignments = asgnSnapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));

      res.json({
        success: true,
        data: {
          user: userData,
          assignments,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin updates another user's role (Strict protection: users CANNOT change their own role)
   */
  static async updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetUid = String(req.params.uid);
      const { role } = req.body;

      if (!role || !['admin', 'coordinator', 'jury', 'public'].includes(role)) {
        res.status(400).json({
          success: false,
          message: 'Invalid role. Must be admin, coordinator, or jury',
          code: 'INVALID_ROLE',
        });
        return;
      }

      // Security requirement: Users must NOT be able to change their own role!
      if (req.user!.uid === targetUid) {
        res.status(403).json({
          success: false,
          message: 'Users are not permitted to change their own role.',
          code: 'CANNOT_CHANGE_OWN_ROLE',
        });
        return;
      }

      const db = getDb();
      const userRef = db.collection('users').doc(targetUid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        res.status(404).json({ success: false, message: 'User not found', code: 'USER_NOT_FOUND' });
        return;
      }

      const prevRole = userDoc.data()?.role;
      await userRef.update({
        role,
        updatedAt: new Date().toISOString(),
      });

      await AuditService.logAction({
        userId: req.user!.uid,
        userName: req.user!.name,
        userRole: 'admin',
        action: 'USER_ROLE_UPDATED',
        entity: 'user',
        entityId: targetUid,
        metadata: { newRole: role, previousRole: prevRole },
      });

      res.json({
        success: true,
        message: `User role updated to ${role}`,
        data: { uid: targetUid, role },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update current user profile (Rejects any attempt to escalate or alter own role)
   */
  static async updateCurrentProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { role, name, phone, department } = req.body;

      // Security barrier: Non-negotiable rejection of self-role escalation
      if (role !== undefined) {
        res.status(403).json({
          success: false,
          message: 'Users are not permitted to change their own role.',
          code: 'CANNOT_CHANGE_OWN_ROLE',
        });
        return;
      }

      const db = getDb();
      const userRef = db.collection('users').doc(req.user!.uid);
      const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
      if (name) updates.name = name;
      if (phone) updates.phone = phone;
      if (department) updates.department = department;

      await userRef.update(updates);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { uid: req.user!.uid, ...updates },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get current authenticated user profile & their assigned programs
   */
  static async getCurrentUserProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const db = getDb();

      // Fetch user assignments if coordinator or jury
      let assignments: any[] = [];
      if (user.role === 'coordinator' || user.role === 'jury') {
        const asgnSnapshot = await db
          .collection('assignments')
          .where('userId', '==', user.uid)
          .get();

        assignments = asgnSnapshot.docs
          .filter((d: any) => (d.data().status || '').toLowerCase() === 'active')
          .map((d: any) => ({ id: d.id, ...d.data() }));
      }

      res.json({
        success: true,
        data: {
          user,
          assignments,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
