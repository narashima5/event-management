import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database/firestore';
import { Program, Score, Registration, SubmitScoreInputSchema } from '../types';
import { AuditService } from '../services/auditService';

export class ScoreController {
  /**
   * For assigned Jury: Fetch participants with their evaluation status (Draft/Submitted)
   */
  static async getJuryEvaluations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const programId = String(req.params.programId);
      const juryId = req.user!.uid;

      // Fetch program details
      const progDoc = await db.collection('programs').doc(programId).get();
      if (!progDoc.exists) {
        res.status(404).json({ success: false, message: 'Program not found' });
        return;
      }
      const program = progDoc.data() as Program;

      // Fetch confirmed participants
      const regSnapshot = await db
        .collection('registrations')
        .where('programId', '==', programId)
        .where('status', '==', 'CONFIRMED')
        .get();

      const participants = regSnapshot.docs.map((d: any) => d.data() as Registration);

      // Fetch existing scores by this jury member
      const scoresSnapshot = await db
        .collection('scores')
        .where('programId', '==', programId)
        .where('juryId', '==', juryId)
        .get();

      const scoresMap: Record<string, Score> = {};
      scoresSnapshot.docs.forEach((d: any) => {
        const s = d.data() as Score;
        scoresMap[s.registrationId] = s;
      });

      // Combine
      const evaluations = participants.map((p: Registration) => {
        const score = scoresMap[p.id];
        return {
          registration: p,
          evaluationStatus: score ? score.status : 'PENDING',
          score: score || null,
        };
      });

      res.json({
        success: true,
        data: {
          program: {
            id: program.id,
            name: program.name,
            code: program.code,
            scoringConfig: program.scoringConfig,
          },
          evaluations,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Save draft score or Submit final score
   */
  static async saveOrSubmitScore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const programId = String(req.params.programId);
      const registrationId = String(req.params.registrationId);
      const input = SubmitScoreInputSchema.parse(req.body);
      const jury = req.user!;
      const db = getDb();

      // Fetch program to validate criteria limits
      const progDoc = await db.collection('programs').doc(programId).get();
      if (!progDoc.exists) {
        res.status(404).json({ success: false, message: 'Program not found' });
        return;
      }
      const program = progDoc.data() as Program;
      const scoringConfig = program.scoringConfig;

      // Anti-Tampering Check: Verify registration exists and strictly belongs to this program
      const regDoc = await db.collection('registrations').doc(registrationId).get();
      if (!regDoc.exists) {
        res.status(404).json({
          success: false,
          message: 'Registration not found for scoring',
          code: 'REGISTRATION_NOT_FOUND',
        });
        return;
      }
      const registration = regDoc.data() as Registration;
      if (registration.programId !== programId) {
        res.status(400).json({
          success: false,
          message: 'Invalid request: Registration does not belong to the specified program',
          code: 'PROGRAM_REGISTRATION_MISMATCH',
        });
        return;
      }

      // Validate each criterion score within its maximum
      let totalScore = 0;
      for (const criterion of scoringConfig.criteria) {
        const scoreVal = input.criteriaScores[criterion.id];
        if (scoreVal === undefined) {
          if (input.isFinalSubmit) {
            res.status(400).json({
              success: false,
              message: `Missing score for criterion '${criterion.name}'`,
              code: 'CRITERION_MISSING',
            });
            return;
          }
        } else {
          if (scoreVal < 0 || scoreVal > criterion.maxScore) {
            res.status(400).json({
              success: false,
              message: `Score for '${criterion.name}' (${scoreVal}) exceeds maximum allowed (${criterion.maxScore})`,
              code: 'SCORE_EXCEEDS_MAX',
            });
            return;
          }
          totalScore += scoreVal;
        }
      }

      // Check existing score
      const scoreId = `score_${programId}_${registrationId}_${jury.uid}`;
      const scoreRef = db.collection('scores').doc(scoreId);
      const existingScoreDoc = await scoreRef.get();

      if (existingScoreDoc.exists) {
        const existing = existingScoreDoc.data() as Score;
        // If already submitted/locked, cannot edit unless unlocked
        if (existing.status === 'SUBMITTED' || existing.status === 'LOCKED') {
          res.status(403).json({
            success: false,
            message: 'Forbidden: This score has been submitted and locked. Contact an administrator to unlock it.',
            code: 'SCORE_LOCKED',
          });
          return;
        }
      }

      const now = new Date().toISOString();
      const status = input.isFinalSubmit ? 'SUBMITTED' : 'DRAFT';

      const scoreData: Score = {
        id: scoreId,
        programId,
        registrationId,
        juryId: jury.uid,
        juryName: jury.name,
        criteriaScores: input.criteriaScores,
        totalScore,
        feedback: input.feedback,
        status,
        submittedAt: input.isFinalSubmit ? now : undefined,
        updatedAt: now,
      };

      await scoreRef.set(scoreData);

      await AuditService.logAction({
        userId: jury.uid,
        userName: jury.name,
        userRole: 'jury',
        action: input.isFinalSubmit ? 'SCORE_SUBMITTED' : 'SCORE_DRAFT_SAVED',
        entity: 'score',
        entityId: scoreId,
        metadata: {
          jury: jury.name,
          juryId: jury.uid,
          participant: registrationId,
          program: program.name,
          programId,
          scores: input.criteriaScores,
          totalScore,
          submissionTimestamp: now,
          scoreStatus: status,
          isFinal: input.isFinalSubmit,
        },
      });

      res.json({
        success: true,
        message: input.isFinalSubmit ? 'Score successfully submitted and locked' : 'Draft score saved',
        data: scoreData,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin unlocks a locked score so jury can update it
   */
  static async unlockScore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const scoreId = String(req.params.scoreId);
      const { reason } = req.body;
      const db = getDb();
      const scoreRef = db.collection('scores').doc(scoreId);
      const doc = await scoreRef.get();

      if (!doc.exists) {
        res.status(404).json({ success: false, message: 'Score record not found' });
        return;
      }

      await scoreRef.update({
        status: 'DRAFT',
        updatedAt: new Date().toISOString(),
      });

      await AuditService.logAction({
        userId: req.user!.uid,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'SCORE_UNLOCKED',
        entity: 'score',
        entityId: scoreId,
        metadata: { reason: reason || 'Admin unlocked for correction' },
      });

      res.json({
        success: true,
        message: 'Score unlocked successfully for jury revision',
        data: { id: scoreId, status: 'DRAFT' },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * View all scores for a program (Admin only)
   */
  static async getProgramScores(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const programId = String(req.params.programId);

      const snapshot = await db.collection('scores').where('programId', '==', programId).get();
      const scores = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));

      res.json({
        success: true,
        data: scores,
      });
    } catch (err) {
      next(err);
    }
  }
}
