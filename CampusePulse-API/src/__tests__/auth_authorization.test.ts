import request from 'supertest';
import { app } from '../app';
import { localFirestore } from '../database/firestore';
import { seedDatabase } from '../seed';

describe('Phase 1 & 2: Authentication & Role-Based Authorization Tests', () => {
  beforeAll(async () => {
    localFirestore.clear();
    await seedDatabase();
  });

  describe('1. Authentication Tests', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/events');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('should reject invalid or malformed bearer token with 401', async () => {
      const res = await request(app)
        .get('/api/events')
        .set('Authorization', 'Bearer bogus-invalid-token');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('should authenticate admin and return user profile via /api/users/me', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer dev-admin-token');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('admin');
      expect(res.body.data.user.email).toBe('admin@college.edu');
    });
  });

  describe('2. Authorization Boundaries & Access Control (Admin, Coordinator, Jury)', () => {
    // Admin access: Admin can access everything
    it('Admin can view all events and programs', async () => {
      const res = await request(app)
        .get('/api/events')
        .set('Authorization', 'Bearer dev-admin-token');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('Admin can access ANY program regardless of assignment', async () => {
      const res1 = await request(app)
        .get('/api/programs/prog_solo_dance')
        .set('Authorization', 'Bearer dev-admin-token');
      expect(res1.status).toBe(200);
      expect(res1.body.data.code).toBe('SD');

      const res2 = await request(app)
        .get('/api/programs/prog_tech_quiz')
        .set('Authorization', 'Bearer dev-admin-token');
      expect(res2.status).toBe(200);
      expect(res2.body.data.code).toBe('TQ');
    });

    // Coordinator Access Boundaries:
    // Coordinator A (Sarah) is assigned to 'prog_solo_dance'.
    // She MUST NOT have access to 'prog_tech_quiz'!
    it('Coordinator A (Dance) is ALLOWED access to assigned program (prog_solo_dance)', async () => {
      const res = await request(app)
        .get('/api/programs/prog_solo_dance')
        .set('Authorization', 'Bearer dev-coord-a-token');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('prog_solo_dance');
    });

    it('Coordinator A (Dance) is DENIED access to unrelated program (prog_tech_quiz) with 403', async () => {
      const res = await request(app)
        .get('/api/programs/prog_tech_quiz')
        .set('Authorization', 'Bearer dev-coord-a-token');
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('UNAUTHORIZED_PROGRAM_ACCESS');
    });

    it('Coordinator cannot access unrelated program by changing URL parameter (IDOR protection)', async () => {
      const res = await request(app)
        .get('/api/programs/prog_tech_quiz/participants')
        .set('Authorization', 'Bearer dev-coord-a-token');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('UNAUTHORIZED_PROGRAM_ACCESS');
    });

    it('Backend enforces Coordinator only receives assigned programs in GET /api/programs (not filtered in React)', async () => {
      const res = await request(app)
        .get('/api/programs')
        .set('Authorization', 'Bearer dev-coord-a-token');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const progIds = res.body.data.map((p: any) => p.id);
      expect(progIds).toContain('prog_solo_dance');
      expect(progIds).not.toContain('prog_tech_quiz');
    });

    it('Coordinator A CAN access assigned program participants', async () => {
      const res = await request(app)
        .get('/api/programs/prog_solo_dance/participants')
        .set('Authorization', 'Bearer dev-coord-a-token');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('Coordinator A cannot mark attendance for unrelated registration via direct URL manipulation (403 FORBIDDEN)', async () => {
      const res = await request(app)
        .patch('/api/registrations/reg_quiz_01/attendance')
        .set('Authorization', 'Bearer dev-coord-a-token')
        .send({ attendanceStatus: 'PRESENT' });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('Coordinator A CAN mark attendance for assigned program registration', async () => {
      const res = await request(app)
        .patch('/api/registrations/reg_dance_01/attendance')
        .set('Authorization', 'Bearer dev-coord-a-token')
        .send({ attendanceStatus: 'PRESENT' });
      expect(res.status).toBe(200);
      expect(res.body.data.attendanceStatus).toBe('PRESENT');
    });

    it('Coordinator cannot access admin user management endpoint (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer dev-coord-a-token');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN_ROLE');
    });

    // Jury Access Boundaries:
    // Jury A (Maestro David) is assigned to 'prog_solo_dance'.
    // He MUST NOT have access to evaluations of 'prog_tech_quiz'!
    it('Jury A (Dance) is ALLOWED access to assigned program evaluations', async () => {
      const res = await request(app)
        .get('/api/scores/programs/prog_solo_dance/evaluations')
        .set('Authorization', 'Bearer dev-jury-a-token');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.program.id).toBe('prog_solo_dance');
      expect(Array.isArray(res.body.data.evaluations)).toBe(true);
    });

    it('Jury A (Dance) is DENIED access to unrelated program evaluations (prog_tech_quiz) with 403', async () => {
      const res = await request(app)
        .get('/api/scores/programs/prog_tech_quiz/evaluations')
        .set('Authorization', 'Bearer dev-jury-a-token');
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('UNAUTHORIZED_PROGRAM_ACCESS');
    });

    it('Jury cannot access unrelated program by changing URL parameter (IDOR protection)', async () => {
      const res = await request(app)
        .post('/api/scores/programs/prog_tech_quiz/registrations/some_reg_id')
        .set('Authorization', 'Bearer dev-jury-a-token')
        .send({ criteriaScores: {}, isFinalSubmit: false });
      expect(res.status).toBe(403);
    });

    it('Jury cannot access participant management or admin reports', async () => {
      const res = await request(app)
        .get('/api/reports/stats')
        .set('Authorization', 'Bearer dev-jury-a-token');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN_ROLE');
    });
  });

  describe('3. Account Status & Self-Role Change Protections', () => {
    it('Inactive user cannot access protected API endpoints (403 ACCOUNT_INACTIVE)', async () => {
      // Deactivate Coordinator B
      const deactivateRes = await request(app)
        .patch('/api/users/user_coord_02/status')
        .set('Authorization', 'Bearer dev-admin-token')
        .send({ status: 'INACTIVE' });
      expect(deactivateRes.status).toBe(200);

      // Now Coordinator B attempts to access API
      const accessRes = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer dev-coord-b-token');
      expect(accessRes.status).toBe(403);
      expect(accessRes.body.success).toBe(false);
      expect(accessRes.body.code).toBe('ACCOUNT_INACTIVE');

      // Reactivate Coordinator B for clean state
      await request(app)
        .patch('/api/users/user_coord_02/status')
        .set('Authorization', 'Bearer dev-admin-token')
        .send({ status: 'ACTIVE' });
    });

    it('User cannot change own role through /api/users/me (403 CANNOT_CHANGE_OWN_ROLE)', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', 'Bearer dev-coord-a-token')
        .send({ role: 'admin', name: 'Escalated Sarah' });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('CANNOT_CHANGE_OWN_ROLE');
    });

    it('User cannot change own role through /api/users/:uid/role even if admin (403 CANNOT_CHANGE_OWN_ROLE)', async () => {
      const res = await request(app)
        .patch('/api/users/user_admin_01/role')
        .set('Authorization', 'Bearer dev-admin-token')
        .send({ role: 'coordinator' });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('CANNOT_CHANGE_OWN_ROLE');
    });

    it('Non-admin user cannot change any user role (403 FORBIDDEN_ROLE)', async () => {
      const res = await request(app)
        .patch('/api/users/user_coord_02/role')
        .set('Authorization', 'Bearer dev-coord-a-token')
        .send({ role: 'admin' });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN_ROLE');
    });

    it('Admin can change another user role successfully', async () => {
      const res = await request(app)
        .patch('/api/users/user_coord_02/role')
        .set('Authorization', 'Bearer dev-admin-token')
        .send({ role: 'jury' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('jury');

      // Revert back to coordinator
      await request(app)
        .patch('/api/users/user_coord_02/role')
        .set('Authorization', 'Bearer dev-admin-token')
        .send({ role: 'coordinator' });
    });
  });

  describe('4. Phase 3: Event & Program Management Security Boundaries', () => {
    const sampleEventPayload = {
      name: 'Hackathon 2026',
      code: 'HACK26',
      slug: 'hackathon-2026',
      description: 'Annual college coding hackathon',
      venue: 'Main Auditorium',
      startDate: '2026-11-01',
      endDate: '2026-11-02',
      registrationStart: '2026-10-01',
      registrationEnd: '2026-10-30',
      contactInfo: 'hackathon@college.edu | +1-555-0199'
    };

    const sampleProgramPayload = {
      eventId: 'event_arts_2027',
      name: 'Rapid Web Dev',
      code: 'RWD',
      slug: 'rapid-web-dev',
      category: 'TECHNICAL',
      participationType: 'INDIVIDUAL',
      venue: 'Lab 3',
      date: '2026-11-01',
      startTime: '10:00',
      endTime: '13:00',
      capacity: 30,
      registrationStart: '2026-10-01',
      registrationEnd: '2026-10-25',
      rules: 'No internet during phase 2',
      instructions: 'Bring your laptop',
      scoringConfig: {
        criteria: [
          { id: 'crit_1', name: 'Code Quality', maxScore: 50, weight: 1 },
          { id: 'crit_2', name: 'UI / UX', maxScore: 50, weight: 1 }
        ],
        totalMaxScore: 100,
        calculationMethod: 'SUM',
        pointsConfig: { firstPlace: 5, secondPlace: 3, thirdPlace: 1 },
        tieBreakerRule: 'Highest code quality score',
        isJuryScoreVisibleToCoord: false
      },
      registrationFields: []
    };

    it('Coordinator is DENIED creating an event (403 FORBIDDEN_ROLE)', async () => {
      const res = await request(app)
        .post('/api/events')
        .set('Authorization', 'Bearer dev-coord-a-token')
        .send(sampleEventPayload);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('FORBIDDEN_ROLE');
    });

    it('Coordinator is DENIED editing an existing event (403 FORBIDDEN_ROLE)', async () => {
      const res = await request(app)
        .put('/api/events/evt_tarang_2026')
        .set('Authorization', 'Bearer dev-coord-a-token')
        .send({ name: 'Tampered Event Name' });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('FORBIDDEN_ROLE');
    });

    it('Coordinator is DENIED changing event status (403 FORBIDDEN_ROLE)', async () => {
      const res = await request(app)
        .patch('/api/events/evt_tarang_2026/status')
        .set('Authorization', 'Bearer dev-coord-a-token')
        .send({ status: 'PUBLISHED' });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('FORBIDDEN_ROLE');
    });

    it('Coordinator is DENIED deleting/archiving an event (403 FORBIDDEN_ROLE)', async () => {
      const res = await request(app)
        .delete('/api/events/evt_tarang_2026')
        .set('Authorization', 'Bearer dev-coord-a-token');
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('FORBIDDEN_ROLE');
    });

    it('Jury member is DENIED creating an event (403 FORBIDDEN_ROLE)', async () => {
      const res = await request(app)
        .post('/api/events')
        .set('Authorization', 'Bearer dev-jury-a-token')
        .send(sampleEventPayload);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('FORBIDDEN_ROLE');
    });

    it('Jury member is DENIED editing an event (403 FORBIDDEN_ROLE)', async () => {
      const res = await request(app)
        .put('/api/events/evt_tarang_2026')
        .set('Authorization', 'Bearer dev-jury-a-token')
        .send({ name: 'Tampered Event Name' });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('FORBIDDEN_ROLE');
    });

    it('Coordinator is DENIED creating a program (403 FORBIDDEN_ROLE)', async () => {
      const res = await request(app)
        .post('/api/programs')
        .set('Authorization', 'Bearer dev-coord-a-token')
        .send(sampleProgramPayload);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('FORBIDDEN_ROLE');
    });

    it('Coordinator is DENIED editing a program even if assigned to it (403 FORBIDDEN_ROLE)', async () => {
      const res = await request(app)
        .put('/api/programs/prog_solo_dance')
        .set('Authorization', 'Bearer dev-coord-a-token')
        .send({ name: 'Tampered Dance Rules' });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('FORBIDDEN_ROLE');
    });

    it('Coordinator is DENIED updating program status (403 FORBIDDEN_ROLE)', async () => {
      const res = await request(app)
        .patch('/api/programs/prog_solo_dance/status')
        .set('Authorization', 'Bearer dev-coord-a-token')
        .send({ status: 'REGISTRATION_CLOSED' });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('FORBIDDEN_ROLE');
    });

    it('Jury member is DENIED creating a program (403 FORBIDDEN_ROLE)', async () => {
      const res = await request(app)
        .post('/api/programs')
        .set('Authorization', 'Bearer dev-jury-a-token')
        .send(sampleProgramPayload);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('FORBIDDEN_ROLE');
    });

    it('Jury member is DENIED editing a program even if assigned to it (403 FORBIDDEN_ROLE)', async () => {
      const res = await request(app)
        .put('/api/programs/prog_solo_dance')
        .set('Authorization', 'Bearer dev-jury-a-token')
        .send({ name: 'Tampered Criteria' });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('FORBIDDEN_ROLE');
    });

    it('Coordinator and Jury are DENIED creating or deleting assignments (403 FORBIDDEN_ROLE)', async () => {
      const coordAssign = await request(app)
        .post('/api/assignments')
        .set('Authorization', 'Bearer dev-coord-a-token')
        .send({ userId: 'user_coord_02', programId: 'prog_solo_dance', role: 'coordinator' });
      expect(coordAssign.status).toBe(403);
      expect(coordAssign.body.code).toBe('FORBIDDEN_ROLE');

      const juryDelete = await request(app)
        .delete('/api/assignments/asgn_dance_jury')
        .set('Authorization', 'Bearer dev-jury-a-token');
      expect(juryDelete.status).toBe(403);
      expect(juryDelete.body.code).toBe('FORBIDDEN_ROLE');
    });

    it('Admin CAN create an event and update its status lifecycle', async () => {
      const createRes = await request(app)
        .post('/api/events')
        .set('Authorization', 'Bearer dev-admin-token')
        .send({
          ...sampleEventPayload,
          code: 'TESTEVT',
          slug: 'test-event-unique'
        });
      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      const createdId = createRes.body.data.id;

      // Admin transitions status
      const statusRes = await request(app)
        .patch(`/api/events/${createdId}/status`)
        .set('Authorization', 'Bearer dev-admin-token')
        .send({ status: 'REGISTRATION_OPEN' });
      expect(statusRes.status).toBe(200);
      expect(statusRes.body.data.status).toBe('REGISTRATION_OPEN');

      // Admin archives event
      const archiveRes = await request(app)
        .patch(`/api/events/${createdId}/status`)
        .set('Authorization', 'Bearer dev-admin-token')
        .send({ status: 'ARCHIVED' });
      expect(archiveRes.status).toBe(200);
      expect(archiveRes.body.data.status).toBe('ARCHIVED');
    });
  });
});
