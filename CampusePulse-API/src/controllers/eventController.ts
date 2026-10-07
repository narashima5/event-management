import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database/firestore';
import { CreateEventInputSchema, UpdateEventInputSchema, Event } from '../types';
import { AuditService } from '../services/auditService';

export class EventController {
  static async listEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      let query = db.collection('events');

      if (req.query.status) {
        query = query.where('status', '==', req.query.status);
      }

      const snapshot = await query.get();
      const events = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      }));
      events.sort((a: any, b: any) => {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
      });

      res.json({
        success: true,
        data: events,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const eventId = String(req.params.id);
      const doc = await db.collection('events').doc(eventId).get();

      if (!doc.exists) {
        res.status(404).json({
          success: false,
          message: 'Event not found',
          code: 'EVENT_NOT_FOUND',
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

  static async createEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = CreateEventInputSchema.parse(req.body);
      const db = getDb();

      // Check if code or slug already exists
      const existing = await db
        .collection('events')
        .where('code', '==', input.code.toUpperCase())
        .get();

      if (!existing.empty) {
        res.status(409).json({
          success: false,
          message: `Event with code '${input.code}' already exists`,
          code: 'EVENT_CODE_EXISTS',
        });
        return;
      }

      const eventId = `event_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      const newEvent: Event = {
        ...input,
        id: eventId,
        code: input.code.toUpperCase(),
        createdBy: req.user?.uid || 'system',
        createdAt: now,
        updatedAt: now,
      };

      await db.collection('events').doc(eventId).set(newEvent);

      await AuditService.logAction({
        userId: req.user?.uid || 'admin',
        userName: req.user?.name,
        userRole: req.user?.role,
        action: 'EVENT_CREATED',
        entity: 'event',
        entityId: eventId,
        metadata: { name: newEvent.name, code: newEvent.code },
      });

      res.status(201).json({
        success: true,
        message: 'Event created successfully',
        data: newEvent,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = UpdateEventInputSchema.parse(req.body);
      const db = getDb();
      const eventId = String(req.params.id);
      const eventRef = db.collection('events').doc(eventId);
      const doc = await eventRef.get();

      if (!doc.exists) {
        res.status(404).json({
          success: false,
          message: 'Event not found',
          code: 'EVENT_NOT_FOUND',
        });
        return;
      }

      const updateData = {
        ...input,
        updatedAt: new Date().toISOString(),
      };

      await eventRef.update(updateData);

      await AuditService.logAction({
        userId: req.user?.uid || 'admin',
        userName: req.user?.name,
        userRole: req.user?.role,
        action: 'EVENT_UPDATED',
        entity: 'event',
        entityId: eventId,
        metadata: updateData,
      });

      res.json({
        success: true,
        message: 'Event updated successfully',
        data: { id: eventId, ...doc.data(), ...updateData },
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const eventId = String(req.params.id);
      const eventRef = db.collection('events').doc(eventId);
      const doc = await eventRef.get();

      if (!doc.exists) {
        res.status(404).json({
          success: false,
          message: 'Event not found',
          code: 'EVENT_NOT_FOUND',
        });
        return;
      }

      // Soft delete: mark status as ARCHIVED
      await eventRef.update({
        status: 'ARCHIVED',
        updatedAt: new Date().toISOString(),
      });

      await AuditService.logAction({
        userId: req.user?.uid || 'admin',
        userName: req.user?.name,
        userRole: req.user?.role,
        action: 'EVENT_ARCHIVED',
        entity: 'event',
        entityId: eventId,
      });

      res.json({
        success: true,
        message: 'Event archived successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateEventStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const eventId = String(req.params.id);
      const { status } = req.body;
      const validStatuses = ['DRAFT', 'PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'ONGOING', 'COMPLETED', 'ARCHIVED'];

      if (!status || !validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of [${validStatuses.join(', ')}]`,
          code: 'INVALID_STATUS',
        });
        return;
      }

      const db = getDb();
      const eventRef = db.collection('events').doc(eventId);
      const doc = await eventRef.get();

      if (!doc.exists) {
        res.status(404).json({
          success: false,
          message: 'Event not found',
          code: 'EVENT_NOT_FOUND',
        });
        return;
      }

      const prevStatus = doc.data()?.status;
      await eventRef.update({
        status,
        updatedAt: new Date().toISOString(),
      });

      await AuditService.logAction({
        userId: req.user?.uid || 'admin',
        userName: req.user?.name,
        userRole: req.user?.role,
        action: 'EVENT_STATUS_UPDATED',
        entity: 'event',
        entityId: eventId,
        metadata: { newStatus: status, previousStatus: prevStatus },
      });

      res.json({
        success: true,
        message: `Event status updated to ${status}`,
        data: { id: eventId, status },
      });
    } catch (err) {
      next(err);
    }
  }

  // Public: List active published events
  static async listPublicEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const snapshot = await db
        .collection('events')
        .where('status', 'in', ['PUBLISHED', 'REGISTRATION_OPEN', 'ONGOING'])
        .get();

      const events = snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          code: data.code,
          slug: data.slug,
          description: data.description,
          venue: data.venue,
          startDate: data.startDate,
          endDate: data.endDate,
          registrationStart: data.registrationStart,
          registrationEnd: data.registrationEnd,
          status: data.status,
          logoUrl: data.logoUrl,
          bannerUrl: data.bannerUrl,
        };
      });

      res.json({ success: true, data: events });
    } catch (err) {
      next(err);
    }
  }

  // Public: Get public event details by code or slug with its public programs
  static async getPublicEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawParam = String(req.params.codeOrSlug);
      const codeOrSlug = rawParam.toUpperCase();
      const db = getDb();

      let eventDoc: any = null;
      const byCode = await db.collection('events').where('code', '==', codeOrSlug).limit(1).get();
      if (!byCode.empty) {
        eventDoc = byCode.docs[0];
      } else {
        const bySlug = await db.collection('events').where('slug', '==', rawParam.toLowerCase()).limit(1).get();
        if (!bySlug.empty) {
          eventDoc = bySlug.docs[0];
        }
      }

      if (!eventDoc) {
        res.status(404).json({
          success: false,
          message: 'Event not found',
          code: 'EVENT_NOT_FOUND',
        });
        return;
      }

      const eventData = eventDoc.data();

      // Fetch public programs for this event
      const progSnapshot = await db
        .collection('programs')
        .where('eventId', '==', eventDoc.id)
        .where('status', 'in', ['PUBLISHED', 'REGISTRATION_OPEN', 'ONGOING', 'RESULTS_PUBLISHED'])
        .get();

      const programs = progSnapshot.docs.map((p: any) => {
        const pData = p.data();
        return {
          id: p.id,
          name: pData.name,
          code: pData.code,
          slug: pData.slug,
          description: pData.description,
          category: pData.category,
          participationType: pData.participationType,
          venue: pData.venue,
          date: pData.date,
          startTime: pData.startTime,
          endTime: pData.endTime,
          capacity: pData.capacity,
          registeredCount: pData.registeredCount,
          status: pData.status,
          registrationStart: pData.registrationStart,
          registrationEnd: pData.registrationEnd,
          rules: pData.rules,
          instructions: pData.instructions,
          registrationFields: pData.registrationFields,
        };
      });

      res.json({
        success: true,
        data: {
          event: {
            id: eventDoc.id,
            name: eventData.name,
            code: eventData.code,
            slug: eventData.slug,
            description: eventData.description,
            venue: eventData.venue,
            startDate: eventData.startDate,
            endDate: eventData.endDate,
            registrationStart: eventData.registrationStart,
            registrationEnd: eventData.registrationEnd,
            status: eventData.status,
            logoUrl: eventData.logoUrl,
            bannerUrl: eventData.bannerUrl,
            contactInfo: eventData.contactInfo,
            rules: eventData.rules,
          },
          programs,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
