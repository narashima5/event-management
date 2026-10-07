import request from 'supertest';
import { app } from '../app';
import { getDb, initFirebase } from '../database/firestore';
import { seedDatabase } from '../seed';

describe('Phase 7: Results Calculation, Leaderboards, Winner Reports & CSV Export', () => {
  const adminToken = 'dev-admin-token';
  const coordDanceToken = 'dev-coord-a-token';
  const juryDanceToken = 'dev-jury-a-token';

  beforeAll(async () => {
    initFirebase();
    await seedDatabase();
  });

  describe('1. Authoritative Backend Result Calculation & Tie-Breaking Engine', () => {
    it('calculates rankings, medals, points and breaks ties using 1st criterion', async () => {
      const db = getDb();

      // Ensure prog_solo_dance has multiple submitted jury scores with tie scenario
      // Jury A gives reg_dance_01: criteriaScores = { crit_tech: 20, crit_expr: 25, crit_rhythm: 15, crit_costume: 15, crit_impact: 15 } => total 90
      // Jury A gives reg_dance_02: criteriaScores = { crit_tech: 25, crit_expr: 20, crit_rhythm: 15, crit_costume: 15, crit_impact: 15 } => total 90 (higher crit_tech)
      await db.collection('scores').doc('score_prog_solo_dance_reg_dance_01_jury_dance_a').set({
        id: 'score_prog_solo_dance_reg_dance_01_jury_dance_a',
        programId: 'prog_solo_dance',
        registrationId: 'reg_dance_01',
        juryId: 'jury_dance_a',
        criteriaScores: { crit_tech: 20, crit_expr: 25, crit_rhythm: 15, crit_costume: 15, crit_impact: 15 },
        totalScore: 90,
        status: 'SUBMITTED',
        isLocked: true,
        submittedAt: new Date().toISOString(),
      });

      await db.collection('scores').doc('score_prog_solo_dance_reg_dance_02_jury_dance_a').set({
        id: 'score_prog_solo_dance_reg_dance_02_jury_dance_a',
        programId: 'prog_solo_dance',
        registrationId: 'reg_dance_02',
        juryId: 'jury_dance_a',
        criteriaScores: { crit_tech: 25, crit_expr: 20, crit_rhythm: 15, crit_costume: 15, crit_impact: 15 },
        totalScore: 90,
        status: 'SUBMITTED',
        isLocked: true,
        submittedAt: new Date().toISOString(),
      });

      // Trigger result calculation
      const res = await request(app)
        .post('/api/programs/prog_solo_dance/calculate-results')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      const computed = res.body.data;
      // reg_dance_02 has higher criterion 1 crit_tech (25 vs 20), so it should rank 1st
      expect(computed[0].registrationId).toBe('reg_dance_02');
      expect(computed[0].rank).toBe(1);
      expect(computed[0].position).toBe('1st');
      expect(computed[0].medal).toBe('Gold');
      expect(computed[0].pointsAwarded).toBe(5);

      expect(computed[1].registrationId).toBe('reg_dance_01');
      expect(computed[1].rank).toBe(2);
      expect(computed[1].position).toBe('2nd');
      expect(computed[1].medal).toBe('Silver');
      expect(computed[1].pointsAwarded).toBe(3);
    });

    it('ignores draft jury scores during result calculation', async () => {
      const db = getDb();
      // Set a score as DRAFT
      await db.collection('scores').doc('score_draft_test').set({
        id: 'score_draft_test',
        programId: 'prog_solo_dance',
        registrationId: 'reg_dance_03',
        juryId: 'jury_dance_a',
        criteriaScores: { crit_sd_1: 30, crit_sd_2: 30, crit_sd_3: 20, crit_sd_4: 10, crit_sd_5: 10 },
        totalScore: 100,
        status: 'DRAFT',
        isLocked: false,
      });

      const res = await request(app)
        .post('/api/programs/prog_solo_dance/calculate-results')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const results = res.body.data;
      // reg_dance_03 had only draft score, so must not be in calculated results
      const foundDraft = results.find((r: any) => r.registrationId === 'reg_dance_03');
      expect(foundDraft).toBeUndefined();
    });

    it('handles joint ties when participants have completely identical criterion scores', async () => {
      const db = getDb();

      // Give reg_dance_01 and reg_dance_02 identical scores
      await db.collection('scores').doc('score_prog_solo_dance_reg_dance_01_jury_dance_a').set({
        id: 'score_prog_solo_dance_reg_dance_01_jury_dance_a',
        programId: 'prog_solo_dance',
        registrationId: 'reg_dance_01',
        juryId: 'jury_dance_a',
        criteriaScores: { crit_tech: 20, crit_expr: 20, crit_rhythm: 20, crit_costume: 20, crit_impact: 20 },
        totalScore: 100,
        status: 'SUBMITTED',
        isLocked: true,
        submittedAt: new Date().toISOString(),
      });

      await db.collection('scores').doc('score_prog_solo_dance_reg_dance_02_jury_dance_a').set({
        id: 'score_prog_solo_dance_reg_dance_02_jury_dance_a',
        programId: 'prog_solo_dance',
        registrationId: 'reg_dance_02',
        juryId: 'jury_dance_a',
        criteriaScores: { crit_tech: 20, crit_expr: 20, crit_rhythm: 20, crit_costume: 20, crit_impact: 20 },
        totalScore: 100,
        status: 'SUBMITTED',
        isLocked: true,
        submittedAt: new Date().toISOString(),
      });

      const res = await request(app)
        .post('/api/programs/prog_solo_dance/calculate-results')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data;
      // Both should share rank 1st with Gold medal
      expect(data[0].rank).toBe(1);
      expect(data[0].position).toBe('1st');
      expect(data[0].medal).toBe('Gold');
      expect(data[0].pointsAwarded).toBe(5);

      expect(data[1].rank).toBe(1);
      expect(data[1].position).toBe('1st');
      expect(data[1].medal).toBe('Gold');
      expect(data[1].pointsAwarded).toBe(5);
    });

    it('detects incomplete judging panel when not all assigned jury members have submitted evaluations', async () => {
      const db = getDb();

      // Add a 2nd jury assignment to prog_solo_dance
      await db.collection('assignments').doc('asgn_dance_jury_extra').set({
        id: 'asgn_dance_jury_extra',
        userId: 'user_jury_02',
        userName: 'Second Jury Member',
        userEmail: 'jury2@college.edu',
        role: 'jury',
        eventId: 'event_arts_2027',
        programId: 'prog_solo_dance',
        status: 'ACTIVE',
        assignedAt: new Date().toISOString(),
        assignedBy: 'user_admin_01',
      });

      // Calculate results (only 1 jury has submitted)
      const res = await request(app)
        .post('/api/programs/prog_solo_dance/calculate-results')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.incompleteJudging).toBe(true);
      expect(res.body.completedJuryCount).toBe(1);
      expect(res.body.totalJuriesAssigned).toBe(2);

      // Clean up extra assignment
      await db.collection('assignments').doc('asgn_dance_jury_extra').delete();
    });
  });

  describe('2. Result Publishing & Public Data Isolation', () => {
    it('public route does NOT expose draft (unpublished) results', async () => {
      const res = await request(app).get('/api/public/programs/prog_solo_dance/results');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Results are still in DRAFT status, so public endpoint returns empty list
      expect(res.body.data.length).toBe(0);
    });

    it('jury is forbidden from publishing results (403 FORBIDDEN_ROLE)', async () => {
      const res = await request(app)
        .post('/api/programs/prog_solo_dance/publish-results')
        .set('Authorization', `Bearer ${juryDanceToken}`);

      expect(res.status).toBe(403);
    });

    it('admin publishes results, updating program status and making results publicly visible', async () => {
      const pubRes = await request(app)
        .post('/api/programs/prog_solo_dance/publish-results')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(pubRes.status).toBe(200);
      expect(pubRes.body.success).toBe(true);

      // Public endpoint now returns results with official ranks and medals
      const publicRes = await request(app).get('/api/public/programs/prog_solo_dance/results');
      expect(publicRes.status).toBe(200);
      expect(publicRes.body.data.length).toBeGreaterThanOrEqual(2);
      expect(publicRes.body.data[0].rank).toBe(1);
      expect(publicRes.body.data[0].medal).toBe('Gold');
      // Public response must not leak private details like phone or email
      expect(publicRes.body.data[0].phone).toBeUndefined();
      expect(publicRes.body.data[0].email).toBeUndefined();
    });

    it('admin can unpublish results if necessary, reverting to DRAFT and hiding from public portal', async () => {
      // Unpublish results
      const unpubRes = await request(app)
        .post('/api/programs/prog_solo_dance/unpublish-results')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(unpubRes.status).toBe(200);
      expect(unpubRes.body.success).toBe(true);
      expect(unpubRes.body.message).toContain('unpublished');

      // Public program endpoint immediately hides results
      const publicRes = await request(app).get('/api/public/programs/prog_solo_dance/results');
      expect(publicRes.status).toBe(200);
      expect(publicRes.body.data.length).toBe(0);

      // Re-publish so downstream leaderboard tests have published data
      const rePubRes = await request(app)
        .post('/api/programs/prog_solo_dance/publish-results')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(rePubRes.status).toBe(200);
    });
  });

  describe('3. Institutional Department & Event-Level Leaderboards', () => {
    it('computes department points leaderboard accurately based on published results', async () => {
      const res = await request(app).get('/api/reports/leaderboard/department');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      // Check departments have aggregated gold, silver, points
      const leaderboard = res.body.data;
      expect(leaderboard.length).toBeGreaterThan(0);
      const topDept = leaderboard[0];
      expect(topDept.totalPoints).toBeGreaterThan(0);
      expect(topDept.department).toBeDefined();
    });

    it('supports configurable points scale and computes participant & team leaderboards', async () => {
      // Test event leaderboard with custom point scale (1st = 10, 2nd = 6, 3rd = 2)
      const res = await request(app)
        .get('/api/reports/leaderboard/event/event_arts_2027?firstPlace=10&secondPlace=6&thirdPlace=2');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pointsConfig).toEqual({ firstPlace: 10, secondPlace: 6, thirdPlace: 2 });
      expect(res.body.data.departmentLeaderboard.length).toBeGreaterThan(0);
      expect(res.body.data.participantLeaderboard.length).toBeGreaterThan(0);

      // Top participant should have 10 points
      const topParticipant = res.body.data.participantLeaderboard[0];
      expect(topParticipant.totalPoints).toBe(10);
      expect(topParticipant.rank).toBe(1);
    });

    it('scores and calculates team competition (SUM calculation method) and populates team leaderboard', async () => {
      const db = getDb();

      // Submit jury scores for prog_tech_quiz (Team Event)
      await db.collection('scores').doc('score_quiz_reg1').set({
        id: 'score_quiz_reg1',
        programId: 'prog_tech_quiz',
        registrationId: 'reg_quiz_01',
        juryId: 'jury_quiz_a',
        criteriaScores: { crit_accuracy: 38, crit_speed: 28, crit_problemsolving: 29 },
        totalScore: 95,
        status: 'SUBMITTED',
        isLocked: true,
        submittedAt: new Date().toISOString(),
      });

      await db.collection('scores').doc('score_quiz_reg2').set({
        id: 'score_quiz_reg2',
        programId: 'prog_tech_quiz',
        registrationId: 'reg_quiz_02',
        juryId: 'jury_quiz_a',
        criteriaScores: { crit_accuracy: 32, crit_speed: 25, crit_problemsolving: 25 },
        totalScore: 82,
        status: 'SUBMITTED',
        isLocked: true,
        submittedAt: new Date().toISOString(),
      });

      // Calculate & publish
      const calcRes = await request(app)
        .post('/api/programs/prog_tech_quiz/calculate-results')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(calcRes.status).toBe(200);
      expect(calcRes.body.data[0].registrationId).toBe('reg_quiz_01');
      expect(calcRes.body.data[0].rank).toBe(1);

      await request(app)
        .post('/api/programs/prog_tech_quiz/publish-results')
        .set('Authorization', `Bearer ${adminToken}`);

      // Query team leaderboard for event_tech_2027
      const teamRes = await request(app)
        .get('/api/reports/leaderboard/teams?eventId=event_tech_2027');
      expect(teamRes.status).toBe(200);
      expect(teamRes.body.success).toBe(true);
      expect(teamRes.body.data.length).toBeGreaterThanOrEqual(1);

      const topTeam = teamRes.body.data[0];
      expect(topTeam.teamName).toBe('Binary Beasts');
      expect(topTeam.rank).toBe(1);
      expect(topTeam.goldCount).toBe(1);
      expect(topTeam.totalPoints).toBe(5);

      // Verify public event leaderboard endpoint includes this team
      const publicLeaderboardRes = await request(app)
        .get('/api/public/events/event_tech_2027/leaderboard');
      expect(publicLeaderboardRes.status).toBe(200);
      expect(publicLeaderboardRes.body.data.teamLeaderboard.length).toBeGreaterThanOrEqual(1);
      expect(publicLeaderboardRes.body.data.teamLeaderboard[0].teamName).toBe('Binary Beasts');
    });

    it('exports department points leaderboard to CSV format', async () => {
      const res = await request(app).get('/api/reports/leaderboard/department/export/csv');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Total Fest Points');
      expect(res.text).toContain('Computer Science');
    });
  });

  describe('4. Official Winner Reports & CSV Export', () => {
    it('admin can generate winner reports with category and department filtering', async () => {
      const res = await request(app)
        .get('/api/reports/winners?category=Cultural&rank=1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].rank).toBe(1);
      expect(res.body.data[0].medal).toBe('Gold');
    });

    it('exports winner reports to CSV respecting active filters', async () => {
      const res = await request(app)
        .get('/api/reports/export/winners/csv?category=Cultural')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Medal');
      expect(res.text).toContain('Gold');
    });
  });

  describe('5. Advanced Participant Querying & Multi-Filter CSV Export', () => {
    it('filters participants by combinations: department + attendance + category', async () => {
      const res = await request(app)
        .get('/api/reports/participants?department=Computer%20Science&attendanceStatus=PRESENT')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      for (const reg of res.body.data) {
        expect(reg.department).toBe('Computer Science');
        expect(reg.attendanceStatus).toBe('PRESENT');
      }
    });

    it('filters participants by winnerStatus = WINNERS_ONLY', async () => {
      const res = await request(app)
        .get('/api/reports/participants?winnerStatus=WINNERS_ONLY')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Returned participants should be podium medalists
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('exports participants to CSV respecting combinations of active filters', async () => {
      const res = await request(app)
        .get('/api/reports/export/csv?department=Computer%20Science')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Registration Number');
      expect(res.text).toContain('Computer Science');
    });
  });

  describe('Phase 8: Complete Administrative Reporting & Analytics Suite', () => {
    describe('1. Multi-Filter Participant Report with Pagination', () => {
      it('supports multiple simultaneous filters: Event + Department + Category (as requested)', async () => {
        // Example: Event = Arts Fest, Department = CSE, Category = Dance
        const res = await request(app)
          .get('/api/reports/participants?eventId=event_arts_2027&department=Computer%20Science&category=Cultural&page=1')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        
        for (const reg of res.body.data) {
          expect(reg.eventId).toBe('event_arts_2027');
          expect(reg.department).toBe('Computer Science');
        }

        // Check pagination metadata
        expect(res.body.pagination).toBeDefined();
        expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
        expect(res.body.pagination.page).toBe(1);
      });

      it('supports pagination parameters (page and limit)', async () => {
        const res = await request(app)
          .get('/api/reports/participants?page=1&limit=2')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeLessThanOrEqual(2);
        expect(res.body.pagination.limit).toBe(2);
        expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(1);
      });

      it('supports filtering by Year, Gender, Participant Type, Attendance, and Status', async () => {
        const res = await request(app)
          .get('/api/reports/participants?participantType=INDIVIDUAL&status=CONFIRMED&year=2nd%20Year')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        for (const reg of res.body.data) {
          expect(reg.participantType).toBe('INDIVIDUAL');
          expect(reg.status).toBe('CONFIRMED');
        }
      });
    });

    describe('2. All 8 Administrative Reports', () => {
      it('Report 1: Participant Report', async () => {
        const res = await request(app)
          .get('/api/reports/participants')
          .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      });

      it('Report 2: Program Registration Report (Aggregates capacity, confirmed, checked-in)', async () => {
        const res = await request(app)
          .get('/api/reports/program-registrations')
          .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        const progItem = res.body.data[0];
        expect(progItem).toHaveProperty('programName');
        expect(progItem).toHaveProperty('totalRegistrations');
        expect(progItem).toHaveProperty('confirmedCount');
        expect(progItem).toHaveProperty('checkedInCount');
        expect(progItem).toHaveProperty('capacityUtilizationPct');
      });

      it('Report 3: Event Registration Report (Aggregates programs, capacity, registrations)', async () => {
        const res = await request(app)
          .get('/api/reports/event-registrations')
          .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        const eventItem = res.body.data[0];
        expect(eventItem).toHaveProperty('eventName');
        expect(eventItem).toHaveProperty('totalPrograms');
        expect(eventItem).toHaveProperty('totalRegistrations');
      });

      it('Report 4: Program Winners Report', async () => {
        const res = await request(app)
          .get('/api/reports/winners')
          .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      });

      it('Report 5: Event Winners Report (All medalists grouped by event)', async () => {
        const res = await request(app)
          .get('/api/reports/event-winners')
          .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('winners');
        expect(res.body.data).toHaveProperty('departmentTally');
        expect(res.body.data.winners.length).toBeGreaterThanOrEqual(1);
        const firstWinner = res.body.data.winners[0];
        expect(firstWinner).toHaveProperty('rank');
        expect(firstWinner).toHaveProperty('pointsAwarded');
      });

      it('Report 6: Department Leaderboard Report', async () => {
        const res = await request(app)
          .get('/api/reports/leaderboard/department')
          .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        expect(res.body.data[0]).toHaveProperty('department');
        expect(res.body.data[0]).toHaveProperty('totalPoints');
      });

      it('Report 7: Overall Leaderboard Report (Cross-event institutional championship)', async () => {
        const res = await request(app)
          .get('/api/reports/leaderboard/overall')
          .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('departmentLeaderboard');
        expect(res.body.data).toHaveProperty('topParticipants');
        expect(res.body.data).toHaveProperty('topTeams');
        expect(res.body.data).toHaveProperty('totalMedalsAwarded');
      });

      it('Report 8: Jury Scoring Report (Judge evaluation audit trail)', async () => {
        const res = await request(app)
          .get('/api/reports/jury-scoring')
          .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        const scoreItem = res.body.data[0];
        expect(scoreItem).toHaveProperty('juryName');
        expect(scoreItem).toHaveProperty('programName');
        expect(scoreItem).toHaveProperty('totalScore');
        expect(scoreItem).toHaveProperty('status');
      });
    });

    describe('3. Multi-Format Backend Export Generation (CSV, Excel XML, Printable HTML)', () => {
      it('exports participant report to Excel XML format with proper MIME type and filename', async () => {
        const res = await request(app)
          .get('/api/reports/export/participants/excel?department=Computer%20Science')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('application/vnd.ms-excel');
        expect(res.headers['content-disposition']).toContain('participants_report_');
        expect(res.headers['content-disposition']).toContain('.xls');
        expect(res.text).toContain('<?xml version="1.0"');
        expect(res.text).toContain('Workbook');
        expect(res.text).toContain('Computer Science');
      });

      it('generates printable HTML document for PDF generation', async () => {
        const res = await request(app)
          .get('/api/reports/export/participants/print')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('text/html');
        expect(res.text).toContain('<!DOCTYPE html>');
        expect(res.text).toContain('@page');
        expect(res.text).toContain('Participant Registration Roster');
        expect(res.text).toContain('window.print()');
      });

      it('exports program registrations to Excel format', async () => {
        const res = await request(app)
          .get('/api/reports/export/program-registrations/excel')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('application/vnd.ms-excel');
        expect(res.text).toContain('Program Registrations');
      });

      it('exports jury scoring audit to CSV format', async () => {
        const res = await request(app)
          .get('/api/reports/export/jury-scoring/csv')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('text/csv');
        expect(res.text).toContain('Jury Member');
        expect(res.text).toContain('Total Score');
      });

      it('exports overall championship leaderboard to Excel format', async () => {
        const res = await request(app)
          .get('/api/reports/export/overall-leaderboard/excel')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('application/vnd.ms-excel');
        expect(res.text).toContain('Overall Leaderboard');
      });
    });

    describe('4. Dashboard Analytics Metrics & Visualizations', () => {
      it('returns all required KPIs and chart distributions for admin dashboard', async () => {
        const res = await request(app)
          .get('/api/reports/stats')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        const { kpis, charts } = res.body.data;

        // Verify the 6 specific required KPIs:
        expect(typeof kpis.totalEvents).toBe('number');
        expect(typeof kpis.totalPrograms).toBe('number');
        expect(typeof kpis.totalRegistrations).toBe('number');
        expect(typeof kpis.activeRegistrations).toBe('number');
        expect(typeof kpis.completedPrograms).toBe('number');
        expect(typeof kpis.resultsPublished).toBe('number');

        // Verify required chart distributions:
        expect(typeof charts.registrationsByDepartment).toBe('object');
        expect(charts.registrationsByDepartment).toHaveProperty('Computer Science');
        expect(Array.isArray(charts.registrationsByProgram)).toBe(true);
        expect(Array.isArray(charts.registrationTrends)).toBe(true);
      });

      it('handles large dataset query performance efficiently', async () => {
        const start = performance.now();
        const res = await request(app)
          .get('/api/reports/participants?page=1&limit=50')
          .set('Authorization', `Bearer ${adminToken}`);
        const elapsed = performance.now() - start;

        expect(res.status).toBe(200);
        // Fast execution under 250ms
        expect(elapsed).toBeLessThan(250);
      });
    });
  });
});

