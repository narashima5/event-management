import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database/firestore';
import {
  PublicRegistrationInputSchema,
  Registration,
  AttendanceStatus,
  RegistrationStatus,
} from '../types';
import { RegistrationService } from '../services/registrationService';
import { AuditService } from '../services/auditService';

export class RegistrationController {
  /**
   * Public participant registration
   */
  static async registerPublic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const eventCode = String(req.params.eventCode || req.params.eventSlug || req.params.eventCodeOrSlug);
      const programCode = String(req.params.programCode || req.params.programSlug || req.params.programCodeOrSlug);
      const input = PublicRegistrationInputSchema.parse(req.body);

      const registration = await RegistrationService.registerParticipant(
        eventCode,
        programCode,
        input
      );

      res.status(201).json({
        success: true,
        message: 'Registration successful!',
        data: registration,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public program and event info for registration desk
   */
  static async getPublicProgramDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const eventCode = String(req.params.eventCode || req.params.eventSlug || req.params.eventCodeOrSlug);
      const programCode = String(req.params.programCode || req.params.programSlug || req.params.programCodeOrSlug);

      const details = await RegistrationService.getProgramDetails(eventCode, programCode);

      res.json({
        success: true,
        data: details,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public confirmation lookup by registration number
   */
  static async getPublicConfirmation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const regNumber = String(req.params.regNumber).toUpperCase();
      const db = getDb();

      const snapshot = await db
        .collection('registrations')
        .where('registrationNumber', '==', regNumber)
        .limit(1)
        .get();

      if (snapshot.empty) {
        res.status(404).json({
          success: false,
          message: 'Registration not found',
          code: 'REGISTRATION_NOT_FOUND',
        });
        return;
      }

      const reg = snapshot.docs[0].data() as Registration;

      // Return public confirmation slip details
      res.json({
        success: true,
        data: {
          id: reg.id,
          registrationNumber: reg.registrationNumber,
          eventName: reg.eventName,
          programName: reg.programName,
          participantType: reg.participantType,
          teamName: reg.teamName,
          teamMembers: reg.teamMembers,
          department: reg.department,
          status: reg.status,
          registeredAt: reg.registeredAt,
          participantData: {
            name: reg.participantData?.name || reg.participantData?.fullName,
            department: reg.participantData?.department,
            registerNumber: reg.participantData?.registerNumber || reg.participantData?.studentId,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Protected: Get registration details
   */
  static async getRegistration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const regId = String(req.params.id);
      const doc = await db.collection('registrations').doc(regId).get();

      if (!doc.exists) {
        res.status(404).json({
          success: false,
          message: 'Registration not found',
          code: 'REGISTRATION_NOT_FOUND',
        });
        return;
      }

      const reg = doc.data() as Registration;

      // If coordinator, check if assigned to this program
      if (req.user?.role === 'coordinator') {
        const assignment = await db
          .collection('assignments')
          .where('userId', '==', req.user.uid)
          .where('programId', '==', reg.programId)
          .where('status', '==', 'ACTIVE')
          .get();

        if (assignment.empty) {
          res.status(403).json({
            success: false,
            message: 'Forbidden: You are not assigned to this registration’s program',
            code: 'FORBIDDEN',
          });
          return;
        }
      }

      res.json({
        success: true,
        data: reg,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mark attendance / check-in (Coordinator or Admin)
   */
  static async markAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { attendanceStatus } = req.body as { attendanceStatus: AttendanceStatus };
      if (!['PENDING', 'PRESENT', 'ABSENT'].includes(attendanceStatus)) {
        res.status(400).json({
          success: false,
          message: 'Invalid attendance status. Must be PENDING, PRESENT, or ABSENT.',
        });
        return;
      }

      const db = getDb();
      const regId = String(req.params.id);
      const regRef = db.collection('registrations').doc(regId);
      const doc = await regRef.get();

      if (!doc.exists) {
        res.status(404).json({ success: false, message: 'Registration not found' });
        return;
      }

      const reg = doc.data() as Registration;

      // Check coordinator assignment if coordinator
      if (req.user?.role === 'coordinator') {
        const assignment = await db
          .collection('assignments')
          .where('userId', '==', req.user.uid)
          .where('programId', '==', reg.programId)
          .where('status', '==', 'ACTIVE')
          .get();

        if (assignment.empty) {
          res.status(403).json({
            success: false,
            message: 'Forbidden: You are not assigned to this program',
            code: 'FORBIDDEN',
          });
          return;
        }
      }

      const now = new Date().toISOString();
      await regRef.update({
        attendanceStatus,
        updatedAt: now,
      });

      await AuditService.logAction({
        userId: req.user?.uid || 'user',
        userName: req.user?.name,
        userRole: req.user?.role,
        action: 'ATTENDANCE_MARKED',
        entity: 'registration',
        entityId: regId,
        metadata: {
          registrationNumber: reg.registrationNumber,
          programId: reg.programId,
          attendanceStatus,
        },
      });

      res.json({
        success: true,
        message: `Attendance marked as ${attendanceStatus}`,
        data: { id: regId, attendanceStatus },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update registration status (Admin only)
   */
  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = req.body as { status: RegistrationStatus };
      if (!['PENDING', 'CONFIRMED', 'CANCELLED', 'DISQUALIFIED'].includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Invalid registration status',
        });
        return;
      }

      const db = getDb();
      const regId = String(req.params.id);
      const regRef = db.collection('registrations').doc(regId);
      const doc = await regRef.get();

      if (!doc.exists) {
        res.status(404).json({ success: false, message: 'Registration not found' });
        return;
      }

      const prevStatus = doc.data().status;
      const now = new Date().toISOString();

      await regRef.update({
        status,
        updatedAt: now,
      });

      await AuditService.logAction({
        userId: req.user?.uid || 'admin',
        userName: req.user?.name,
        userRole: req.user?.role,
        action: 'REGISTRATION_STATUS_UPDATED',
        entity: 'registration',
        entityId: regId,
        metadata: { from: prevStatus, to: status },
      });

      res.json({
        success: true,
        message: `Registration status updated to ${status}`,
        data: { id: regId, status },
      });
    } catch (err) {
      next(err);
    }
  }
}
