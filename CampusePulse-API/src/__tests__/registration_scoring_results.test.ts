import request from 'supertest';
import { app } from '../app';
import { localFirestore } from '../database/firestore';
import { seedDatabase } from '../seed';

describe('Phase 1 & 2: Public Registration, Scoring & Results Calculation Tests', () => {
  beforeAll(async () => {
    localFirestore.clear();
    await seedDatabase();
  });

  describe('1. Public Participant Registration', () => {
    it('1. Valid registration: should successfully register via event/program code and return formatted registration number', async () => {
      const res = await request(app)
        .post('/api/public/events/ARTS27/programs/SD/register')
        .send({
          participantType: 'INDIVIDUAL',
          department: 'Computer Science',
          participantData: {
            name: 'Praveen Kumar',
            registerNumber: '23CS099',
            department: 'Computer Science',
            year: '2nd Year',
            phone: '9876543210',
            email: 'praveen@college.edu',
            danceStyle: 'Hip-Hop Freestyle',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.registrationNumber).toMatch(/^ARTS27-SD-\d{4}$/);
      expect(res.body.data.status).toBe('CONFIRMED');

      // Check confirmation slip lookup endpoint
      const confirmRes = await request(app).get(`/api/public/registrations/${res.body.data.registrationNumber}`);
      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.data.registrationNumber).toBe(res.body.data.registrationNumber);
      expect(confirmRes.body.data.programName).toBe('Solo Classical & Contemporary Dance');
    });

    it('1b. Valid registration: should successfully register via public slug route (/register/:eventSlug/:programSlug)', async () => {
      const res = await request(app)
        .post('/api/public/register/arts-fest-2027/solo-dance')
        .send({
          participantType: 'INDIVIDUAL',
          department: 'Electronics',
          participantData: {
            name: 'Kavita Menon',
            registerNumber: '23EC077',
            department: 'Electronics',
            year: '1st Year',
            phone: '9845011223',
            email: 'kavita.m@college.edu',
            danceStyle: 'Contemporary',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.registrationNumber).toMatch(/^ARTS27-SD-\d{4}$/);
    });

    it('2. Invalid registration: should reject non-existent event or program with 404', async () => {
      const badEvent = await request(app)
        .post('/api/public/events/NONEXISTENT/programs/SD/register')
        .send({
          participantType: 'INDIVIDUAL',
          participantData: { name: 'Nobody', registerNumber: '0000' },
        });
      expect(badEvent.status).toBe(404);
      expect(badEvent.body.code).toBe('EVENT_NOT_FOUND');

      const badProg = await request(app)
        .post('/api/public/events/ARTS27/programs/UNKNOWN_PROG/register')
        .send({
          participantType: 'INDIVIDUAL',
          participantData: { name: 'Nobody', registerNumber: '0000' },
        });
      expect(badProg.status).toBe(404);
      expect(badProg.body.code).toBe('PROGRAM_NOT_FOUND');
    });

    it('3. Duplicate registration: should reject duplicate registration by register number and email', async () => {
      // First registration
      await request(app)
        .post('/api/public/events/ARTS27/programs/SD/register')
        .send({
          participantType: 'INDIVIDUAL',
          department: 'Mechanical',
          participantData: {
            name: 'Siddharth Rao',
            registerNumber: '23ME055',
            department: 'Mechanical',
            year: '3rd Year',
            phone: '9811223344',
            email: 'sid@college.edu',
            danceStyle: 'Classical',
          },
        });

      // Duplicate registration attempt with same register number
      const dupRegNoRes = await request(app)
        .post('/api/public/events/ARTS27/programs/SD/register')
        .send({
          participantType: 'INDIVIDUAL',
          department: 'Mechanical',
          participantData: {
            name: 'Siddharth Rao duplicate',
            registerNumber: '23ME055',
            department: 'Mechanical',
            year: '3rd Year',
            phone: '9811223344',
            email: 'sid.alt@college.edu',
            danceStyle: 'Classical',
          },
        });
      expect(dupRegNoRes.status).toBe(409);
      expect(dupRegNoRes.body.success).toBe(false);
      expect(dupRegNoRes.body.code).toBe('DUPLICATE_REGISTRATION');

      // Duplicate registration attempt with same email
      const dupEmailRes = await request(app)
        .post('/api/public/events/ARTS27/programs/SD/register')
        .send({
          participantType: 'INDIVIDUAL',
          department: 'Mechanical',
          participantData: {
            name: 'Siddharth Rao diff reg',
            registerNumber: '23ME999',
            department: 'Mechanical',
            year: '3rd Year',
            phone: '9811223344',
            email: 'sid@college.edu',
            danceStyle: 'Classical',
          },
        });
      expect(dupEmailRes.status).toBe(409);
      expect(dupEmailRes.body.code).toBe('DUPLICATE_REGISTRATION');
    });

    it('4. Closed registration: should reject registration if program status is not REGISTRATION_OPEN', async () => {
      // Create or update a program with REGISTRATION_CLOSED status
      const db = localFirestore;
      const closedProgId = 'prog_closed_test';
      await db.collection('programs').doc(closedProgId).set({
        id: closedProgId,
        eventId: 'event_arts_2027',
        name: 'Closed Drama Contest',
        code: 'CDC',
        slug: 'closed-drama-contest',
        category: 'Cultural',
        participationType: 'INDIVIDUAL',
        venue: 'Room 101',
        date: '2027-03-16',
        startTime: '10:00 AM',
        endTime: '12:00 PM',
        capacity: 20,
        registeredCount: 0,
        status: 'REGISTRATION_CLOSED',
        registrationStart: '2026-01-01T00:00:00Z',
        registrationEnd: '2027-12-31T23:59:59Z',
        registrationFields: [
          { id: 'f1', name: 'name', label: 'Name', type: 'text', required: true },
          { id: 'f2', name: 'registerNumber', label: 'Reg No', type: 'text', required: true },
        ],
        scoringConfig: {
          criteria: [{ id: 'c1', name: 'Drama', maxScore: 50, weight: 1 }],
          totalMaxScore: 50,
          calculationMethod: 'SUM',
          pointsConfig: { firstPlace: 5, secondPlace: 3, thirdPlace: 1 },
          tieBreakerRule: 'First criterion',
          isJuryScoreVisibleToCoord: false,
        },
      });

      const res = await request(app)
        .post('/api/public/events/ARTS27/programs/CDC/register')
        .send({
          participantType: 'INDIVIDUAL',
          participantData: {
            name: 'Late Student',
            registerNumber: '23LT001',
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('REGISTRATION_CLOSED');
    });

    it('5. Full program: should reject registration when capacity is reached', async () => {
      const db = localFirestore;
      const fullProgId = 'prog_full_test';
      await db.collection('programs').doc(fullProgId).set({
        id: fullProgId,
        eventId: 'event_arts_2027',
        name: 'Sold Out Workshop',
        code: 'SOW',
        slug: 'sold-out-workshop',
        category: 'Workshop',
        participationType: 'INDIVIDUAL',
        venue: 'Lab 1',
        date: '2027-03-16',
        startTime: '10:00 AM',
        endTime: '12:00 PM',
        capacity: 2,
        registeredCount: 2, // Full capacity reached!
        status: 'REGISTRATION_OPEN',
        registrationStart: '2026-01-01T00:00:00Z',
        registrationEnd: '2027-12-31T23:59:59Z',
        registrationFields: [
          { id: 'f1', name: 'name', label: 'Name', type: 'text', required: true },
          { id: 'f2', name: 'registerNumber', label: 'Reg No', type: 'text', required: true },
        ],
        scoringConfig: {
          criteria: [{ id: 'c1', name: 'Participation', maxScore: 10, weight: 1 }],
          totalMaxScore: 10,
          calculationMethod: 'SUM',
          pointsConfig: { firstPlace: 5, secondPlace: 3, thirdPlace: 1 },
          tieBreakerRule: 'First criterion',
          isJuryScoreVisibleToCoord: false,
        },
      });

      const res = await request(app)
        .post('/api/public/events/ARTS27/programs/SOW/register')
        .send({
          participantType: 'INDIVIDUAL',
          participantData: {
            name: 'Waiting Student',
            registerNumber: '23WT001',
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('CAPACITY_REACHED');
    });

    it('6. Missing required fields: should reject registration if required dynamic fields are omitted', async () => {
      const res = await request(app)
        .post('/api/public/events/ARTS27/programs/SD/register')
        .send({
          participantType: 'INDIVIDUAL',
          participantData: {
            // Missing name, registerNumber, danceStyle, etc.
            phone: '9876543210',
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.details?.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('2. Jury Scoring & Lock Workflow', () => {
    it('should reject score when criterion exceeds max allowed limit', async () => {
      // Technique maxScore is 25 in Solo Dance
      const res = await request(app)
        .post('/api/scores/programs/prog_solo_dance/registrations/reg_dance_01')
        .set('Authorization', 'Bearer dev-jury-a-token')
        .send({
          criteriaScores: {
            crit_tech: 50, // Exceeds 25!
            crit_expr: 20,
            crit_rhythm: 18,
            crit_costume: 12,
            crit_impact: 14,
          },
          feedback: 'Great performance',
          isFinalSubmit: false,
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('SCORE_EXCEEDS_MAX');
    });

    it('should save score draft and then submit final locked score', async () => {
      // 1. Save draft
      const draftRes = await request(app)
        .post('/api/scores/programs/prog_solo_dance/registrations/reg_dance_01')
        .set('Authorization', 'Bearer dev-jury-a-token')
        .send({
          criteriaScores: {
            crit_tech: 24,
            crit_expr: 23,
            crit_rhythm: 19,
            crit_costume: 14,
            crit_impact: 14,
          },
          feedback: 'Draft evaluation note',
          isFinalSubmit: false,
        });

      expect(draftRes.status).toBe(200);
      expect(draftRes.body.data.status).toBe('DRAFT');
      expect(draftRes.body.data.totalScore).toBe(94);

      // 2. Final Submit
      const submitRes = await request(app)
        .post('/api/scores/programs/prog_solo_dance/registrations/reg_dance_01')
        .set('Authorization', 'Bearer dev-jury-a-token')
        .send({
          criteriaScores: {
            crit_tech: 25,
            crit_expr: 24,
            crit_rhythm: 20,
            crit_costume: 15,
            crit_impact: 15,
          },
          feedback: 'Flawless presentation',
          isFinalSubmit: true,
        });

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.data.status).toBe('SUBMITTED');
      expect(submitRes.body.data.totalScore).toBe(99);

      // 3. Attempting to modify locked score should be rejected with 403
      const lockedEditRes = await request(app)
        .post('/api/scores/programs/prog_solo_dance/registrations/reg_dance_01')
        .set('Authorization', 'Bearer dev-jury-a-token')
        .send({
          criteriaScores: { crit_tech: 20 },
          isFinalSubmit: false,
        });

      expect(lockedEditRes.status).toBe(403);
      expect(lockedEditRes.body.code).toBe('SCORE_LOCKED');
    });

    it('Admin can unlock score so jury can update it', async () => {
      const scoreId = 'score_prog_solo_dance_reg_dance_01_user_jury_01';
      const unlockRes = await request(app)
        .post(`/api/scores/${scoreId}/unlock`)
        .set('Authorization', 'Bearer dev-admin-token')
        .send({ reason: 'Typo in score input correction' });

      expect(unlockRes.status).toBe(200);
      expect(unlockRes.body.data.status).toBe('DRAFT');
    });

    it('Admin can configure custom criteria for each program (Technique: 25, Expression: 25, Creativity: 20, Performance: 30 = 100)', async () => {
      const customConfig = {
        scoringConfig: {
          criteria: [
            { id: 'crit_tech', name: 'Technique', maxScore: 25, weight: 1 },
            { id: 'crit_expr', name: 'Expression', maxScore: 25, weight: 1 },
            { id: 'crit_creat', name: 'Creativity', maxScore: 20, weight: 1 },
            { id: 'crit_perf', name: 'Performance', maxScore: 30, weight: 1 },
          ],
          totalMaxScore: 100,
          calculationMethod: 'SUM',
          pointsConfig: { firstPlace: 5, secondPlace: 3, thirdPlace: 1 },
          tieBreakerRule: 'Highest score on Technique',
          isJuryScoreVisibleToCoord: true,
        },
      };

      const res = await request(app)
        .put('/api/programs/prog_solo_dance')
        .set('Authorization', 'Bearer dev-admin-token')
        .send(customConfig);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.scoringConfig.criteria.length).toBe(4);
      expect(res.body.data.scoringConfig.totalMaxScore).toBe(100);

      // Verify jury evaluation endpoint reflects the updated criteria
      const evalRes = await request(app)
        .get('/api/scores/programs/prog_solo_dance/evaluations')
        .set('Authorization', 'Bearer dev-jury-a-token');
      expect(evalRes.status).toBe(200);
      expect(evalRes.body.data.program.scoringConfig.criteria.length).toBe(4);
      expect(evalRes.body.data.program.scoringConfig.criteria[3].name).toBe('Performance');
      expect(evalRes.body.data.program.scoringConfig.criteria[3].maxScore).toBe(30);
    });

    it('Audit log records jury, participant, program, scores, submission timestamp, and score status', async () => {
      // Submit a score with the new criteria for reg_dance_02
      const submitRes = await request(app)
        .post('/api/scores/programs/prog_solo_dance/registrations/reg_dance_02')
        .set('Authorization', 'Bearer dev-jury-a-token')
        .send({
          criteriaScores: {
            crit_tech: 24,
            crit_expr: 23,
            crit_creat: 19,
            crit_perf: 29,
          },
          feedback: 'Outstanding technical precision and expression',
          isFinalSubmit: true,
        });

      expect(submitRes.status).toBe(200);
      const scoreId = submitRes.body.data.id;

      // Check audit log record in database
      const auditSnapshot = await localFirestore
        .collection('auditLogs')
        .where('entityId', '==', scoreId)
        .where('action', '==', 'SCORE_SUBMITTED')
        .get();

      expect(auditSnapshot.empty).toBe(false);
      const log = auditSnapshot.docs[0].data();
      expect(log.metadata).toBeDefined();
      expect(log.metadata.jury).toBeDefined();
      expect(log.metadata.participant).toBe('reg_dance_02');
      expect(log.metadata.program).toBe('Solo Classical & Contemporary Dance');
      expect(log.metadata.scores).toEqual({
        crit_tech: 24,
        crit_expr: 23,
        crit_creat: 19,
        crit_perf: 29,
      });
      expect(log.metadata.submissionTimestamp).toBeDefined();
      expect(log.metadata.scoreStatus).toBe('SUBMITTED');
    });

    it('Security: Jury is DENIED modifying registrations, programs, events, users, or unlocking scores', async () => {
      // 1. Cannot modify registration
      const modReg = await request(app)
        .patch('/api/registrations/reg_dance_01/attendance')
        .set('Authorization', 'Bearer dev-jury-a-token')
        .send({ attendanceStatus: 'PRESENT' });
      expect(modReg.status).toBe(403);
      expect(modReg.body.code).toBe('FORBIDDEN_ROLE');

      // 2. Cannot modify program
      const modProg = await request(app)
        .put('/api/programs/prog_solo_dance')
        .set('Authorization', 'Bearer dev-jury-a-token')
        .send({ name: 'Tampered Dance Program' });
      expect(modProg.status).toBe(403);
      expect(modProg.body.code).toBe('FORBIDDEN_ROLE');

      // 3. Cannot modify event
      const modEvt = await request(app)
        .put('/api/events/event_arts_2027')
        .set('Authorization', 'Bearer dev-jury-a-token')
        .send({ name: 'Tampered Event' });
      expect(modEvt.status).toBe(403);
      expect(modEvt.body.code).toBe('FORBIDDEN_ROLE');

      // 4. Cannot modify users
      const modUser = await request(app)
        .patch('/api/users/user_coord_01/role')
        .set('Authorization', 'Bearer dev-jury-a-token')
        .send({ role: 'admin' });
      expect(modUser.status).toBe(403);
      expect(modUser.body.code).toBe('FORBIDDEN_ROLE');

      // 5. Cannot unlock locked score
      const unlockScore = await request(app)
        .post('/api/scores/score_prog_solo_dance_reg_dance_01_user_jury_01/unlock')
        .set('Authorization', 'Bearer dev-jury-a-token')
        .send({ reason: 'Jury self unlock' });
      expect(unlockScore.status).toBe(403);
      expect(unlockScore.body.code).toBe('FORBIDDEN_ROLE');

      // 6. Cannot view all jury scores for a program (admin only)
      const allScores = await request(app)
        .get('/api/scores/programs/prog_solo_dance/all')
        .set('Authorization', 'Bearer dev-jury-a-token');
      expect(allScores.status).toBe(403);
      expect(allScores.body.code).toBe('FORBIDDEN_ROLE');
    });
  });

  describe('3. Result Calculation & Leaderboard Engine', () => {
    it('Backend should calculate rankings, assign medals and points', async () => {
      const res = await request(app)
        .post('/api/programs/prog_tech_quiz/calculate-results')
        .set('Authorization', 'Bearer dev-admin-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const topResult = res.body.data[0];
      expect(topResult.rank).toBe(1);
      expect(topResult.position).toBe('1st');
      expect(topResult.pointsAwarded).toBe(5);
    });

    it('Should publish results and fetch department points leaderboard', async () => {
      // 1. Publish calculated results
      const pubRes = await request(app)
        .post('/api/programs/prog_tech_quiz/publish-results')
        .set('Authorization', 'Bearer dev-admin-token');

      expect(pubRes.status).toBe(200);
      expect(pubRes.body.success).toBe(true);

      // 2. Query department leaderboard
      const res = await request(app).get('/api/reports/leaderboard/department');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      // Verify department points are present
      expect(res.body.data[0].totalPoints).toBeGreaterThan(0);
    });
  });
});
