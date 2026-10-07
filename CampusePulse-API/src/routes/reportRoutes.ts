import { Router } from 'express';
import { ReportController } from '../controllers/reportController';
import { authenticateUser, requireRole } from '../middleware/auth';

const router = Router();

// ==========================================
// Public Leaderboard Endpoints
// ==========================================
router.get('/leaderboard/department', ReportController.getDepartmentLeaderboard);
router.get('/leaderboard/department/export/csv', ReportController.exportLeaderboardCSV);
router.get('/leaderboard/event/:eventId', ReportController.getEventLeaderboard);
router.get('/leaderboard/participants', ReportController.getParticipantLeaderboard);
router.get('/leaderboard/teams', ReportController.getTeamLeaderboard);

// ==========================================
// Authenticated Admin Reporting Endpoints
// ==========================================
router.use(authenticateUser);

// 1. Participant Report & Exports
router.get('/participants', requireRole('admin'), ReportController.queryParticipants);
router.get('/export/csv', requireRole('admin'), ReportController.exportParticipantsCSV);
router.get('/export/participants/csv', requireRole('admin'), ReportController.exportParticipantsCSV);
router.get('/export/participants/excel', requireRole('admin'), ReportController.exportParticipantsExcel);
router.get('/export/participants/print', requireRole('admin'), ReportController.exportParticipantsPrint);

// 2. Program Registration Report & Exports
router.get('/program-registrations', requireRole('admin'), ReportController.getProgramRegistrationReport);
router.get('/export/program-registrations/csv', requireRole('admin'), ReportController.exportProgramRegistrationCSV);
router.get('/export/program-registrations/excel', requireRole('admin'), ReportController.exportProgramRegistrationExcel);

// 3. Event Registration Report & Exports
router.get('/event-registrations', requireRole('admin'), ReportController.getEventRegistrationReport);
router.get('/export/event-registrations/csv', requireRole('admin'), ReportController.exportEventRegistrationCSV);
router.get('/export/event-registrations/excel', requireRole('admin'), ReportController.exportEventRegistrationExcel);

// 4. Program Winners Report & Exports
router.get('/winners', requireRole('admin'), ReportController.getWinnerReport);
router.get('/export/winners/csv', requireRole('admin'), ReportController.exportWinnersCSV);
router.get('/export/winners/excel', requireRole('admin'), ReportController.exportWinnersExcel);

// 5. Event Winners Report & Exports
router.get('/event-winners', requireRole('admin'), ReportController.getEventWinnersReport);
router.get('/export/event-winners/csv', requireRole('admin'), ReportController.exportEventWinnersCSV);
router.get('/export/event-winners/excel', requireRole('admin'), ReportController.exportEventWinnersExcel);

// 6. Department Leaderboard Exports
router.get('/export/leaderboard/csv', requireRole('admin'), ReportController.exportLeaderboardCSV);
router.get('/export/leaderboard/excel', requireRole('admin'), ReportController.exportLeaderboardExcel);

// 7. Overall Cross-Event Leaderboard & Exports
router.get('/leaderboard/overall', requireRole('admin'), ReportController.getOverallLeaderboard);
router.get('/export/overall-leaderboard/csv', requireRole('admin'), ReportController.exportOverallLeaderboardCSV);
router.get('/export/overall-leaderboard/excel', requireRole('admin'), ReportController.exportOverallLeaderboardExcel);

// 8. Jury Scoring Audit Report & Exports
router.get('/jury-scoring', requireRole('admin'), ReportController.getJuryScoringReport);
router.get('/export/jury-scoring/csv', requireRole('admin'), ReportController.exportJuryScoringCSV);
router.get('/export/jury-scoring/excel', requireRole('admin'), ReportController.exportJuryScoringExcel);

// Dashboard Analytics KPIs & Trends
router.get('/stats', requireRole('admin'), ReportController.getDashboardStats);

export default router;
