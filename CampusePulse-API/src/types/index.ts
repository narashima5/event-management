import { z } from 'zod';

// ==========================================
// CONSTANTS & ENUMS
// ==========================================

export const UserRoles = ['admin', 'coordinator', 'jury', 'public'] as const;
export type UserRole = (typeof UserRoles)[number];

export const EventStatuses = [
  'DRAFT',
  'PUBLISHED',
  'REGISTRATION_OPEN',
  'REGISTRATION_CLOSED',
  'ONGOING',
  'COMPLETED',
  'ARCHIVED',
] as const;
export type EventStatus = (typeof EventStatuses)[number];

export const ProgramStatuses = [
  'DRAFT',
  'PUBLISHED',
  'REGISTRATION_OPEN',
  'REGISTRATION_CLOSED',
  'ONGOING',
  'JUDGING',
  'COMPLETED',
  'RESULTS_PUBLISHED',
  'ARCHIVED',
] as const;
export type ProgramStatus = (typeof ProgramStatuses)[number];

export const RegistrationStatuses = [
  'PENDING',
  'CONFIRMED',
  'CANCELLED',
  'DISQUALIFIED',
] as const;
export type RegistrationStatus = (typeof RegistrationStatuses)[number];

export const AttendanceStatuses = ['PENDING', 'PRESENT', 'ABSENT'] as const;
export type AttendanceStatus = (typeof AttendanceStatuses)[number];

export const ScoreStatuses = ['DRAFT', 'SUBMITTED', 'LOCKED'] as const;
export type ScoreStatus = (typeof ScoreStatuses)[number];

export const ParticipationTypes = ['INDIVIDUAL', 'TEAM'] as const;
export type ParticipationType = (typeof ParticipationTypes)[number];

export const DefaultCategories = [
  'Arts',
  'Sports',
  'Technical',
  'Literary',
  'Cultural',
  'Academic',
  'Other',
] as const;

// ==========================================
// REGISTRATION FIELD CONFIGURATION
// ==========================================

export const RegistrationFieldTypeEnum = [
  'text',
  'number',
  'email',
  'phone',
  'select',
  'radio',
  'checkbox',
  'date',
  'textarea',
  'file',
] as const;
export type RegistrationFieldType = (typeof RegistrationFieldTypeEnum)[number];

export const RegistrationFieldSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  key: z.string().optional(),
  label: z.string().min(1),
  type: z.enum(RegistrationFieldTypeEnum),
  required: z.boolean().default(true),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
  validation: z.string().optional(),
  displayOrder: z.number().int().optional(),
  defaultValue: z.any().optional(),
  helperText: z.string().optional(),
  accept: z.string().optional(),
});
export type RegistrationField = z.infer<typeof RegistrationFieldSchema>;

// ==========================================
// SCORING CONFIGURATION
// ==========================================

export const ScoringCriterionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  maxScore: z.number().positive(),
  weight: z.number().positive().default(1),
  description: z.string().optional(),
});
export type ScoringCriterion = z.infer<typeof ScoringCriterionSchema>;

export const ProgramScoringConfigSchema = z.object({
  criteria: z.array(ScoringCriterionSchema).min(1),
  totalMaxScore: z.number().positive(),
  calculationMethod: z.enum(['SUM', 'AVERAGE', 'WEIGHTED']).default('SUM'),
  pointsConfig: z.object({
    firstPlace: z.number().default(5),
    secondPlace: z.number().default(3),
    thirdPlace: z.number().default(1),
  }),
  tieBreakerRule: z.string().default('Highest score on first criterion, then jury consensus'),
  isJuryScoreVisibleToCoord: z.boolean().default(false),
});
export type ProgramScoringConfig = z.infer<typeof ProgramScoringConfigSchema>;

// ==========================================
// USER & ASSIGNMENT MODELS
// ==========================================

export const UserSchema = z.object({
  uid: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(UserRoles),
  phone: z.string().optional(),
  department: z.string().optional(),
  status: z.enum(['active', 'inactive', 'ACTIVE', 'INACTIVE']).default('active'),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type User = z.infer<typeof UserSchema>;

export const AssignmentSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  userEmail: z.string().email().optional(),
  userName: z.string().optional(),
  role: z.enum(['coordinator', 'jury']),
  eventId: z.string().min(1),
  programId: z.string().min(1),
  status: z.enum(['active', 'inactive', 'ACTIVE', 'INACTIVE']).default('active'),
  assignedAt: z.string(),
  assignedBy: z.string(),
});
export type Assignment = z.infer<typeof AssignmentSchema>;

// ==========================================
// EVENT MODEL
// ==========================================

export const EventSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  code: z.string().min(2).max(10).toUpperCase(),
  slug: z.string().min(1),
  description: z.string(),
  venue: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  registrationStart: z.string(),
  registrationEnd: z.string(),
  status: z.enum(EventStatuses).default('DRAFT'),
  logoUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
  contactInfo: z.string().optional(),
  rules: z.string().optional(),
  termsNotes: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Event = z.infer<typeof EventSchema>;

export const CreateEventInputSchema = EventSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
});
export type CreateEventInput = z.infer<typeof CreateEventInputSchema>;

export const UpdateEventInputSchema = CreateEventInputSchema.partial();
export type UpdateEventInput = z.infer<typeof UpdateEventInputSchema>;

// ==========================================
// PROGRAM MODEL
// ==========================================

export const ProgramSchema = z.object({
  id: z.string().min(1),
  eventId: z.string().min(1),
  name: z.string().min(1),
  code: z.string().min(2).max(10).toUpperCase(),
  slug: z.string().min(1),
  description: z.string(),
  category: z.string(),
  participationType: z.enum(ParticipationTypes).default('INDIVIDUAL'),
  venue: z.string(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  capacity: z.number().int().positive().default(50),
  registeredCount: z.number().int().default(0),
  status: z.enum(ProgramStatuses).default('DRAFT'),
  registrationStart: z.string(),
  registrationEnd: z.string(),
  rules: z.string().optional(),
  instructions: z.string().optional(),
  scoringConfig: ProgramScoringConfigSchema,
  registrationFields: z.array(RegistrationFieldSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Program = z.infer<typeof ProgramSchema>;

export const CreateProgramInputSchema = ProgramSchema.omit({
  id: true,
  registeredCount: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateProgramInput = z.infer<typeof CreateProgramInputSchema>;

export const UpdateProgramInputSchema = CreateProgramInputSchema.partial();
export type UpdateProgramInput = z.infer<typeof UpdateProgramInputSchema>;

// ==========================================
// REGISTRATION MODEL
// ==========================================

export const TeamMemberSchema = z.object({
  name: z.string().min(1),
  registerNumber: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});
export type TeamMember = z.infer<typeof TeamMemberSchema>;

export const RegistrationSchema = z.object({
  id: z.string().min(1),
  registrationNumber: z.string().min(1),
  eventId: z.string().min(1),
  eventName: z.string().optional(),
  programId: z.string().min(1),
  programName: z.string().optional(),
  participantType: z.enum(ParticipationTypes),
  participantData: z.record(z.any()),
  teamName: z.string().optional(),
  teamMembers: z.array(TeamMemberSchema).optional(),
  department: z.string().optional(),
  status: z.enum(RegistrationStatuses).default('CONFIRMED'),
  attendanceStatus: z.enum(AttendanceStatuses).default('PENDING'),
  registeredAt: z.string(),
  updatedAt: z.string(),
  notes: z.string().optional(),
});
export type Registration = z.infer<typeof RegistrationSchema>;

export const PublicRegistrationInputSchema = z.object({
  participantType: z.enum(ParticipationTypes),
  participantData: z.record(z.any()),
  teamName: z.string().optional(),
  teamMembers: z.array(TeamMemberSchema).optional(),
  department: z.string().optional(),
});
export type PublicRegistrationInput = z.infer<typeof PublicRegistrationInputSchema>;

export const UpdateAttendanceInputSchema = z.object({
  attendanceStatus: z.enum(AttendanceStatuses),
  notes: z.string().optional(),
});
export type UpdateAttendanceInput = z.infer<typeof UpdateAttendanceInputSchema>;

// ==========================================
// SCORE & EVALUATION MODEL
// ==========================================

export const ScoreSchema = z.object({
  id: z.string().min(1),
  registrationId: z.string().min(1),
  programId: z.string().min(1),
  juryId: z.string().min(1),
  juryName: z.string().optional(),
  criteriaScores: z.record(z.number()),
  totalScore: z.number().min(0),
  feedback: z.string().optional(),
  status: z.enum(ScoreStatuses).default('DRAFT'),
  submittedAt: z.string().optional(),
  updatedAt: z.string(),
});
export type Score = z.infer<typeof ScoreSchema>;

export const SubmitScoreInputSchema = z.object({
  criteriaScores: z.record(z.number()),
  feedback: z.string().optional(),
  isFinalSubmit: z.boolean().default(false),
});
export type SubmitScoreInput = z.infer<typeof SubmitScoreInputSchema>;

// ==========================================
// RESULTS & LEADERBOARD MODEL
// ==========================================

export const ResultSchema = z.object({
  id: z.string().min(1),
  programId: z.string().min(1),
  programName: z.string().optional(),
  programCategory: z.string().optional(),
  eventId: z.string().min(1),
  eventName: z.string().optional(),
  registrationId: z.string().min(1),
  registrationNumber: z.string().min(1),
  participantName: z.string().min(1),
  teamName: z.string().optional(),
  department: z.string().optional(),
  rank: z.number().int().positive(),
  position: z.enum(['1st', '2nd', '3rd', 'Finalist', 'Participant']),
  medal: z.enum(['Gold', 'Silver', 'Bronze']).optional(),
  totalScore: z.number(),
  averageScore: z.number(),
  pointsAwarded: z.number(),
  resultStatus: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
  calculatedAt: z.string(),
  publishedAt: z.string().optional(),
});
export type Result = z.infer<typeof ResultSchema>;

export interface DepartmentLeaderboardEntry {
  department: string;
  totalPoints: number;
  goldCount: number;
  silverCount: number;
  bronzeCount: number;
  totalParticipants: number;
}

export interface ProgramLeaderboardEntry {
  rank: number;
  registrationId: string;
  registrationNumber: string;
  participantName: string;
  teamName?: string;
  department?: string;
  averageScore: number;
  totalScore: number;
  juryEvaluationsCount: number;
  points: number;
  position: string;
  medal?: 'Gold' | 'Silver' | 'Bronze' | null;
}

export interface ParticipantLeaderboardEntry {
  rank: number;
  participantName: string;
  department: string;
  registerNumber?: string;
  totalPoints: number;
  goldCount: number;
  silverCount: number;
  bronzeCount: number;
  eventsWonCount: number;
  programsWon: Array<{
    programId: string;
    programName: string;
    position: string;
    points: number;
  }>;
}

export interface TeamLeaderboardEntry {
  rank: number;
  teamName: string;
  department: string;
  totalPoints: number;
  goldCount: number;
  silverCount: number;
  bronzeCount: number;
  eventsWonCount: number;
  programsWon: Array<{
    programId: string;
    programName: string;
    position: string;
    points: number;
  }>;
}

export interface EventLeaderboardData {
  eventId: string;
  eventName: string;
  pointsConfig: {
    firstPlace: number;
    secondPlace: number;
    thirdPlace: number;
  };
  departmentLeaderboard: DepartmentLeaderboardEntry[];
  participantLeaderboard: ParticipantLeaderboardEntry[];
  teamLeaderboard: TeamLeaderboardEntry[];
}

export interface WinnerEntry {
  rank: number;
  registrationId: string;
  registrationNumber: string;
  participantName: string;
  teamName?: string;
  department: string;
  totalScore: number;
  averageScore: number;
  position: '1st' | '2nd' | '3rd' | 'Finalist' | 'Participant';
  medal?: 'Gold' | 'Silver' | 'Bronze';
  pointsAwarded: number;
}

export interface ProgramDepartmentSummary {
  programId: string;
  programName: string;
  departmentSummary: Record<string, { totalPoints: number; gold: number; silver: number; bronze: number }>;
}

export interface WinnerReportItem {
  id: string;
  rank: number;
  position: '1st' | '2nd' | '3rd' | 'Finalist' | 'Participant';
  medal?: 'Gold' | 'Silver' | 'Bronze' | null;
  participantName: string;
  teamName?: string;
  registrationNumber: string;
  department: string;
  programId: string;
  programName: string;
  programCategory?: string;
  eventId: string;
  eventName?: string;
  score: number;
  pointsAwarded: number;
  calculatedAt: string;
  publishedAt?: string;
}

export interface ParticipantReportQuery {
  eventId?: string;
  programId?: string;
  category?: string;
  department?: string;
  year?: string;
  gender?: string;
  participantType?: 'INDIVIDUAL' | 'TEAM';
  status?: string;
  attendanceStatus?: string;
  result?: string;
  winnerStatus?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface ProgramRegistrationReportItem {
  programId: string;
  programName: string;
  programCode: string;
  category: string;
  eventId: string;
  eventName: string;
  venue: string;
  date?: string;
  capacity: number;
  totalRegistrations: number;
  confirmedCount: number;
  checkedInCount: number;
  attendanceRatePct: number;
  capacityUtilizationPct: number;
  status: string;
}

export interface EventRegistrationReportItem {
  eventId: string;
  eventName: string;
  eventCode: string;
  status: string;
  startDate: string;
  endDate: string;
  totalPrograms: number;
  totalCapacity: number;
  totalRegistrations: number;
  confirmedCount: number;
  checkedInCount: number;
  attendanceRatePct: number;
}

export interface JuryScoringReportItem {
  id: string;
  programId: string;
  programName: string;
  eventId: string;
  eventName: string;
  registrationId: string;
  registrationNumber: string;
  participantName: string;
  department: string;
  juryId: string;
  juryName?: string;
  juryEmail?: string;
  criteriaScores: Record<string, number>;
  totalScore: number;
  status: 'DRAFT' | 'SUBMITTED' | 'LOCKED';
  isLocked: boolean;
  comments?: string;
  submittedAt?: string;
  updatedAt?: string;
}

export interface OverallLeaderboardData {
  departmentLeaderboard: DepartmentLeaderboardEntry[];
  topParticipants: ParticipantLeaderboardEntry[];
  topTeams: TeamLeaderboardEntry[];
  totalPublishedPrograms: number;
  totalMedalsAwarded: number;
}

export interface DashboardAnalyticsData {
  kpis: {
    totalEvents: number;
    activeEvents: number;
    totalPrograms: number;
    openRegistrations: number;
    totalRegistrations: number;
    activeRegistrations: number;
    completedPrograms: number;
    pendingResults: number;
    resultsPublished: number;
    publishedWinners: number;
  };
  charts: {
    registrationsByDepartment: Record<string, number>;
    registrationsByCategory: Record<string, number>;
    registrationsByProgram: Array<{ programId: string; programName: string; count: number }>;
    registrationTrends: Array<{ date: string; count: number }>;
  };
}

// ==========================================
// AUDIT LOG MODEL
// ==========================================

export const AuditLogSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  userName: z.string().optional(),
  userRole: z.string().optional(),
  action: z.string().min(1),
  entity: z.string().min(1),
  entityId: z.string().min(1),
  timestamp: z.string(),
  metadata: z.record(z.any()).optional(),
});
export type AuditLog = z.infer<typeof AuditLogSchema>;

// ==========================================
// API STANDARD RESPONSE TYPES
// ==========================================

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  code?: string;
  details?: Record<string, any>;
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}
