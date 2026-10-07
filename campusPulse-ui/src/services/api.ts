import {
  Event,
  Program,
  Registration,
  Score,
  Result,
  Assignment,
  User,
  DepartmentLeaderboardEntry,
  WinnerReportItem,
  EventLeaderboardData,
  ParticipantLeaderboardEntry,
  TeamLeaderboardEntry,
  AuditLog,
  ProgramRegistrationReportItem,
  EventRegistrationReportItem,
  JuryScoringReportItem,
  OverallLeaderboardData,
  DashboardAnalyticsData,
  PublicRegistrationInput,
  CreateEventInput,
  CreateProgramInput,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

class ApiService {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const headers = this.getHeaders();

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error: any = new Error(data.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.code = data.code;
      error.details = data.details;
      throw error;
    }

    return data.data;
  }

  // ==========================================
  // PUBLIC ENDPOINTS
  // ==========================================

  async getPublicEvents(): Promise<Event[]> {
    return this.request<Event[]>('/public/events');
  }

  async getPublicEvent(codeOrSlug: string): Promise<{ event: Event; programs: Program[] }> {
    return this.request<{ event: Event; programs: Program[] }>(`/public/events/${codeOrSlug}`);
  }

  async getPublicProgramDetails(
    eventCodeOrSlug: string,
    programCodeOrSlug: string
  ): Promise<{ event: Event; program: Program }> {
    return this.request<{ event: Event; program: Program }>(
      `/public/events/${eventCodeOrSlug}/programs/${programCodeOrSlug}`
    );
  }

  async registerPublic(
    eventCode: string,
    programCode: string,
    payload: PublicRegistrationInput
  ): Promise<Registration> {
    return this.request<Registration>(
      `/public/events/${eventCode}/programs/${programCode}/register`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async getPublicConfirmation(regNumber: string): Promise<Registration> {
    return this.request<Registration>(`/public/registrations/${regNumber}`);
  }

  async getPublicProgramResults(programId: string): Promise<Result[]> {
    return this.request<Result[]>(`/public/programs/${programId}/results`);
  }

  // ==========================================
  // AUTH & USER ENDPOINTS
  // ==========================================

  async getCurrentProfile(): Promise<{ user: User; assignments: Assignment[] }> {
    return this.request<{ user: User; assignments: Assignment[] }>('/users/me');
  }

  async getUsers(params: { role?: string; status?: string } = {}): Promise<User[]> {
    const query = new URLSearchParams(params as any).toString();
    return this.request<User[]>(`/users${query ? `?${query}` : ''}`);
  }

  async createUser(payload: Partial<User>): Promise<User> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateUserStatus(uid: string, status: string): Promise<void> {
    return this.request<void>(`/users/${uid}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async getUserDetails(uid: string): Promise<{ user: User; assignments: Assignment[] }> {
    return this.request<{ user: User; assignments: Assignment[] }>(`/users/${uid}`);
  }

  async updateUserRole(uid: string, role: string): Promise<void> {
    return this.request<void>(`/users/${uid}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  // ==========================================
  // EVENT ENDPOINTS
  // ==========================================

  async getEvents(): Promise<Event[]> {
    return this.request<Event[]>('/events');
  }

  async getEvent(id: string): Promise<Event> {
    return this.request<Event>(`/events/${id}`);
  }

  async createEvent(payload: CreateEventInput): Promise<Event> {
    return this.request<Event>('/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateEvent(id: string, payload: Partial<CreateEventInput>): Promise<Event> {
    return this.request<Event>(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async archiveEvent(id: string): Promise<void> {
    return this.request<void>(`/events/${id}`, {
      method: 'DELETE',
    });
  }

  async updateEventStatus(id: string, status: string): Promise<void> {
    return this.request<void>(`/events/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // ==========================================
  // PROGRAM ENDPOINTS
  // ==========================================

  async getPrograms(params: { eventId?: string; status?: string } = {}): Promise<Program[]> {
    const query = new URLSearchParams(params as any).toString();
    return this.request<Program[]>(`/programs${query ? `?${query}` : ''}`);
  }

  async getProgram(id: string): Promise<Program> {
    return this.request<Program>(`/programs/${id}`);
  }

  async createProgram(payload: CreateProgramInput): Promise<Program> {
    return this.request<Program>('/programs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateProgram(id: string, payload: Partial<CreateProgramInput>): Promise<Program> {
    return this.request<Program>(`/programs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async updateProgramStatus(id: string, status: string): Promise<void> {
    return this.request<void>(`/programs/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async getProgramParticipants(
    programId: string,
    params: { attendanceStatus?: string; status?: string } = {}
  ): Promise<Registration[]> {
    const query = new URLSearchParams(params as any).toString();
    return this.request<Registration[]>(`/programs/${programId}/participants${query ? `?${query}` : ''}`);
  }

  async calculateProgramResults(programId: string): Promise<Result[]> {
    return this.request<Result[]>(`/programs/${programId}/calculate-results`, {
      method: 'POST',
    });
  }

  async publishProgramResults(programId: string): Promise<void> {
    return this.request<void>(`/programs/${programId}/publish-results`, {
      method: 'POST',
    });
  }

  async unpublishProgramResults(programId: string): Promise<void> {
    return this.request<void>(`/programs/${programId}/unpublish-results`, {
      method: 'POST',
    });
  }

  async getProgramResults(programId: string): Promise<Result[]> {
    return this.request<Result[]>(`/programs/${programId}/results`);
  }

  // ==========================================
  // ASSIGNMENTS
  // ==========================================

  async getAssignments(params: { programId?: string; userId?: string; role?: string } = {}): Promise<Assignment[]> {
    const query = new URLSearchParams(params as any).toString();
    return this.request<Assignment[]>(`/assignments${query ? `?${query}` : ''}`);
  }

  async createAssignment(payload: {
    userId: string;
    role: 'coordinator' | 'jury';
    eventId: string;
    programId: string;
  }): Promise<Assignment> {
    return this.request<Assignment>('/assignments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async deleteAssignment(id: string): Promise<void> {
    return this.request<void>(`/assignments/${id}`, {
      method: 'DELETE',
    });
  }

  // ==========================================
  // REGISTRATIONS & ATTENDANCE
  // ==========================================

  async getRegistration(id: string): Promise<Registration> {
    return this.request<Registration>(`/registrations/${id}`);
  }

  async markAttendance(id: string, attendanceStatus: 'PENDING' | 'PRESENT' | 'ABSENT'): Promise<void> {
    return this.request<void>(`/registrations/${id}/attendance`, {
      method: 'PATCH',
      body: JSON.stringify({ attendanceStatus }),
    });
  }

  async updateRegistrationStatus(id: string, status: string): Promise<void> {
    return this.request<void>(`/registrations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // ==========================================
  // JURY SCORING
  // ==========================================

  async getJuryEvaluations(programId: string): Promise<{
    program: Partial<Program>;
    evaluations: Array<{
      registration: Registration;
      evaluationStatus: string;
      score: Score | null;
    }>;
  }> {
    return this.request<any>(`/scores/programs/${programId}/evaluations`);
  }

  async saveOrSubmitScore(
    programId: string,
    registrationId: string,
    payload: {
      criteriaScores: Record<string, number>;
      feedback?: string;
      isFinalSubmit: boolean;
    }
  ): Promise<Score> {
    return this.request<Score>(
      `/scores/programs/${programId}/registrations/${registrationId}`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async unlockScore(scoreId: string, reason?: string): Promise<void> {
    return this.request<void>(`/scores/${scoreId}/unlock`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async getProgramScores(programId: string): Promise<Score[]> {
    return this.request<Score[]>(`/scores/programs/${programId}/all`);
  }

  // ==========================================
  // REPORTS, LEADERBOARDS & DASHBOARD STATS
  // ==========================================
  private appendAuthToken(url: string): string {
    const token = localStorage.getItem('auth_token');
    if (!token) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}token=${encodeURIComponent(token)}`;
  }

  async downloadExportFile(url: string, filename: string): Promise<void> {
    const token = localStorage.getItem('auth_token');
    const finalUrl = this.appendAuthToken(url);
    try {
      const response = await fetch(finalUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        throw new Error(`Download failed with HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      window.open(finalUrl, '_blank');
    }
  }


  async queryParticipants(filters: Record<string, any> = {}): Promise<any> {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') query.append(k, String(v));
    });
    return this.request<any>(`/reports/participants?${query.toString()}`);
  }

  getExportParticipantsUrl(filters: Record<string, any> = {}, format: 'csv' | 'excel' | 'print' = 'csv'): string {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') query.append(k, String(v));
    });
    const subPath = format === 'excel' ? 'participants/excel' : format === 'print' ? 'participants/print' : 'participants/csv';
    return this.appendAuthToken(`${API_BASE}/reports/export/${subPath}?${query.toString()}`);
  }

  // 2. Program Registration Report
  async getProgramRegistrationReport(filters: Record<string, any> = {}): Promise<ProgramRegistrationReportItem[]> {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') query.append(k, String(v));
    });
    return this.request<ProgramRegistrationReportItem[]>(`/reports/program-registrations?${query.toString()}`);
  }

  getExportProgramRegistrationUrl(format: 'csv' | 'excel' = 'csv', filters: Record<string, any> = {}): string {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') query.append(k, String(v));
    });
    return this.appendAuthToken(`${API_BASE}/reports/export/program-registrations/${format}?${query.toString()}`);
  }

  // 3. Event Registration Report
  async getEventRegistrationReport(): Promise<EventRegistrationReportItem[]> {
    return this.request<EventRegistrationReportItem[]>('/reports/event-registrations');
  }

  getExportEventRegistrationUrl(format: 'csv' | 'excel' = 'csv'): string {
    return this.appendAuthToken(`${API_BASE}/reports/export/event-registrations/${format}`);
  }

  // 4. Program Winners Report
  async getWinnerReport(filters: Record<string, any> = {}): Promise<WinnerReportItem[]> {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') query.append(k, String(v));
    });
    return this.request<WinnerReportItem[]>(`/reports/winners?${query.toString()}`);
  }

  getExportWinnersUrl(filters: Record<string, any> = {}, format: 'csv' | 'excel' = 'csv'): string {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') query.append(k, String(v));
    });
    return this.appendAuthToken(`${API_BASE}/reports/export/winners/${format}?${query.toString()}`);
  }

  // 5. Event Winners Report
  async getEventWinnersReport(eventId: string): Promise<{ eventId: string; totalPodiumWinners: number; winners: Result[]; departmentTally: Record<string, any> }> {
    return this.request<any>(`/reports/event-winners?eventId=${eventId}`);
  }

  getExportEventWinnersUrl(eventId: string, format: 'csv' | 'excel' = 'csv'): string {
    return this.appendAuthToken(`${API_BASE}/reports/export/event-winners/${format}?eventId=${eventId}`);
  }

  // 6. Department Leaderboard
  async getDepartmentLeaderboard(eventId?: string): Promise<DepartmentLeaderboardEntry[]> {
    const q = eventId ? `?eventId=${eventId}` : '';
    return this.request<DepartmentLeaderboardEntry[]>(`/reports/leaderboard/department${q}`);
  }

  getExportLeaderboardUrl(eventId?: string, format: 'csv' | 'excel' = 'csv'): string {
    const q = eventId ? `?eventId=${eventId}` : '';
    return this.appendAuthToken(`${API_BASE}/reports/export/leaderboard/${format}${q}`);
  }

  // 7. Overall Leaderboard
  async getOverallLeaderboard(): Promise<OverallLeaderboardData> {
    return this.request<OverallLeaderboardData>('/reports/leaderboard/overall');
  }

  getExportOverallLeaderboardUrl(format: 'csv' | 'excel' = 'csv'): string {
    return this.appendAuthToken(`${API_BASE}/reports/export/overall-leaderboard/${format}`);
  }

  // 8. Jury Scoring Audit Report
  async getJuryScoringReport(filters: Record<string, any> = {}): Promise<JuryScoringReportItem[]> {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') query.append(k, String(v));
    });
    return this.request<JuryScoringReportItem[]>(`/reports/jury-scoring?${query.toString()}`);
  }

  getExportJuryScoringUrl(filters: Record<string, any> = {}, format: 'csv' | 'excel' = 'csv'): string {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') query.append(k, String(v));
    });
    return this.appendAuthToken(`${API_BASE}/reports/export/jury-scoring/${format}?${query.toString()}`);
  }

  async getEventLeaderboards(
    eventId: string,
    params: { firstPlace?: number; secondPlace?: number; thirdPlace?: number } = {}
  ): Promise<EventLeaderboardData> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) query.append(k, String(v));
    });
    return this.request<EventLeaderboardData>(
      `/reports/leaderboard/event/${eventId}${query.toString() ? `?${query.toString()}` : ''}`
    );
  }

  async getPublicEventResults(codeOrSlug: string): Promise<any> {
    return this.request<any>(`/public/events/${codeOrSlug}/results`);
  }

  async getPublicEventLeaderboard(codeOrSlug: string): Promise<EventLeaderboardData> {
    return this.request<EventLeaderboardData>(`/public/events/${codeOrSlug}/leaderboard`);
  }

  async getDashboardStats(): Promise<DashboardAnalyticsData> {
    return this.request<DashboardAnalyticsData>('/reports/stats');
  }

  // ==========================================
  // AUDIT LOGS
  // ==========================================

  async getAuditLogs(params: { entity?: string; action?: string; limit?: number } = {}): Promise<AuditLog[]> {
    const query = new URLSearchParams(params as any).toString();
    return this.request<AuditLog[]>(`/audit-logs${query ? `?${query}` : ''}`);
  }
}

export const api = new ApiService();
