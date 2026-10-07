import request from 'supertest';
import { app } from '../app';
import { getDb, initFirebase } from '../database/firestore';
import { seedDatabase } from '../seed';

describe('Phase 10: Complete End-to-End Enterprise Workflow Verification', () => {
  const adminToken = 'dev-admin-token';
  const coordToken = 'dev-coord-a-token'; // Sarah Jenkins (user_coord_01)
  const juryToken = 'dev-jury-a-token';   // Marcus Chen (user_jury_01)

  let createdEventId = '';
  let createdProgramId = '';
  let createdRegistrationId = '';
  let createdRegNumber = '';

  beforeAll(async () => {
    initFirebase();
    await seedDatabase();
  });

  it('Step 1: Admin creates event and transitions status to REGISTRATION_OPEN', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'E2E Annual Cultural Fest 2027',
        code: 'E2EFEST',
        slug: 'e2e-annual-fest-2027',
        description: 'Comprehensive test fest for verifying the complete 13-step lifecycle.',
        venue: 'Grand University Amphitheater',
        startDate: '2027-05-10T09:00:00Z',
        endDate: '2027-05-12T18:00:00Z',
        registrationStart: '2026-01-01T00:00:00Z',
        registrationEnd: '2027-12-31T23:59:59Z',
        status: 'DRAFT',
        contactInformation: {
          name: 'Festival Director',
          email: 'e2e.fest@college.edu',
          phone: '9845012345',
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    createdEventId = res.body.data.id;
    expect(createdEventId).toBeDefined();

    // Transition status to REGISTRATION_OPEN
    const resStatus = await request(app)
      .patch(`/api/events/${createdEventId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'REGISTRATION_OPEN' });

    expect(resStatus.status).toBe(200);
    expect(resStatus.body.data.status).toBe('REGISTRATION_OPEN');
  });

  it('Step 2: Admin creates program within the event', async () => {
    const res = await request(app)
      .post('/api/programs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        eventId: createdEventId,
        name: 'Battle of the Bands',
        code: 'BOB',
        slug: 'battle-of-bands',
        description: 'Live musical ensemble band competition.',
        category: 'Cultural',
        participationType: 'TEAM',
        venue: 'Main Open Air Stage',
        date: '2027-05-11',
        startTime: '04:00 PM',
        endTime: '08:00 PM',
        capacity: 10,
        registrationStart: '2026-01-01T00:00:00Z',
        registrationEnd: '2027-12-31T23:59:59Z',
        rules: 'Original music or cover allowed. Time limit 12 minutes.',
        scoringConfig: {
          criteria: [
            { id: 'crit_vocals', name: 'Vocal Performance', maxScore: 40, weight: 1 },
            { id: 'crit_instr', name: 'Instrumentation & Tightness', maxScore: 40, weight: 1 },
            { id: 'crit_stage', name: 'Stage Energy & Crowd Connect', maxScore: 20, weight: 1 },
          ],
          totalMaxScore: 100,
          calculationMethod: 'SUM',
          pointsConfig: { firstPlace: 5, secondPlace: 3, thirdPlace: 1 },
          tieBreakerRule: 'Highest score on Vocal Performance',
          isJuryScoreVisibleToCoord: true,
        },
        registrationFields: [
          { id: 'f1', name: 'teamName', label: 'Band Name', type: 'text', required: true, displayOrder: 1 },
          { id: 'f2', name: 'genre', label: 'Musical Genre', type: 'text', required: true, displayOrder: 2 },
          { id: 'f3', name: 'registerNumber', label: 'Leader Student ID', type: 'text', required: true, displayOrder: 3 },
          { id: 'f4', name: 'email', label: 'Leader Email', type: 'email', required: true, displayOrder: 4 },
        ],
      });

    expect(res.status).toBe(201);
    createdProgramId = res.body.data.id;
    expect(createdProgramId).toBeDefined();

    // Transition program status to REGISTRATION_OPEN
    const resStatus = await request(app)
      .patch(`/api/programs/${createdProgramId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'REGISTRATION_OPEN' });

    expect(resStatus.status).toBe(200);
    expect(resStatus.body.data.status).toBe('REGISTRATION_OPEN');
  });

  it('Step 3: Admin updates instructions and verifies program fields', async () => {
    const res = await request(app)
      .put(`/api/programs/${createdProgramId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        instructions: 'Report to stage manager 45 minutes prior with cables and instruments.',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.instructions).toContain('Report to stage manager');
  });

  it('Step 4: Admin assigns Coordinator (Sarah Jenkins) to the program', async () => {
    const res = await request(app)
      .post('/api/assignments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: 'user_coord_01',
        role: 'coordinator',
        eventId: createdEventId,
        programId: createdProgramId,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.programId).toBe(createdProgramId);
  });

  it('Step 5: Admin assigns Jury Member (Marcus Chen) to the program', async () => {
    const res = await request(app)
      .post('/api/assignments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: 'user_jury_01',
        role: 'jury',
        eventId: createdEventId,
        programId: createdProgramId,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('jury');
  });

  it('Step 6: Public Participant (Team) registers via public endpoint', async () => {
    const res = await request(app)
      .post('/api/public/events/E2EFEST/programs/BOB/register')
      .send({
        participantType: 'TEAM',
        teamName: 'The Resonators',
        department: 'Computer Science',
        participantData: {
          teamName: 'The Resonators',
          genre: 'Progressive Rock',
          registerNumber: '23CS999',
          email: 'resonators.leader@college.edu',
        },
        teamMembers: [
          { name: 'Rohan Leader', registerNumber: '23CS999', email: 'resonators.leader@college.edu' },
          { name: 'Karthik Bass', registerNumber: '23CS998', email: 'karthik@college.edu' },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    createdRegistrationId = res.body.data.id;
    createdRegNumber = res.body.data.registrationNumber;

    expect(createdRegistrationId).toBeDefined();
    expect(createdRegNumber).toMatch(/^E2EFEST-BOB-\d{4}$/);
    expect(res.body.data.status).toBe('CONFIRMED');
  });

  it('Step 7: Assigned Coordinator views participant and marks attendance as PRESENT', async () => {
    // 1. Coordinator lists participants for their assigned program
    const listRes = await request(app)
      .get(`/api/programs/${createdProgramId}/participants`)
      .set('Authorization', `Bearer ${coordToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
    const found = listRes.body.data.find((p: any) => p.id === createdRegistrationId);
    expect(found).toBeDefined();

    // 2. Coordinator marks attendance
    const checkinRes = await request(app)
      .patch(`/api/registrations/${createdRegistrationId}/attendance`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({ attendanceStatus: 'PRESENT' });

    expect(checkinRes.status).toBe(200);
    expect(checkinRes.body.data.attendanceStatus).toBe('PRESENT');
  });

  it('Step 8: Assigned Jury scores the participant with criteria breakdown and locks score', async () => {
    // 1. Jury checks evaluations roster
    const evalRes = await request(app)
      .get(`/api/scores/programs/${createdProgramId}/evaluations`)
      .set('Authorization', `Bearer ${juryToken}`);

    expect(evalRes.status).toBe(200);
    expect(evalRes.body.data.evaluations.length).toBeGreaterThanOrEqual(1);

    // 2. Jury submits final score
    const scoreRes = await request(app)
      .post(`/api/scores/programs/${createdProgramId}/registrations/${createdRegistrationId}`)
      .set('Authorization', `Bearer ${juryToken}`)
      .send({
        criteriaScores: {
          crit_vocals: 38, // max 40
          crit_instr: 39,  // max 40
          crit_stage: 19,  // max 20
        },
        feedback: 'World-class instrumental precision and vocal command!',
        isFinalSubmit: true,
      });

    expect(scoreRes.status).toBe(200);
    expect(scoreRes.body.data.status).toBe('SUBMITTED');
    expect(scoreRes.body.data.totalScore).toBe(96);
  });

  it('Step 9: Admin generates authoritative results for the program', async () => {
    const res = await request(app)
      .post(`/api/programs/${createdProgramId}/calculate-results`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const winner = res.body.data[0];
    expect(winner.registrationId).toBe(createdRegistrationId);
    expect(winner.rank).toBe(1);
    expect(winner.position).toBe('1st');
    expect(winner.medal).toBe('Gold');
    expect(winner.pointsAwarded).toBe(5);
  });

  it('Step 10: Admin publishes authoritative results', async () => {
    const res = await request(app)
      .post(`/api/programs/${createdProgramId}/publish-results`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Public route now exposes the published podium
    const pubRes = await request(app).get(`/api/public/programs/${createdProgramId}/results`);
    expect(pubRes.status).toBe(200);
    expect(pubRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(pubRes.body.data[0].rank).toBe(1);
    expect(pubRes.body.data[0].medal).toBe('Gold');
  });

  it('Step 11: Department Leaderboard reflects points won from published results', async () => {
    const res = await request(app)
      .get(`/api/reports/leaderboard/department?eventId=${createdEventId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const cseEntry = res.body.data.find((d: any) => d.department === 'Computer Science');
    expect(cseEntry).toBeDefined();
    expect(cseEntry.totalPoints).toBeGreaterThanOrEqual(5);
    expect(cseEntry.goldCount).toBeGreaterThanOrEqual(1);
  });

  it('Step 12: Administrative reports generate correctly with new program data', async () => {
    // 1. Participant report
    const partRes = await request(app)
      .get(`/api/reports/participants?eventId=${createdEventId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(partRes.status).toBe(200);
    expect(partRes.body.data.length).toBeGreaterThanOrEqual(1);

    // 2. Program registration report
    const progRegRes = await request(app)
      .get('/api/reports/program-registrations')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(progRegRes.status).toBe(200);
    const item = progRegRes.body.data.find((p: any) => p.programId === createdProgramId);
    expect(item).toBeDefined();
    expect(item.confirmedCount).toBeGreaterThanOrEqual(1);
    expect(item.checkedInCount).toBeGreaterThanOrEqual(1);

    // 3. Jury scoring report
    const juryRes = await request(app)
      .get('/api/reports/jury-scoring')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(juryRes.status).toBe(200);
    const scoreItem = juryRes.body.data.find((s: any) => s.registrationId === createdRegistrationId);
    expect(scoreItem).toBeDefined();
    expect(scoreItem.totalScore).toBe(96);
  });

  it('Step 13: Data export generates CSV and Excel XML downloads for the newly completed program', async () => {
    // Export CSV
    const csvRes = await request(app)
      .get(`/api/reports/export/participants/csv?eventId=${createdEventId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(csvRes.status).toBe(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');
    expect(csvRes.text).toContain('The Resonators');
    expect(csvRes.text).toContain('Computer Science');

    // Export Excel XML
    const excelRes = await request(app)
      .get(`/api/reports/export/participants/excel?eventId=${createdEventId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(excelRes.status).toBe(200);
    expect(excelRes.headers['content-type']).toContain('application/vnd.ms-excel');
    expect(excelRes.text).toContain('The Resonators');
    expect(excelRes.text).toContain('Computer Science');
  });
});
