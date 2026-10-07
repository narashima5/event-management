import { getDb } from '../database/firestore';
import { Program, Registration, PublicRegistrationInput } from '../types';
import { AuditService } from './auditService';

export class RegistrationService {
  /**
   * Fetch public program details by event code/slug and program code/slug
   */
  static async getProgramDetails(
    eventCodeOrSlug: string,
    programCodeOrSlug: string
  ): Promise<{ event: any; program: Program }> {
    const db = getDb();

    // 1. Fetch Event by code or slug
    let eventDoc: any = null;
    const byCode = await db
      .collection('events')
      .where('code', '==', eventCodeOrSlug.toUpperCase())
      .limit(1)
      .get();

    if (!byCode.empty) {
      eventDoc = byCode.docs[0];
    } else {
      const bySlug = await db
        .collection('events')
        .where('slug', '==', eventCodeOrSlug.toLowerCase())
        .limit(1)
        .get();
      if (!bySlug.empty) {
        eventDoc = bySlug.docs[0];
      }
    }

    if (!eventDoc) {
      const err: any = new Error(`Event '${eventCodeOrSlug}' not found`);
      err.statusCode = 404;
      err.code = 'EVENT_NOT_FOUND';
      throw err;
    }

    const event = { id: eventDoc.id, ...eventDoc.data() };

    // 2. Fetch Program by code or slug within this event
    let programDoc: any = null;
    const pByCode = await db
      .collection('programs')
      .where('eventId', '==', eventDoc.id)
      .where('code', '==', programCodeOrSlug.toUpperCase())
      .limit(1)
      .get();

    if (!pByCode.empty) {
      programDoc = pByCode.docs[0];
    } else {
      const pBySlug = await db
        .collection('programs')
        .where('eventId', '==', eventDoc.id)
        .where('slug', '==', programCodeOrSlug.toLowerCase())
        .limit(1)
        .get();
      if (!pBySlug.empty) {
        programDoc = pBySlug.docs[0];
      }
    }

    if (!programDoc) {
      const err: any = new Error(
        `Program '${programCodeOrSlug}' not found in event '${event.name}'`
      );
      err.statusCode = 404;
      err.code = 'PROGRAM_NOT_FOUND';
      throw err;
    }

    const program = { id: programDoc.id, ...programDoc.data() } as Program;

    return { event, program };
  }

  /**
   * Register a participant for a program with transactional capacity enforcement
   */
  static async registerParticipant(
    eventCodeOrSlug: string,
    programCodeOrSlug: string,
    input: PublicRegistrationInput
  ): Promise<Registration> {
    const db = getDb();

    // 1. Fetch Event by code or slug
    let eventDoc: any = null;
    const byCode = await db
      .collection('events')
      .where('code', '==', eventCodeOrSlug.toUpperCase())
      .limit(1)
      .get();

    if (!byCode.empty) {
      eventDoc = byCode.docs[0];
    } else {
      const bySlug = await db
        .collection('events')
        .where('slug', '==', eventCodeOrSlug.toLowerCase())
        .limit(1)
        .get();
      if (!bySlug.empty) {
        eventDoc = bySlug.docs[0];
      }
    }

    if (!eventDoc) {
      const err: any = new Error(`Event '${eventCodeOrSlug}' not found`);
      err.statusCode = 404;
      err.code = 'EVENT_NOT_FOUND';
      throw err;
    }

    const event = eventDoc.data();

    // Validate Event Status
    if (event.status === 'DRAFT' || event.status === 'ARCHIVED') {
      const err: any = new Error(
        `Event '${event.name}' is currently not accepting registrations (Status: ${event.status})`
      );
      err.statusCode = 400;
      err.code = 'EVENT_NOT_ACTIVE';
      throw err;
    }

    // 2. Fetch Program by code or slug
    let programDoc: any = null;
    const pByCode = await db
      .collection('programs')
      .where('eventId', '==', eventDoc.id)
      .where('code', '==', programCodeOrSlug.toUpperCase())
      .limit(1)
      .get();

    if (!pByCode.empty) {
      programDoc = pByCode.docs[0];
    } else {
      const pBySlug = await db
        .collection('programs')
        .where('eventId', '==', eventDoc.id)
        .where('slug', '==', programCodeOrSlug.toLowerCase())
        .limit(1)
        .get();
      if (!pBySlug.empty) {
        programDoc = pBySlug.docs[0];
      }
    }

    if (!programDoc) {
      const err: any = new Error(
        `Program '${programCodeOrSlug}' not found in event '${event.name}'`
      );
      err.statusCode = 404;
      err.code = 'PROGRAM_NOT_FOUND';
      throw err;
    }

    const program = programDoc.data() as Program;
    const programId = programDoc.id;

    // 3. Validate Program Status & Registration Window
    if (program.status !== 'REGISTRATION_OPEN') {
      const err: any = new Error(
        `Registration is currently closed for program '${program.name}' (Status: ${program.status})`
      );
      err.statusCode = 400;
      err.code = 'REGISTRATION_CLOSED';
      throw err;
    }

    const now = new Date();
    if (program.registrationEnd && new Date(program.registrationEnd) < now) {
      const err: any = new Error(
        `Registration deadline has passed for program '${program.name}'`
      );
      err.statusCode = 400;
      err.code = 'REGISTRATION_DEADLINE_PASSED';
      throw err;
    }

    if (program.registrationStart && new Date(program.registrationStart) > now) {
      const err: any = new Error(
        `Registration has not opened yet for program '${program.name}'`
      );
      err.statusCode = 400;
      err.code = 'REGISTRATION_NOT_STARTED';
      throw err;
    }

    // 4. Initial Capacity Check
    const currentCount = program.registeredCount || 0;
    if (currentCount >= program.capacity) {
      const err: any = new Error(
        `Program capacity reached (${program.capacity}/${program.capacity}). No more seats available.`
      );
      err.statusCode = 400;
      err.code = 'CAPACITY_REACHED';
      throw err;
    }

    // 5. Dynamic Custom Fields Validation
    const errors: Array<{ field: string; message: string }> = [];
    const fields = (program.registrationFields || []).sort(
      (a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0)
    );

    for (const field of fields) {
      const fieldKey = field.key || field.name;
      const value = input.participantData ? input.participantData[fieldKey] : undefined;

      if (field.required) {
        if (value === undefined || value === null || value === '' || (field.type === 'checkbox' && value === false)) {
          errors.push({
            field: `participantData.${fieldKey}`,
            message: `${field.label} is required`,
          });
        }
      }

      // Check regex validation rule if present and value is provided
      if (value && field.validation) {
        try {
          const regex = new RegExp(field.validation);
          if (!regex.test(String(value))) {
            errors.push({
              field: `participantData.${fieldKey}`,
              message: `${field.label} format is invalid`,
            });
          }
        } catch {
          // If not a raw regex string, ignore parsing error
        }
      }
    }

    if (errors.length > 0) {
      const err: any = new Error('Missing or invalid custom registration fields');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = { errors };
      throw err;
    }

    // 6. Duplicate Registration Detection
    const studentRegisterNo =
      input.participantData?.registerNumber ||
      input.participantData?.studentId ||
      input.participantData?.regNo ||
      input.participantData?.rollNo;

    const email = input.participantData?.email;

    const existingRegistrations = await db
      .collection('registrations')
      .where('programId', '==', programId)
      .where('status', 'in', ['CONFIRMED', 'PENDING'])
      .get();

    for (const regDoc of existingRegistrations.docs) {
      const reg = regDoc.data() as Registration;
      const existingRegNo =
        reg.participantData?.registerNumber ||
        reg.participantData?.studentId ||
        reg.participantData?.regNo ||
        reg.participantData?.rollNo;

      if (
        studentRegisterNo &&
        existingRegNo &&
        String(existingRegNo).trim().toLowerCase() === String(studentRegisterNo).trim().toLowerCase()
      ) {
        const err: any = new Error(
          `Participant with Register Number '${studentRegisterNo}' is already registered for this program`
        );
        err.statusCode = 409;
        err.code = 'DUPLICATE_REGISTRATION';
        throw err;
      }

      if (
        email &&
        reg.participantData?.email &&
        String(reg.participantData.email).trim().toLowerCase() === String(email).trim().toLowerCase()
      ) {
        const err: any = new Error(
          `Participant with Email '${email}' is already registered for this program`
        );
        err.statusCode = 409;
        err.code = 'DUPLICATE_REGISTRATION';
        throw err;
      }
    }

    // 7. Prepare Registration Record
    const regId = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const department =
      input.department ||
      input.participantData?.department ||
      input.participantData?.dept ||
      'General';

    let finalRegistrationNumber = '';

    const newRegistration: Registration = {
      id: regId,
      registrationNumber: '', // Filled in transaction
      eventId: eventDoc.id,
      eventName: event.name,
      programId,
      programName: program.name,
      participantType: input.participantType,
      participantData: input.participantData,
      teamName: input.teamName,
      teamMembers: input.teamMembers,
      department,
      status: 'CONFIRMED',
      attendanceStatus: 'PENDING',
      registeredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 8. Atomic save and transactional capacity lock
    await db.runTransaction(async (transaction: any) => {
      const progRef = db.collection('programs').doc(programId);
      const progDoc = await transaction.get(progRef);

      if (!progDoc.exists) {
        const err: any = new Error('Program not found during transaction');
        err.statusCode = 404;
        throw err;
      }

      const freshProg = progDoc.data() as Program;
      const count = freshProg.registeredCount || 0;

      if (count >= freshProg.capacity) {
        const err: any = new Error(
          `Program capacity reached (${freshProg.capacity}/${freshProg.capacity}). Registration is full.`
        );
        err.statusCode = 400;
        err.code = 'CAPACITY_REACHED';
        throw err;
      }

      const nextSeq = count + 1;
      const seqStr = String(nextSeq).padStart(4, '0');
      finalRegistrationNumber = `${event.code}-${program.code}-${seqStr}`;
      newRegistration.registrationNumber = finalRegistrationNumber;

      const regRef = db.collection('registrations').doc(regId);
      await transaction.set(regRef, newRegistration);
      await transaction.update(progRef, {
        registeredCount: nextSeq,
        updatedAt: new Date().toISOString(),
      });
    });

    // 9. Log audit
    await AuditService.logAction({
      userId: 'public_participant',
      userName: input.participantData?.name || input.teamName || 'Public Participant',
      userRole: 'public',
      action: 'PARTICIPANT_REGISTERED',
      entity: 'registration',
      entityId: regId,
      metadata: {
        registrationNumber: finalRegistrationNumber,
        eventCode: event.code,
        programCode: program.code,
        programId,
      },
    });

    return newRegistration;
  }
}
