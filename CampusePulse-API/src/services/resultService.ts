import { getDb } from '../database/firestore';
import {
  Program,
  Score,
  Registration,
  Result,
  DepartmentLeaderboardEntry,
  ParticipantLeaderboardEntry,
  TeamLeaderboardEntry,
  EventLeaderboardData,
} from '../types';
import { AuditService } from './auditService';

export class ResultService {
  /**
   * Calculates program results from all SUBMITTED and LOCKED jury scores
   */
  static async calculateProgramResults(
    programId: string,
    performedByUserId: string
  ): Promise<{ results: Result[]; incompleteJudging: boolean; completedJuryCount: number; totalJuriesAssigned: number }> {
    const db = getDb();

    // 1. Fetch program and event
    const programDoc = await db.collection('programs').doc(programId).get();
    if (!programDoc.exists) {
      const err: any = new Error(`Program ${programId} not found`);
      err.statusCode = 404;
      throw err;
    }
    const program = programDoc.data() as Program;
    const scoringConfig = program.scoringConfig;

    let eventName = program.eventId;
    try {
      const eventDoc = await db.collection('events').doc(program.eventId).get();
      if (eventDoc.exists) {
        eventName = (eventDoc.data() as any).name || program.eventId;
      }
    } catch (_) {}

    // Check total juries assigned to this program
    const juryAssignmentsSnap = await db
      .collection('assignments')
      .where('programId', '==', programId)
      .where('role', '==', 'jury')
      .get();
    const totalJuriesAssigned = juryAssignmentsSnap.size;

    // 2. Fetch all confirmed registrations for this program
    const regSnapshot = await db
      .collection('registrations')
      .where('programId', '==', programId)
      .where('status', '==', 'CONFIRMED')
      .get();

    const registrations = regSnapshot.docs.map(
      (d: any) => ({ id: d.id, ...d.data() }) as Registration
    );
    if (registrations.length === 0) {
      return { results: [], incompleteJudging: false, completedJuryCount: 0, totalJuriesAssigned };
    }

    // 3. Fetch all SUBMITTED / LOCKED scores for this program (ignore drafts)
    const scoresSnapshot = await db
      .collection('scores')
      .where('programId', '==', programId)
      .where('status', 'in', ['SUBMITTED', 'LOCKED'])
      .get();

    const scores: Score[] = scoresSnapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as Score));

    // Track unique juries who evaluated
    const uniqueJuryIds = new Set<string>();
    scores.forEach((s: Score) => uniqueJuryIds.add(s.juryId));
    const completedJuryCount = uniqueJuryIds.size;
    const incompleteJudging = totalJuriesAssigned > 0 && completedJuryCount < totalJuriesAssigned;

    // Group scores by registrationId
    const scoresByRegId: Record<string, Score[]> = {};
    for (const score of scores) {
      if (!scoresByRegId[score.registrationId]) {
        scoresByRegId[score.registrationId] = [];
      }
      scoresByRegId[score.registrationId].push(score);
    }

    // 4. Compute aggregated score per participant
    interface ParticipantSummary {
      registration: Registration;
      juryCount: number;
      totalScore: number;
      averageScore: number;
      weightedScore: number;
      finalScore: number;
      firstCriterionScore: number; // for tie breaking
      secondCriterionScore: number; // secondary tie breaker
    }

    const summaries: ParticipantSummary[] = [];
    const criteriaList = scoringConfig?.criteria || [];
    const calcMethod = scoringConfig?.calculationMethod || 'AVERAGE';
    const totalWeights = criteriaList.reduce((acc, c) => acc + (c.weight || 1), 0) || 1;

    for (const reg of registrations) {
      const regScores = scoresByRegId[reg.id] || [];
      if (regScores.length === 0) continue; // Only evaluated participants

      let totalRawScoreSum = 0;
      let computedJuryScores: number[] = [];
      let firstCriterionTotal = 0;
      let secondCriterionTotal = 0;

      for (const s of regScores) {
        totalRawScoreSum += s.totalScore;
        let singleJudgeScore = s.totalScore;

        if (calcMethod === 'WEIGHTED' && criteriaList.length > 0) {
          let weightedSum = 0;
          for (const crit of criteriaList) {
            const rawScore = s.criteriaScores[crit.id] || 0;
            const w = crit.weight || 1;
            weightedSum += rawScore * w;
          }
          singleJudgeScore = Number((weightedSum / totalWeights).toFixed(2));
        }

        computedJuryScores.push(singleJudgeScore);

        const firstCritId = criteriaList[0]?.id;
        if (firstCritId && s.criteriaScores[firstCritId] !== undefined) {
          firstCriterionTotal += s.criteriaScores[firstCritId];
        }

        const secondCritId = criteriaList[1]?.id;
        if (secondCritId && s.criteriaScores[secondCritId] !== undefined) {
          secondCriterionTotal += s.criteriaScores[secondCritId];
        }
      }

      const totalScore = Number(totalRawScoreSum.toFixed(2));
      const avgScore = Number((totalRawScoreSum / regScores.length).toFixed(2));
      const weightedScore = Number(
        (computedJuryScores.reduce((a, b) => a + b, 0) / regScores.length).toFixed(2)
      );

      // Determine final authoritative score based on calculation method
      let finalScore = avgScore;
      if (calcMethod === 'SUM') {
        finalScore = totalScore;
      } else if (calcMethod === 'WEIGHTED') {
        finalScore = weightedScore;
      }

      const firstCritAvg = Number((firstCriterionTotal / regScores.length).toFixed(2));
      const secondCritAvg = Number((secondCriterionTotal / regScores.length).toFixed(2));

      summaries.push({
        registration: reg,
        juryCount: regScores.length,
        totalScore,
        averageScore: avgScore,
        weightedScore,
        finalScore,
        firstCriterionScore: firstCritAvg,
        secondCriterionScore: secondCritAvg,
      });
    }

    // Sort descending by finalScore; if tie, break using firstCriterionScore, then secondCriterionScore
    summaries.sort((a, b) => {
      const diff = b.finalScore - a.finalScore;
      if (Math.abs(diff) > 0.001) return diff;
      const crit1Diff = b.firstCriterionScore - a.firstCriterionScore;
      if (Math.abs(crit1Diff) > 0.001) return crit1Diff;
      return b.secondCriterionScore - a.secondCriterionScore;
    });

    // 5. Rank and assign points & podium medals (supporting joint ties)
    const pointsConfig = scoringConfig?.pointsConfig || { firstPlace: 5, secondPlace: 3, thirdPlace: 1 };
    const results: Result[] = [];
    const now = new Date().toISOString();

    let currentRank = 1;

    for (let index = 0; index < summaries.length; index++) {
      const item = summaries[index];

      // Handle joint ranking if tied on all dimensions
      if (index > 0) {
        const prev = summaries[index - 1];
        const isIdentical =
          Math.abs(item.finalScore - prev.finalScore) < 0.001 &&
          Math.abs(item.firstCriterionScore - prev.firstCriterionScore) < 0.001 &&
          Math.abs(item.secondCriterionScore - prev.secondCriterionScore) < 0.001;

        if (!isIdentical) {
          currentRank = index + 1;
        }
      } else {
        currentRank = 1;
      }

      const rank = currentRank;
      let position: Result['position'] = 'Participant';
      let medal: Result['medal'] = undefined;
      let pointsAwarded = 0;

      if (rank === 1) {
        position = '1st';
        medal = 'Gold';
        pointsAwarded = pointsConfig.firstPlace;
      } else if (rank === 2) {
        position = '2nd';
        medal = 'Silver';
        pointsAwarded = pointsConfig.secondPlace;
      } else if (rank === 3) {
        position = '3rd';
        medal = 'Bronze';
        pointsAwarded = pointsConfig.thirdPlace;
      } else if (rank <= 5) {
        position = 'Finalist';
        pointsAwarded = 0;
      }

      const participantName =
        item.registration.participantType === 'TEAM'
          ? item.registration.teamName || item.registration.participantData?.teamName || 'Team'
          : item.registration.participantData?.name ||
            item.registration.participantData?.fullName ||
            'Participant';

      const resultDoc: Result = {
        id: `res_${programId}_${item.registration.id}`,
        programId,
        programName: program.name,
        programCategory: program.category,
        eventId: program.eventId,
        eventName,
        registrationId: item.registration.id,
        registrationNumber: item.registration.registrationNumber,
        participantName,
        teamName: item.registration.teamName,
        department: item.registration.department || 'General',
        rank,
        position,
        medal,
        totalScore: item.totalScore,
        averageScore: item.finalScore, // Authoritative final score
        pointsAwarded,
        resultStatus: 'DRAFT',
        calculatedAt: now,
      };

      results.push(resultDoc);
    }

    // 6. Persist results in Firestore batch
    const batch = db.batch();
    for (const res of results) {
      const ref = db.collection('results').doc(res.id);
      batch.set(ref, res);
    }
    await batch.commit();

    // 7. Log audit
    await AuditService.logAction({
      userId: performedByUserId,
      action: 'RESULTS_CALCULATED',
      entity: 'program',
      entityId: programId,
      metadata: {
        totalEvaluated: results.length,
        incompleteJudging,
        completedJuryCount,
        totalJuriesAssigned,
        topRank: results[0]?.participantName,
      },
    });

    return {
      results,
      incompleteJudging,
      completedJuryCount,
      totalJuriesAssigned,
    };
  }

  /**
   * Publishes program results to coordinators, participants, and leaderboards
   */
  static async publishProgramResults(programId: string, performedByUserId: string): Promise<void> {
    const db = getDb();

    // Fetch existing results
    const resultsSnapshot = await db
      .collection('results')
      .where('programId', '==', programId)
      .get();

    if (resultsSnapshot.empty) {
      const err: any = new Error('No calculated results found to publish. Run result calculation first.');
      err.statusCode = 400;
      throw err;
    }

    const now = new Date().toISOString();
    const batch = db.batch();

    resultsSnapshot.docs.forEach((doc: any) => {
      const ref = db.collection('results').doc(doc.id);
      batch.update(ref, {
        resultStatus: 'PUBLISHED',
        publishedAt: now,
      });
    });

    // Update program status to RESULTS_PUBLISHED
    const progRef = db.collection('programs').doc(programId);
    batch.update(progRef, {
      status: 'RESULTS_PUBLISHED',
      updatedAt: now,
    });

    await batch.commit();

    // Audit log
    await AuditService.logAction({
      userId: performedByUserId,
      action: 'RESULTS_PUBLISHED',
      entity: 'program',
      entityId: programId,
      metadata: {
        publishedAt: now,
        resultCount: resultsSnapshot.size,
      },
    });
  }

  /**
   * Unpublishes program results (reverts to DRAFT so results are hidden publicly)
   */
  static async unpublishProgramResults(programId: string, performedByUserId: string): Promise<void> {
    const db = getDb();

    const resultsSnapshot = await db
      .collection('results')
      .where('programId', '==', programId)
      .get();

    if (resultsSnapshot.empty) {
      const err: any = new Error('No results found for this program to unpublish.');
      err.statusCode = 404;
      throw err;
    }

    const now = new Date().toISOString();
    const batch = db.batch();

    resultsSnapshot.docs.forEach((doc: any) => {
      const ref = db.collection('results').doc(doc.id);
      batch.update(ref, {
        resultStatus: 'DRAFT',
        publishedAt: null,
      });
    });

    // Revert program status back to COMPLETED
    const progRef = db.collection('programs').doc(programId);
    batch.update(progRef, {
      status: 'COMPLETED',
      updatedAt: now,
    });

    await batch.commit();

    // Audit log
    await AuditService.logAction({
      userId: performedByUserId,
      action: 'RESULTS_UNPUBLISHED',
      entity: 'program',
      entityId: programId,
      metadata: {
        unpublishedAt: now,
        resultCount: resultsSnapshot.size,
      },
    });
  }

  /**
   * Calculates comprehensive Event Leaderboards (Department, Participant, Team)
   * with configurable points aggregation across all published programs
   */
  static async getEventLeaderboards(
    eventId: string,
    customPointsConfig?: { firstPlace?: number; secondPlace?: number; thirdPlace?: number }
  ): Promise<EventLeaderboardData> {
    const db = getDb();

    // 1. Fetch event
    const eventDoc = await db.collection('events').doc(eventId).get();
    const eventName = eventDoc.exists ? (eventDoc.data() as any).name : eventId;

    const pointsConfig = {
      firstPlace: customPointsConfig?.firstPlace ?? 5,
      secondPlace: customPointsConfig?.secondPlace ?? 3,
      thirdPlace: customPointsConfig?.thirdPlace ?? 1,
    };

    // 2. Fetch all published results for this event
    const resultsSnapshot = await db
      .collection('results')
      .where('eventId', '==', eventId)
      .where('resultStatus', '==', 'PUBLISHED')
      .get();

    const results = resultsSnapshot.docs.map((d: any) => d.data() as Result);

    // Also fetch registrations to know participantType
    const regSnapshot = await db.collection('registrations').where('eventId', '==', eventId).get();
    const regMap = new Map<string, Registration>();
    regSnapshot.docs.forEach((d: any) => {
      regMap.set(d.id, d.data() as Registration);
    });

    // -------------------------------------------------------------
    // A. Department Leaderboard
    // -------------------------------------------------------------
    const deptMap: Record<string, DepartmentLeaderboardEntry> = {};

    for (const res of results) {
      const dept = res.department || 'General';
      if (!deptMap[dept]) {
        deptMap[dept] = {
          department: dept,
          totalPoints: 0,
          goldCount: 0,
          silverCount: 0,
          bronzeCount: 0,
          totalParticipants: 0,
        };
      }

      let pts = 0;
      if (res.rank === 1) {
        pts = pointsConfig.firstPlace;
        deptMap[dept].goldCount += 1;
      } else if (res.rank === 2) {
        pts = pointsConfig.secondPlace;
        deptMap[dept].silverCount += 1;
      } else if (res.rank === 3) {
        pts = pointsConfig.thirdPlace;
        deptMap[dept].bronzeCount += 1;
      }

      deptMap[dept].totalPoints += pts;
      deptMap[dept].totalParticipants += 1;
    }

    const departmentLeaderboard = Object.values(deptMap).sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.goldCount !== a.goldCount) return b.goldCount - a.goldCount;
      return b.silverCount - a.silverCount;
    });

    // -------------------------------------------------------------
    // B. Participant Leaderboard (Individual Champions)
    // -------------------------------------------------------------
    const participantMap: Record<string, ParticipantLeaderboardEntry> = {};

    for (const res of results) {
      const reg = regMap.get(res.registrationId);
      if (reg && reg.participantType === 'TEAM') continue; // Only individuals

      const key = res.registrationNumber || res.participantName;
      if (!participantMap[key]) {
        participantMap[key] = {
          rank: 1,
          participantName: res.participantName,
          department: res.department || 'General',
          registerNumber: reg?.participantData?.registerNumber || reg?.participantData?.studentId,
          totalPoints: 0,
          goldCount: 0,
          silverCount: 0,
          bronzeCount: 0,
          eventsWonCount: 0,
          programsWon: [],
        };
      }

      let pts = 0;
      if (res.rank === 1) {
        pts = pointsConfig.firstPlace;
        participantMap[key].goldCount += 1;
      } else if (res.rank === 2) {
        pts = pointsConfig.secondPlace;
        participantMap[key].silverCount += 1;
      } else if (res.rank === 3) {
        pts = pointsConfig.thirdPlace;
        participantMap[key].bronzeCount += 1;
      }

      participantMap[key].totalPoints += pts;
      if (res.rank <= 3) {
        participantMap[key].eventsWonCount += 1;
        participantMap[key].programsWon.push({
          programId: res.programId,
          programName: res.programName || 'Program',
          position: res.position,
          points: pts,
        });
      }
    }

    const participantLeaderboard = Object.values(participantMap)
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.goldCount !== a.goldCount) return b.goldCount - a.goldCount;
        return b.silverCount - a.silverCount;
      })
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    // -------------------------------------------------------------
    // C. Team Leaderboard (Team Champions)
    // -------------------------------------------------------------
    const teamMap: Record<string, TeamLeaderboardEntry> = {};

    for (const res of results) {
      const reg = regMap.get(res.registrationId);
      if (!reg || reg.participantType !== 'TEAM') continue; // Only teams

      const teamName = res.teamName || reg.teamName || res.participantName;
      const key = teamName;
      if (!teamMap[key]) {
        teamMap[key] = {
          rank: 1,
          teamName,
          department: res.department || 'General',
          totalPoints: 0,
          goldCount: 0,
          silverCount: 0,
          bronzeCount: 0,
          eventsWonCount: 0,
          programsWon: [],
        };
      }

      let pts = 0;
      if (res.rank === 1) {
        pts = pointsConfig.firstPlace;
        teamMap[key].goldCount += 1;
      } else if (res.rank === 2) {
        pts = pointsConfig.secondPlace;
        teamMap[key].silverCount += 1;
      } else if (res.rank === 3) {
        pts = pointsConfig.thirdPlace;
        teamMap[key].bronzeCount += 1;
      }

      teamMap[key].totalPoints += pts;
      if (res.rank <= 3) {
        teamMap[key].eventsWonCount += 1;
        teamMap[key].programsWon.push({
          programId: res.programId,
          programName: res.programName || 'Program',
          position: res.position,
          points: pts,
        });
      }
    }

    const teamLeaderboard = Object.values(teamMap)
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.goldCount !== a.goldCount) return b.goldCount - a.goldCount;
        return b.silverCount - a.silverCount;
      })
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    return {
      eventId,
      eventName,
      pointsConfig,
      departmentLeaderboard,
      participantLeaderboard,
      teamLeaderboard,
    };
  }
}
