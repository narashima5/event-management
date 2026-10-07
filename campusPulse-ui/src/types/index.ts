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

export interface RegistrationField {
  id: string;
  name: string;
  key?: string;
  label: string;
  type: RegistrationFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  validation?: string;
  displayOrder?: number;
  defaultValue?: any;
  helperText?: string;
  accept?: string;
}

// ==========================================
// SCORING CONFIGURATION
// ==========================================

export interface ScoringCriterion {
  id: string;
  name: string;
  maxScore: number;
  weight?: number;
  description?: string;
}

export interface ProgramScoringConfig {
  criteria: ScoringCriterion[];
  totalMaxScore: number;
  calculationMethod?: 'SUM' | 'AVERAGE' | 'WEIGHTED';
  pointsConfig: {
    firstPlace: number;
    secondPlace: number;
    thirdPlace: number;
  };
  tieBreakerRule?: string;
  isJuryScoreVisibleToCoord?: boolean;
}

// ==========================================
// USER & ASSIGNMENT MODELS
// ==========================================

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  department?: string;
  status: 'active' | 'inactive' | 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  role: 'coordinator' | 'jury';
  eventId: string;
  programId: string;
  status: 'active' | 'inactive' | 'ACTIVE' | 'INACTIVE';
  assignedAt: string;
  assignedBy: string;
}

// ==========================================
// EVENT MODEL
// ==========================================

export interface Event {
  id: string;
  name: string;
  code: string;
  slug: string;
  description: string;
  venue: string;
  startDate: string;
  endDate: string;
  registrationStart: string;
  registrationEnd: string;
  status: EventStatus;
  logoUrl?: string;
  bannerUrl?: string;
  contactInfo?: string;
  rules?: string;
  termsNotes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventInput {
  name: string;
  code: string;
  slug: string;
  description: string;
  venue: string;
  startDate: string;
  endDate: string;
  registrationStart: string;
  registrationEnd: string;
  status?: EventStatus;
  logoUrl?: string;
  bannerUrl?: string;
  contactInfo?: string;
  rules?: string;
  termsNotes?: string;
}

export type UpdateEventInput = Partial<CreateEventInput>;

// ==========================================
// PROGRAM MODEL
// ==========================================

export interface Program {
  id: string;
  eventId: string;
  name: string;
  code: string;
  slug: string;
  description: string;
  category: string;
  participationType: ParticipationType;
  venue: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  registeredCount: number;
  status: ProgramStatus;
  registrationStart: string;
  registrationEnd: string;
  rules?: string;
  instructions?: string;
  scoringConfig: ProgramScoringConfig;
  registrationFields: RegistrationField[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProgramInput {
  eventId: string;
  name: string;
  code: string;
  slug: string;
  description: string;
  category: string;
  participationType: ParticipationType;
  venue: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  status?: ProgramStatus;
  registrationStart: string;
  registrationEnd: string;
  rules?: string;
  instructions?: string;
  scoringConfig: ProgramScoringConfig;
  registrationFields: RegistrationField[];
}

export type UpdateProgramInput = Partial<CreateProgramInput>;

// ==========================================
// REGISTRATION MODEL
// ==========================================

export interface TeamMember {
  name: string;
  registerNumber: string;
  email?: string;
  phone?: string;
}

export interface Registration {
  id: string;
  registrationNumber: string;
  eventId: string;
  eventName?: string;
  programId: string;
  programName?: string;
  participantType: ParticipationType;
  participantData: Record<string, any>;
  teamName?: string;
  teamMembers?: TeamMember[];
  department?: string;
  status: RegistrationStatus;
  attendanceStatus: AttendanceStatus;
  registeredAt: string;
  updatedAt: string;
  notes?: string;
}

export interface PublicRegistrationInput {
  participantType: ParticipationType;
  participantData: Record<string, any>;
  teamName?: string;
  teamMembers?: TeamMember[];
  department?: string;
}

export interface UpdateAttendanceInput {
  attendanceStatus: AttendanceStatus;
  notes?: string;
}

// ==========================================
// SCORE & EVALUATION MODEL
// ==========================================

export interface Score {
  id: string;
  registrationId: string;
  programId: string;
  juryId: string;
  juryName?: string;
  criteriaScores: Record<string, number>;
  totalScore: number;
  feedback?: string;
  status: ScoreStatus;
  submittedAt?: string;
  updatedAt: string;
}

export interface SubmitScoreInput {
  criteriaScores: Record<string, number>;
  feedback?: string;
  isFinalSubmit?: boolean;
}

// ==========================================
// RESULTS & LEADERBOARD MODEL
// ==========================================

export interface Result {
  id: string;
  programId: string;
  programName?: string;
  programCategory?: string;
  eventId: string;
  eventName?: string;
  registrationId: string;
  registrationNumber: string;
  participantName: string;
  teamName?: string;
  department?: string;
  rank: number;
  position: '1st' | '2nd' | '3rd' | 'Finalist' | 'Participant';
  medal?: 'Gold' | 'Silver' | 'Bronze';
  totalScore: number;
  averageScore: number;
  pointsAwarded: number;
  resultStatus: 'DRAFT' | 'PUBLISHED';
  calculatedAt: string;
  publishedAt?: string;
}

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

export interface AuditLog {
  id: string;
  userId: string;
  userName?: string;
  userRole?: string;
  action: string;
  entity: string;
  entityId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

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
