import { Router } from 'express';
import { EventController } from '../controllers/eventController';
import { RegistrationController } from '../controllers/registrationController';
import { getDb } from '../database/firestore';

import rateLimit from 'express-rate-limit';

const router = Router();

// Registration-specific rate limiter (to prevent automated registration spamming)
const registrationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // max 30 registrations per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many registration requests. Please wait a minute before submitting again.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

// 1. List active published events
router.get('/events', EventController.listPublicEvents);

// 2. Get event and its programs by code or slug
router.get('/events/:codeOrSlug', EventController.getPublicEvent);

// 3. Program registration details lookup (by code or slug)
router.get('/events/:eventCodeOrSlug/programs/:programCodeOrSlug', RegistrationController.getPublicProgramDetails);
router.get('/register/:eventSlug/:programSlug', RegistrationController.getPublicProgramDetails);

// 4. Register for a program (supports both code and slug)
router.post('/events/:eventCode/programs/:programCode/register', registrationLimiter, RegistrationController.registerPublic);
router.post('/register/:eventSlug/:programSlug', registrationLimiter, RegistrationController.registerPublic);

// 5. Confirmation slip lookup
router.get('/registrations/:regNumber', RegistrationController.getPublicConfirmation);

// 5. Public published results (supports programId, code, or slug)
router.get('/programs/:programId/results', async (req, res, next) => {
  try {
    const db = getDb();
    const param = String(req.params.programId);
    let programId = param;

    const docCheck = await db.collection('programs').doc(param).get();
    if (!docCheck.exists) {
      const snap = await db
        .collection('programs')
        .where('code', '==', param.toUpperCase())
        .limit(1)
        .get();
      if (!snap.empty) {
        programId = snap.docs[0].id;
      } else {
        const slugSnap = await db
          .collection('programs')
          .where('slug', '==', param.toLowerCase())
          .limit(1)
          .get();
        if (!slugSnap.empty) {
          programId = slugSnap.docs[0].id;
        }
      }
    }

    const resultsSnapshot = await db
      .collection('results')
      .where('programId', '==', programId)
      .where('resultStatus', '==', 'PUBLISHED')
      .get();

    const results = resultsSnapshot.docs
      .map((d: any) => {
        const data = d.data();
        return {
          rank: data.rank,
          position: data.position,
          medal:
            data.medal ||
            (data.rank === 1
              ? 'Gold'
              : data.rank === 2
              ? 'Silver'
              : data.rank === 3
              ? 'Bronze'
              : null),
          participantName: data.participantName,
          teamName: data.teamName,
          department: data.department,
          totalScore: data.totalScore,
          averageScore: data.averageScore,
          pointsAwarded: data.pointsAwarded,
        };
      })
      .sort((a: any, b: any) => a.rank - b.rank);

    res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    next(err);
  }
});

// 6. Public event results (all published programs for an event)
router.get('/events/:codeOrSlug/results', async (req, res, next) => {
  try {
    const db = getDb();
    const param = String(req.params.codeOrSlug);

    // Resolve event
    let event: any = null;
    let eventDoc = await db.collection('events').doc(param).get();
    if (eventDoc.exists) {
      event = { id: eventDoc.id, ...eventDoc.data() };
    } else {
      let snap = await db
        .collection('events')
        .where('code', '==', param.toUpperCase())
        .limit(1)
        .get();
      if (!snap.empty) {
        event = { id: snap.docs[0].id, ...snap.docs[0].data() };
      } else {
        snap = await db
          .collection('events')
          .where('slug', '==', param.toLowerCase())
          .limit(1)
          .get();
        if (!snap.empty) {
          event = { id: snap.docs[0].id, ...snap.docs[0].data() };
        }
      }
    }

    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    // Fetch programs for this event
    const progsSnap = await db
      .collection('programs')
      .where('eventId', '==', event.id)
      .get();

    const programs = progsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    // Fetch ONLY published results for this event
    const resultsSnap = await db
      .collection('results')
      .where('eventId', '==', event.id)
      .where('resultStatus', '==', 'PUBLISHED')
      .get();

    const results = resultsSnap.docs.map((d: any) => d.data());

    // Group by program
    const programsWithResults = programs
      .filter((p: any) => p.status === 'RESULTS_PUBLISHED')
      .map((p: any) => {
        const progResults = results
          .filter((r: any) => r.programId === p.id)
          .map((r: any) => ({
            rank: r.rank,
            position: r.position,
            medal: r.medal || (r.rank === 1 ? 'Gold' : r.rank === 2 ? 'Silver' : r.rank === 3 ? 'Bronze' : null),
            participantName: r.participantName,
            teamName: r.teamName,
            department: r.department,
            totalScore: r.totalScore,
            averageScore: r.averageScore,
            pointsAwarded: r.pointsAwarded,
          }))
          .sort((a: any, b: any) => a.rank - b.rank);

        return {
          id: p.id,
          name: p.name,
          code: p.code,
          category: p.category,
          venue: p.venue,
          date: p.date,
          results: progResults,
        };
      });

    res.json({
      success: true,
      data: {
        event: {
          id: event.id,
          name: event.name,
          code: event.code,
          startDate: event.startDate,
          endDate: event.endDate,
        },
        programs: programsWithResults,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 7. Public event leaderboard
router.get('/events/:codeOrSlug/leaderboard', async (req, res, next) => {
  try {
    const db = getDb();
    const param = String(req.params.codeOrSlug);

    // Resolve event
    let eventId = param;
    let eventDoc = await db.collection('events').doc(param).get();
    if (!eventDoc.exists) {
      let snap = await db
        .collection('events')
        .where('code', '==', param.toUpperCase())
        .limit(1)
        .get();
      if (!snap.empty) {
        eventId = snap.docs[0].id;
      } else {
        snap = await db
          .collection('events')
          .where('slug', '==', param.toLowerCase())
          .limit(1)
          .get();
        if (!snap.empty) {
          eventId = snap.docs[0].id;
        }
      }
    }

    const { firstPlace, secondPlace, thirdPlace } = req.query;
    const customPointsConfig = {
      firstPlace: firstPlace !== undefined ? Number(firstPlace) : undefined,
      secondPlace: secondPlace !== undefined ? Number(secondPlace) : undefined,
      thirdPlace: thirdPlace !== undefined ? Number(thirdPlace) : undefined,
    };

    const { ResultService } = await import('../services/resultService');
    const leaderboards = await ResultService.getEventLeaderboards(eventId, customPointsConfig);

    res.json({
      success: true,
      data: leaderboards,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
