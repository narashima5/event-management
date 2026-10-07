import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database/firestore';
import { Assignment } from '../types';
import { AuditService } from '../services/auditService';

export class AssignmentController {
  static async listAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      let query = db.collection('assignments');

      if (req.query.userId) {
        query = query.where('userId', '==', req.query.userId);
      }
      if (req.query.programId) {
        query = query.where('programId', '==', req.query.programId);
      }
      if (req.query.role) {
        query = query.where('role', '==', req.query.role);
      }

      const snapshot = await query.get();
      const assignments = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));

      res.json({
        success: true,
        data: assignments,
      });
    } catch (err) {
      next(err);
    }
  }

  static async createAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, role, eventId, programId } = req.body;
      if (!userId || !role || !eventId || !programId) {
        res.status(400).json({
          success: false,
          message: 'userId, role, eventId, and programId are required',
        });
        return;
      }

      const db = getDb();

      // Check if user exists
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }
      const userData = userDoc.data();

      // Check duplicate assignment
      const existing = await db
        .collection('assignments')
        .where('userId', '==', userId)
        .where('programId', '==', programId)
        .where('role', '==', role)
        .get();

      if (!existing.empty) {
        res.status(409).json({
          success: false,
          message: `User is already assigned to this program as ${role}`,
        });
        return;
      }

      const assignmentId = `asgn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      const newAssignment: Assignment = {
        id: assignmentId,
        userId,
        userName: userData.name,
        userEmail: userData.email,
        role,
        eventId,
        programId,
        status: 'ACTIVE',
        assignedAt: now,
        assignedBy: req.user!.uid,
      };

      await db.collection('assignments').doc(assignmentId).set(newAssignment);

      await AuditService.logAction({
        userId: req.user!.uid,
        userName: req.user!.name,
        userRole: 'admin',
        action: 'PROGRAM_ASSIGNMENT_CREATED',
        entity: 'assignment',
        entityId: assignmentId,
        metadata: {
          assignedUser: userData.name,
          role,
          programId,
          eventId,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Assignment created successfully',
        data: newAssignment,
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const asgnId = String(req.params.id);
      const asgnRef = db.collection('assignments').doc(asgnId);
      const doc = await asgnRef.get();

      if (!doc.exists) {
        res.status(404).json({ success: false, message: 'Assignment not found' });
        return;
      }

      await asgnRef.delete();

      await AuditService.logAction({
        userId: req.user!.uid,
        userName: req.user!.name,
        userRole: 'admin',
        action: 'PROGRAM_ASSIGNMENT_DELETED',
        entity: 'assignment',
        entityId: asgnId,
      });

      res.json({
        success: true,
        message: 'Assignment removed successfully',
      });
    } catch (err) {
      next(err);
    }
  }
}
