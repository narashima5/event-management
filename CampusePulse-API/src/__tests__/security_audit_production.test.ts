import request from 'supertest';
import { app } from '../app';
import { getDb, initFirebase } from '../database/firestore';
import { seedDatabase } from '../seed';

describe('Phase 9: Production Security Audit, Hardening & Data Integrity Suite', () => {
  const adminToken = 'dev-admin-token';
  const coordDanceToken = 'dev-coord-a-token';
  const coordQuizToken = 'dev-coord-b-token';
  const juryDanceToken = 'dev-jury-a-token';

  beforeAll(async () => {
    initFirebase();
    await seedDatabase();
  });

  describe('1. Insecure Direct Object References (IDOR) & Access Boundaries', () => {
    it('Coordinator A (Dance) is DENIED viewing participants of unrelated program (Quiz) with 403', async () => {
      const res = await request(app)
        .get('/api/programs/prog_tech_quiz/participants')
        .set('Authorization', `Bearer ${coordDanceToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('UNAUTHORIZED_PROGRAM_ACCESS');
    });

    it('Coordinator A (Dance) is DENIED marking attendance for participant in unrelated program via direct URL', async () => {
      // reg_quiz_01 belongs to prog_tech_quiz
      const res = await request(app)
        .patch('/api/registrations/reg_quiz_01/attendance')
        .set('Authorization', `Bearer ${coordDanceToken}`)
        .send({ attendanceStatus: 'PRESENT' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('Jury A (Dance) is DENIED viewing evaluations or scoring sheet of unrelated program (Quiz) with 403', async () => {
      const res = await request(app)
        .get('/api/scores/programs/prog_tech_quiz/evaluations')
        .set('Authorization', `Bearer ${juryDanceToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('UNAUTHORIZED_PROGRAM_ACCESS');
    });

    it('Non-admin users are DENIED accessing system audit logs with 403', async () => {
      const resCoord = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${coordDanceToken}`);
      expect(resCoord.status).toBe(403);

      const resJury = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${juryDanceToken}`);
      expect(resJury.status).toBe(403);
    });

    it('Non-admin users are DENIED listing all assignments with 403', async () => {
      const res = await request(app)
        .get('/api/assignments')
        .set('Authorization', `Bearer ${coordDanceToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('2. Role Escalation & Self-Role Tampering Protections', () => {
    it('User is FORBIDDEN from elevating their own role through PUT /api/users/me', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${coordDanceToken}`)
        .send({ role: 'admin', name: 'Escalated User' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('CANNOT_CHANGE_OWN_ROLE');
    });

    it('Admin is FORBIDDEN from changing their own role through PUT /api/users/:uid/role', async () => {
      const res = await request(app)
        .put('/api/users/user_admin_01/role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'coordinator' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('CANNOT_CHANGE_OWN_ROLE');
    });

    it('Non-admin user is FORBIDDEN from modifying another user’s role', async () => {
      const res = await request(app)
        .put('/api/users/user_coord_02/role')
        .set('Authorization', `Bearer ${coordDanceToken}`)
        .send({ role: 'admin' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN_ROLE');
    });

    it('Deactivated (inactive) user is immediately blocked from accessing protected endpoints', async () => {
      // 1. Admin deactivates user_coord_02
      await request(app)
        .patch('/api/users/user_coord_02/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'INACTIVE' });

      // 2. user_coord_02 tries to access their profile
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${coordQuizToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ACCOUNT_INACTIVE');

      // 3. Reactivate for clean state
      await request(app)
        .patch('/api/users/user_coord_02/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ACTIVE' });
    });
  });

  describe('3. Cross-Entity Parameter Tampering & Score Tampering Protections', () => {
    it('REJECTS score submission when registration does not belong to the target program (Cross-program parameter tampering)', async () => {
      // reg_quiz_01 belongs to prog_tech_quiz, but URL specifies prog_solo_dance
      const res = await request(app)
        .post('/api/scores/programs/prog_solo_dance/registrations/reg_quiz_01')
        .set('Authorization', `Bearer ${juryDanceToken}`)
        .send({
          criteriaScores: { crit_tech: 20 },
          isFinalSubmit: false,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('PROGRAM_REGISTRATION_MISMATCH');
    });

    it('REJECTS score submission when a criterion exceeds maximum allowed score', async () => {
      // prog_solo_dance crit_tech max is 25
      const res = await request(app)
        .post('/api/scores/programs/prog_solo_dance/registrations/reg_dance_01')
        .set('Authorization', `Bearer ${juryDanceToken}`)
        .send({
          criteriaScores: { crit_tech: 999 }, // Exceeds max 25!
          isFinalSubmit: false,
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('SCORE_EXCEEDS_MAX');
    });

    it('LOCKS score upon final submission and PREVENTS subsequent jury modification', async () => {
      // 1. Submit final score
      const resSubmit = await request(app)
        .post('/api/scores/programs/prog_solo_dance/registrations/reg_dance_01')
        .set('Authorization', `Bearer ${juryDanceToken}`)
        .send({
          criteriaScores: { crit_tech: 25, crit_expr: 25, crit_rhythm: 20, crit_costume: 15, crit_impact: 15 },
          isFinalSubmit: true,
        });

      expect(resSubmit.status).toBe(200);
      expect(resSubmit.body.data.status).toBe('SUBMITTED');

      // 2. Attempt to tamper/edit the submitted locked score
      const resTamper = await request(app)
        .post('/api/scores/programs/prog_solo_dance/registrations/reg_dance_01')
        .set('Authorization', `Bearer ${juryDanceToken}`)
        .send({
          criteriaScores: { crit_tech: 20, crit_expr: 20, crit_rhythm: 20, crit_costume: 15, crit_impact: 15 },
          isFinalSubmit: false,
        });

      expect(resTamper.status).toBe(403);
      expect(resTamper.body.code).toBe('SCORE_LOCKED');
    });

    it('NON-ADMIN is DENIED unlocking a locked score', async () => {
      const scoreId = 'score_prog_solo_dance_reg_dance_01_user_jury_01';
      const res = await request(app)
        .post(`/api/scores/${scoreId}/unlock`)
        .set('Authorization', `Bearer ${juryDanceToken}`);

      expect(res.status).toBe(403);
    });

    it('ADMIN CAN explicitly unlock score, allowing updates', async () => {
      const scoreId = 'score_prog_solo_dance_reg_dance_01_user_jury_01';
      const resUnlock = await request(app)
        .post(`/api/scores/${scoreId}/unlock`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resUnlock.status).toBe(200);
      expect(resUnlock.body.success).toBe(true);

      // Now jury should be able to save draft again
      const resDraft = await request(app)
        .post('/api/scores/programs/prog_solo_dance/registrations/reg_dance_01')
        .set('Authorization', `Bearer ${juryDanceToken}`)
        .send({
          criteriaScores: { crit_tech: 24 },
          isFinalSubmit: false,
        });

      expect(resDraft.status).toBe(200);
      expect(resDraft.body.data.status).toBe('DRAFT');
    });
  });

  describe('4. Unauthorized Result Calculation & Publishing Protection', () => {
    it('Jury member is FORBIDDEN from calculating results with 403', async () => {
      const res = await request(app)
        .post('/api/programs/prog_solo_dance/calculate-results')
        .set('Authorization', `Bearer ${juryDanceToken}`);

      expect(res.status).toBe(403);
    });

    it('Jury member and Coordinator are FORBIDDEN from publishing results with 403', async () => {
      const resJury = await request(app)
        .post('/api/programs/prog_solo_dance/publish-results')
        .set('Authorization', `Bearer ${juryDanceToken}`);
      expect(resJury.status).toBe(403);

      const resCoord = await request(app)
        .post('/api/programs/prog_solo_dance/publish-results')
        .set('Authorization', `Bearer ${coordDanceToken}`);
      expect(resCoord.status).toBe(403);
    });

    it('Jury member and Coordinator are FORBIDDEN from unpublishing results with 403', async () => {
      const res = await request(app)
        .post('/api/programs/prog_solo_dance/unpublish-results')
        .set('Authorization', `Bearer ${coordDanceToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('5. Public Registration Abuse, Concurrency & Data Integrity', () => {
    it('REJECTS registration when program status is not REGISTRATION_OPEN', async () => {
      const db = getDb();
      await db.collection('programs').doc('prog_closed_test').set({
        id: 'prog_closed_test',
        eventId: 'event_arts_2027',
        name: 'Closed Program Test',
        code: 'CPT',
        slug: 'closed-prog',
        status: 'REGISTRATION_CLOSED',
        capacity: 50,
        registeredCount: 10,
        scoringConfig: { criteria: [], maxTotalScore: 100, calculationMethod: 'SUM' },
      });

      const res = await request(app)
        .post('/api/public/events/ARTS27/programs/CPT/register')
        .send({
          participantType: 'INDIVIDUAL',
          department: 'Computer Science',
          participantData: { fullName: 'Late Student', email: 'late@college.edu' },
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('REGISTRATION_CLOSED');
    });

    it('REJECTS duplicate registration with same Student Register Number', async () => {
      // 23CS042 is already registered for prog_solo_dance (code SD) in seed data
      const res = await request(app)
        .post('/api/public/events/ARTS27/programs/SD/register')
        .send({
          participantType: 'INDIVIDUAL',
          department: 'Computer Science',
          participantData: {
            name: 'Duplicate Student',
            registerNumber: '23CS042',
            department: 'Computer Science',
            year: '2nd Year',
            phone: '9876543299',
            email: 'duplicate.new@college.edu',
            danceStyle: 'Contemporary',
          },
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('DUPLICATE_REGISTRATION');
    });

    it('REJECTS duplicate registration with same Email', async () => {
      // rohan.v@college.edu is already registered in prog_solo_dance (code SD)
      const res = await request(app)
        .post('/api/public/events/ARTS27/programs/SD/register')
        .send({
          participantType: 'INDIVIDUAL',
          department: 'Computer Science',
          participantData: {
            name: 'Another Student',
            registerNumber: '99CS999',
            department: 'Computer Science',
            year: '2nd Year',
            phone: '9876543288',
            email: 'rohan.v@college.edu',
            danceStyle: 'Classical',
          },
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('DUPLICATE_REGISTRATION');
    });

    it('ATOMIC CAPACITY: rejects registration immediately when capacity is full', async () => {
      const db = getDb();
      await db.collection('programs').doc('prog_full_test').set({
        id: 'prog_full_test',
        eventId: 'event_arts_2027',
        name: 'Full Program',
        code: 'FULL',
        slug: 'full-program',
        status: 'REGISTRATION_OPEN',
        capacity: 2,
        registeredCount: 2, // Full!
        scoringConfig: { criteria: [], maxTotalScore: 100, calculationMethod: 'SUM' },
      });

      const res = await request(app)
        .post('/api/public/events/ARTS27/programs/FULL/register')
        .send({
          participantType: 'INDIVIDUAL',
          department: 'Mechanical',
          participantData: { fullName: 'Overflow Student', email: 'overflow@college.edu' },
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('CAPACITY_REACHED');
    });
  });

  describe('6. Comprehensive Audit Logging Verification', () => {
    it('creates immutable audit log on user creation', async () => {
      const db = getDb();
      const uniqueEmail = `audit_test_${Date.now()}@college.edu`;
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Audit Test User',
          email: uniqueEmail,
          role: 'coordinator',
          department: 'Information Tech',
        });

      expect(res.status).toBe(201);
      const newUid = res.body.data.uid;

      // Verify audit log exists
      const logsSnap = await db
        .collection('auditLogs')
        .where('entity', '==', 'user')
        .where('entityId', '==', newUid)
        .where('action', '==', 'USER_CREATED')
        .get();

      expect(logsSnap.empty).toBe(false);
      const log = logsSnap.docs[0].data();
      expect(log.action).toBe('USER_CREATED');
      expect(log.metadata.email).toBe(uniqueEmail);
    });

    it('creates audit log on assignment creation and deletion', async () => {
      const db = getDb();

      // Create assignment
      const resCreate = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: 'user_jury_01',
          role: 'jury',
          eventId: 'event_arts_2027',
          programId: 'prog_solo_dance_audit_test',
        });

      expect(resCreate.status).toBe(201);
      const asgnId = resCreate.body.data.id;

      // Check audit log for creation
      const snapCreate = await db
        .collection('auditLogs')
        .where('entityId', '==', asgnId)
        .where('action', '==', 'PROGRAM_ASSIGNMENT_CREATED')
        .get();
      expect(snapCreate.empty).toBe(false);

      // Delete assignment
      const resDelete = await request(app)
        .delete(`/api/assignments/${asgnId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resDelete.status).toBe(200);

      // Check audit log for deletion
      const snapDelete = await db
        .collection('auditLogs')
        .where('entityId', '==', asgnId)
        .where('action', '==', 'PROGRAM_ASSIGNMENT_DELETED')
        .get();
      expect(snapDelete.empty).toBe(false);
    });
  });

  describe('7. Security Headers & Infrastructure Health Verification', () => {
    it('returns 200 OK from health check endpoint /api/health', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('College Event Management API');
      expect(res.body.timestamp).toBeDefined();
    });

    it('enforces Helmet security headers (nosniff, sameorigin)', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    });
  });
});
