import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database/firestore';
import {
  CreateProgramInputSchema,
  UpdateProgramInputSchema,
  Program,
} from '../types';
import { AuditService } from '../services/auditService';
import { ResultService } from '../services/resultService';

export class ProgramController {
  /**
   * List programs.
   * If Admin: returns all programs (or filter by eventId)
   * If Coordinator or Jury: returns ONLY programs where the user has an active assignment!
   */
  static async listPrograms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const user = req.user!;

      let programs: Program[] = [];

      if (user.role === 'admin') {
        let query = db.collection('programs');
        if (req.query.eventId) {
          query = query.where('eventId', '==', req.query.eventId);
        }
        if (req.query.status) {
          query = query.where('status', '==', req.query.status);
        }
        const snapshot = await query.get();
        programs = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      } else {
        // Coordinator or Jury: Find assignments first
        const assignmentsSnapshot = await db
          .collection('assignments')
          .where('userId', '==', user.uid)
          .where('status', '==', 'ACTIVE')
          .get();

        const assignedProgramIds = assignmentsSnapshot.docs.map(
          (d: any) => d.data().programId
        );

        if (assignedProgramIds.length === 0) {
          res.json({ success: true, data: [] });
          return;
        }

        // Fetch each assigned program
        for (const progId of assignedProgramIds) {
          const pDoc = await db.collection('programs').doc(progId).get();
          if (pDoc.exists) {
            programs.push({ id: pDoc.id, ...pDoc.data() });
          }
        }
      }

      res.json({
        success: true,
        data: programs,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getProgram(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const programId = String(req.params.programId);
      const doc = await db.collection('programs').doc(programId).get();

      if (!doc.exists) {
        res.status(404).json({
          success: false,
          message: 'Program not found',
          code: 'PROGRAM_NOT_FOUND',
        });
        return;
      }

      res.json({
        success: true,
        data: { id: doc.id, ...doc.data() },
      });
    } catch (err) {
      next(err);
    }
  }

  static async createProgram(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = CreateProgramInputSchema.parse(req.body);
      const db = getDb();

      // Check event existence
      const eventDoc = await db.collection('events').doc(input.eventId).get();
      if (!eventDoc.exists) {
        res.status(404).json({
          success: false,
          message: 'Referenced Event does not exist',
          code: 'EVENT_NOT_FOUND',
        });
        return;
      }

      // Check program code uniqueness in this event
      const existing = await db
        .collection('programs')
        .where('eventId', '==', input.eventId)
        .where('code', '==', input.code.toUpperCase())
        .get();

      if (!existing.empty) {
        res.status(409).json({
          success: false,
          message: `Program code '${input.code}' already exists in this event`,
          code: 'PROGRAM_CODE_EXISTS',
        });
        return;
      }

      const programId = `prog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      const newProgram: Program = {
        ...input,
        id: programId,
        code: input.code.toUpperCase(),
        registeredCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      await db.collection('programs').doc(programId).set(newProgram);

      await AuditService.logAction({
        userId: req.user?.uid || 'admin',
        userName: req.user?.name,
        userRole: req.user?.role,
        action: 'PROGRAM_CREATED',
        entity: 'program',
        entityId: programId,
        metadata: { name: newProgram.name, code: newProgram.code, eventId: input.eventId },
      });

      res.status(201).json({
        success: true,
        message: 'Program created successfully',
        data: newProgram,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateProgram(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = UpdateProgramInputSchema.parse(req.body);
      const db = getDb();
      const programId = String(req.params.programId);
      const progRef = db.collection('programs').doc(programId);
      const doc = await progRef.get();

      if (!doc.exists) {
        res.status(404).json({
          success: false,
          message: 'Program not found',
          code: 'PROGRAM_NOT_FOUND',
        });
        return;
      }

      const updateData = {
        ...input,
        updatedAt: new Date().toISOString(),
      };

      await progRef.update(updateData);

      await AuditService.logAction({
        userId: req.user?.uid || 'admin',
        userName: req.user?.name,
        userRole: req.user?.role,
        action: 'PROGRAM_UPDATED',
        entity: 'program',
        entityId: programId,
        metadata: updateData,
      });

      res.json({
        success: true,
        message: 'Program updated successfully',
        data: { id: programId, ...doc.data(), ...updateData },
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = req.body;
      if (!status) {
        res.status(400).json({ success: false, message: 'Status is required' });
        return;
      }

      const db = getDb();
      const programId = String(req.params.programId);
      const progRef = db.collection('programs').doc(programId);
      const doc = await progRef.get();

      if (!doc.exists) {
        res.status(404).json({ success: false, message: 'Program not found' });
        return;
      }

      const prevStatus = doc.data().status;
      await progRef.update({
        status,
        updatedAt: new Date().toISOString(),
      });

      await AuditService.logAction({
        userId: req.user?.uid || 'admin',
        userName: req.user?.name,
        userRole: req.user?.role,
        action: 'PROGRAM_STATUS_CHANGED',
        entity: 'program',
        entityId: programId,
        metadata: { from: prevStatus, to: status },
      });

      res.json({
        success: true,
        message: `Program status changed to ${status}`,
        data: { id: programId, status },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get participants registered for a program (Admin or assigned Coordinator)
   */
  static async getProgramParticipants(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const programId = String(req.params.programId);

      let query = db.collection('registrations').where('programId', '==', programId);
      if (req.query.attendanceStatus) {
        query = query.where('attendanceStatus', '==', req.query.attendanceStatus);
      }
      if (req.query.status) {
        query = query.where('status', '==', req.query.status);
      }

      const snapshot = await query.orderBy('registeredAt', 'asc').get();
      const participants = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));

      res.json({
        success: true,
        data: participants,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Triggers result calculation on backend
   */
  static async calculateResults(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const programId = String(req.params.programId);
      const outcome = await ResultService.calculateProgramResults(
        programId,
        req.user?.uid || 'system'
      );
      res.json({
        success: true,
        message: outcome.incompleteJudging
          ? 'Results calculated (Note: incomplete judging panel)'
          : 'Results calculated successfully',
        data: outcome.results,
        incompleteJudging: outcome.incompleteJudging,
        completedJuryCount: outcome.completedJuryCount,
        totalJuriesAssigned: outcome.totalJuriesAssigned,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Publishes calculated results
   */
  static async publishResults(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const programId = String(req.params.programId);
      await ResultService.publishProgramResults(
        programId,
        req.user?.uid || 'admin'
      );
      res.json({
        success: true,
        message: 'Program results published successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Unpublishes results (reverts to draft)
   */
  static async unpublishResults(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const programId = String(req.params.programId);
      await ResultService.unpublishProgramResults(
        programId,
        req.user?.uid || 'admin'
      );
      res.json({
        success: true,
        message: 'Program results unpublished successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get calculated results for program
   */
  static async getResults(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const programId = String(req.params.programId);

      const resultsSnapshot = await db
        .collection('results')
        .where('programId', '==', programId)
        .orderBy('rank', 'asc')
        .get();

      const results = resultsSnapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));

      res.json({
        success: true,
        data: results,
      });
    } catch (err) {
      next(err);
    }
  }
}
