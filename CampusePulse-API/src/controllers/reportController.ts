import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database/firestore';
import {
  Registration,
  Result,
  DepartmentLeaderboardEntry,
  WinnerReportItem,
  Program,
  Event,
  Score,
  ProgramRegistrationReportItem,
  EventRegistrationReportItem,
  JuryScoringReportItem,
  OverallLeaderboardData,
  DashboardAnalyticsData,
} from '../types';
import { ResultService } from '../services/resultService';
import { ExportService } from '../services/exportService';

export class ReportController {
  /**
   * Internal helper to query and filter registrations across all dimensions
   * Supports: Event, Program, Category, Department, Year, Gender, Participant type,
   * Registration status, Registration date range, Attendance, Result, Winner status, Search
   */
  private static async getFilteredRegistrations(queryParams: any): Promise<Registration[]> {
    const db = getDb();
    const {
      eventId,
      programId,
      department,
      status,
      attendanceStatus,
      participantType,
      category,
      year,
      gender,
      result,
      winnerStatus,
      search,
      startDate,
      endDate,
    } = queryParams;

    let query = db.collection('registrations');
    if (eventId) query = query.where('eventId', '==', String(eventId));
    if (programId) query = query.where('programId', '==', String(programId));
    if (status) query = query.where('status', '==', String(status));
    if (attendanceStatus) query = query.where('attendanceStatus', '==', String(attendanceStatus));
    if (participantType) query = query.where('participantType', '==', String(participantType));

    const snapshot = await query.get();
    let registrations: Registration[] = snapshot.docs.map((d: any) => ({
      id: d.id,
      ...d.data(),
    }));

    // If filtering by program category, load programs map
    if (category) {
      const progsSnap = await db.collection('programs').get();
      const catMap = new Map<string, string>();
      progsSnap.docs.forEach((d: any) => {
        catMap.set(d.id, d.data().category || '');
      });

      const catLower = String(category).toLowerCase();
      registrations = registrations.filter((r) => {
        const progCat = catMap.get(r.programId) || '';
        return progCat.toLowerCase() === catLower;
      });
    }

    // Filter by department (case-insensitive)
    if (department) {
      const deptLower = String(department).toLowerCase();
      registrations = registrations.filter(
        (r) =>
          r.department?.toLowerCase() === deptLower ||
          r.participantData?.department?.toLowerCase() === deptLower
      );
    }

    // Filter by academic year (e.g., '1', '2', '3', '4', '1st Year')
    if (year) {
      const yStr = String(year).toLowerCase();
      registrations = registrations.filter((r) => {
        const pYear = String(
          r.participantData?.year || r.participantData?.academicYear || ''
        ).toLowerCase();
        return pYear.includes(yStr);
      });
    }

    // Filter by gender
    if (gender) {
      const gStr = String(gender).toLowerCase();
      registrations = registrations.filter((r) => {
        const pGender = String(r.participantData?.gender || '').toLowerCase();
        return pGender === gStr;
      });
    }

    // Filter by Result / Evaluation status
    if (result && result !== 'ALL') {
      const [scoresSnap, resultsSnap] = await Promise.all([
        db.collection('scores').where('status', 'in', ['SUBMITTED', 'LOCKED']).get(),
        db.collection('results').get(),
      ]);

      const evaluatedRegIds = new Set<string>();
      scoresSnap.docs.forEach((d: any) => evaluatedRegIds.add(d.data().registrationId));
      resultsSnap.docs.forEach((d: any) => evaluatedRegIds.add(d.data().registrationId));

      if (result === 'EVALUATED') {
        registrations = registrations.filter((r) => evaluatedRegIds.has(r.id));
      } else if (result === 'PENDING') {
        registrations = registrations.filter((r) => !evaluatedRegIds.has(r.id));
      }
    }

    // Filter by Winner Status
    if (winnerStatus && winnerStatus !== 'ALL') {
      const resultsSnap = await db
        .collection('results')
        .where('resultStatus', '==', 'PUBLISHED')
        .get();

      const winnerRegMap = new Map<string, Result>();
      resultsSnap.docs.forEach((d: any) => {
        const res = d.data() as Result;
        winnerRegMap.set(res.registrationId, res);
      });

      if (winnerStatus === 'WINNER' || winnerStatus === 'WINNERS_ONLY') {
        registrations = registrations.filter((r) => {
          const res = winnerRegMap.get(r.id);
          return res && (res.rank <= 3 || ['1st', '2nd', '3rd'].includes(res.position));
        });
      } else if (['1st', '2nd', '3rd'].includes(winnerStatus)) {
        registrations = registrations.filter((r) => {
          const res = winnerRegMap.get(r.id);
          return res && res.position === winnerStatus;
        });
      } else if (winnerStatus === 'NON_WINNER') {
        registrations = registrations.filter((r) => {
          const res = winnerRegMap.get(r.id);
          return !res || res.rank > 3;
        });
      }
    }

    // Date range filter
    if (startDate) {
      const startMs = new Date(String(startDate)).getTime();
      registrations = registrations.filter(
        (r) => new Date(r.registeredAt).getTime() >= startMs
      );
    }
    if (endDate) {
      const endMs = new Date(String(endDate)).getTime();
      registrations = registrations.filter(
        (r) => new Date(r.registeredAt).getTime() <= endMs
      );
    }

    // Free text search across name, regNo, studentId, email, phone
    if (search) {
      const s = String(search).toLowerCase();
      registrations = registrations.filter((r) => {
        const name =
          r.participantType === 'TEAM'
            ? r.teamName || r.participantData?.teamName || ''
            : r.participantData?.name || r.participantData?.fullName || '';
        const regNo = r.registrationNumber || '';
        const studentId = r.participantData?.registerNumber || r.participantData?.studentId || '';
        const email = r.participantData?.email || '';
        const phone = r.participantData?.phone || '';

        return (
          name.toLowerCase().includes(s) ||
          regNo.toLowerCase().includes(s) ||
          studentId.toLowerCase().includes(s) ||
          email.toLowerCase().includes(s) ||
          phone.toLowerCase().includes(s)
        );
      });
    }

    return registrations;
  }

  // =========================================================================
  // 1. PARTICIPANT REPORT
  // =========================================================================

  /**
   * Filtered participant query across multiple dimensions with optional pagination
   */
  static async queryParticipants(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const registrations = await ReportController.getFilteredRegistrations(req.query);

      const page = req.query.page ? parseInt(String(req.query.page), 10) : undefined;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;

      if ((page !== undefined && page > 0) || (limit !== undefined && limit > 0)) {
        const p = page && page > 0 ? page : 1;
        const l = limit && limit > 0 ? limit : 20;
        const startIndex = (p - 1) * l;
        const paginatedList = registrations.slice(startIndex, startIndex + l);
        res.json({
          success: true,
          data: paginatedList,
          count: registrations.length,
          pagination: {
            page: p,
            limit: l,
            total: registrations.length,
            totalPages: Math.ceil(registrations.length / l),
          },
        });
        return;
      }

      res.json({
        success: true,
        data: registrations,
        count: registrations.length,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Helper to format participants into tabular rows
   */
  private static formatParticipantRows(list: Registration[]): {
    headers: string[];
    rows: (string | number)[][];
  } {
    const headers = [
      'Registration Number',
      'Event',
      'Program',
      'Participant/Team Name',
      'Type',
      'Department',
      'Student ID',
      'Year',
      'Gender',
      'Email',
      'Phone',
      'Attendance',
      'Status',
      'Registered Date',
    ];

    const rows = list.map((r: Registration) => [
      r.registrationNumber,
      r.eventName || '',
      r.programName || '',
      r.participantType === 'TEAM'
        ? r.teamName || 'Team'
        : r.participantData?.name || r.participantData?.fullName || '',
      r.participantType,
      r.department || r.participantData?.department || '',
      r.participantData?.registerNumber || r.participantData?.studentId || '',
      r.participantData?.year || r.participantData?.academicYear || '',
      r.participantData?.gender || '',
      r.participantData?.email || '',
      r.participantData?.phone || '',
      r.attendanceStatus,
      r.status,
      r.registeredAt,
    ]);

    return { headers, rows };
  }

  /**
   * Export filtered participants to CSV format (generated on backend)
   */
  static async exportParticipantsCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const list = await ReportController.getFilteredRegistrations(req.query);
      const { headers, rows } = ReportController.formatParticipantRows(list);
      const csv = ExportService.generateCsv(headers, rows);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="participants_report_${Date.now()}.csv"`
      );
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Export filtered participants to Excel format (.xls XML Spreadsheet)
   */
  static async exportParticipantsExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const list = await ReportController.getFilteredRegistrations(req.query);
      const { headers, rows } = ReportController.formatParticipantRows(list);
      const excel = ExportService.generateExcelXml('Participants', headers, rows);

      res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="participants_report_${Date.now()}.xls"`
      );
      res.send(excel);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Export filtered participants to Printable HTML view (for direct PDF printing)
   */
  static async exportParticipantsPrint(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const list = await ReportController.getFilteredRegistrations(req.query);
      const { headers, rows } = ReportController.formatParticipantRows(list);
      const html = ExportService.generatePrintableHtml(
        'Participant Registration Roster',
        `Total Filtered Records: ${list.length}`,
        headers,
        rows
      );

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 2. PROGRAM REGISTRATION REPORT
  // =========================================================================

  /**
   * Aggregates registration metrics per program
   */
  static async getProgramRegistrationReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const { eventId, category, status } = req.query;

      let progsQuery = db.collection('programs');
      if (eventId) progsQuery = progsQuery.where('eventId', '==', String(eventId));
      if (category) progsQuery = progsQuery.where('category', '==', String(category));

      const [progsSnap, eventsSnap, regsSnap] = await Promise.all([
        progsQuery.get(),
        db.collection('events').get(),
        db.collection('registrations').get(),
      ]);

      const eventsMap = new Map<string, string>();
      eventsSnap.docs.forEach((d: any) => eventsMap.set(d.id, d.data().name || d.id));

      const registrations = regsSnap.docs.map((d: any) => d.data() as Registration);

      // Group registrations by programId
      const regByProg = new Map<string, Registration[]>();
      registrations.forEach((r: Registration) => {
        if (!regByProg.has(r.programId)) regByProg.set(r.programId, []);
        regByProg.get(r.programId)!.push(r);
      });

      const items: ProgramRegistrationReportItem[] = progsSnap.docs.map((d: any) => {
        const prog = d.data() as Program;
        const progRegs = regByProg.get(prog.id) || [];
        const confirmedCount = progRegs.filter((r: Registration) => r.status === 'CONFIRMED').length;
        const checkedInCount = progRegs.filter((r: Registration) => r.attendanceStatus === 'PRESENT').length;
        const capacity = prog.capacity || 0;
        const totalRegistrations = progRegs.length;

        const attendanceRatePct = confirmedCount > 0 ? Number(((checkedInCount / confirmedCount) * 100).toFixed(1)) : 0;
        const capacityUtilizationPct = capacity > 0 ? Number(((confirmedCount / capacity) * 100).toFixed(1)) : 0;

        return {
          programId: prog.id,
          programName: prog.name,
          programCode: prog.code,
          category: prog.category,
          eventId: prog.eventId,
          eventName: eventsMap.get(prog.eventId) || prog.eventId,
          venue: prog.venue || 'TBA',
          date: prog.date,
          capacity,
          totalRegistrations,
          confirmedCount,
          checkedInCount,
          attendanceRatePct,
          capacityUtilizationPct,
          status: prog.status,
        };
      });

      // Filter by status if requested
      const filtered = status ? items.filter((p: ProgramRegistrationReportItem) => p.status === String(status)) : items;

      res.json({
        success: true,
        data: filtered,
        count: filtered.length,
      });
    } catch (err) {
      next(err);
    }
  }

  private static formatProgramRegistrationRows(items: ProgramRegistrationReportItem[]) {
    const headers = [
      'Program Code',
      'Program Name',
      'Category',
      'Event',
      'Venue',
      'Capacity',
      'Total Registered',
      'Confirmed',
      'Checked-In (Present)',
      'Attendance Rate %',
      'Capacity Utilization %',
      'Status',
    ];
    const rows = items.map((p) => [
      p.programCode,
      p.programName,
      p.category,
      p.eventName,
      p.venue,
      p.capacity,
      p.totalRegistrations,
      p.confirmedCount,
      p.checkedInCount,
      `${p.attendanceRatePct}%`,
      `${p.capacityUtilizationPct}%`,
      p.status,
    ]);
    return { headers, rows };
  }

  static async exportProgramRegistrationCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const [progsSnap, eventsSnap, regsSnap] = await Promise.all([
        db.collection('programs').get(),
        db.collection('events').get(),
        db.collection('registrations').get(),
      ]);
      const eventsMap = new Map<string, string>();
      eventsSnap.docs.forEach((d: any) => eventsMap.set(d.id, d.data().name || d.id));
      const regByProg = new Map<string, Registration[]>();
      regsSnap.docs.forEach((d: any) => {
        const r = d.data() as Registration;
        if (!regByProg.has(r.programId)) regByProg.set(r.programId, []);
        regByProg.get(r.programId)!.push(r);
      });
      const items: ProgramRegistrationReportItem[] = progsSnap.docs.map((d: any) => {
        const prog = d.data() as Program;
        const progRegs = regByProg.get(prog.id) || [];
        const confirmedCount = progRegs.filter((r: Registration) => r.status === 'CONFIRMED').length;
        const checkedInCount = progRegs.filter((r: Registration) => r.attendanceStatus === 'PRESENT').length;
        const capacity = prog.capacity || 0;
        return {
          programId: prog.id,
          programName: prog.name,
          programCode: prog.code,
          category: prog.category,
          eventId: prog.eventId,
          eventName: eventsMap.get(prog.eventId) || prog.eventId,
          venue: prog.venue || 'TBA',
          date: prog.date,
          capacity,
          totalRegistrations: progRegs.length,
          confirmedCount,
          checkedInCount,
          attendanceRatePct: confirmedCount > 0 ? Number(((checkedInCount / confirmedCount) * 100).toFixed(1)) : 0,
          capacityUtilizationPct: capacity > 0 ? Number(((confirmedCount / capacity) * 100).toFixed(1)) : 0,
          status: prog.status,
        };
      });

      const { headers, rows } = ReportController.formatProgramRegistrationRows(items);
      const csv = ExportService.generateCsv(headers, rows);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="program_registrations_${Date.now()}.csv"`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }

  static async exportProgramRegistrationExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const [progsSnap, eventsSnap, regsSnap] = await Promise.all([
        db.collection('programs').get(),
        db.collection('events').get(),
        db.collection('registrations').get(),
      ]);
      const eventsMap = new Map<string, string>();
      eventsSnap.docs.forEach((d: any) => eventsMap.set(d.id, d.data().name || d.id));
      const regByProg = new Map<string, Registration[]>();
      regsSnap.docs.forEach((d: any) => {
        const r = d.data() as Registration;
        if (!regByProg.has(r.programId)) regByProg.set(r.programId, []);
        regByProg.get(r.programId)!.push(r);
      });
      const items: ProgramRegistrationReportItem[] = progsSnap.docs.map((d: any) => {
        const prog = d.data() as Program;
        const progRegs = regByProg.get(prog.id) || [];
        const confirmedCount = progRegs.filter((r: Registration) => r.status === 'CONFIRMED').length;
        const checkedInCount = progRegs.filter((r: Registration) => r.attendanceStatus === 'PRESENT').length;
        const capacity = prog.capacity || 0;
        return {
          programId: prog.id,
          programName: prog.name,
          programCode: prog.code,
          category: prog.category,
          eventId: prog.eventId,
          eventName: eventsMap.get(prog.eventId) || prog.eventId,
          venue: prog.venue || 'TBA',
          date: prog.date,
          capacity,
          totalRegistrations: progRegs.length,
          confirmedCount,
          checkedInCount,
          attendanceRatePct: confirmedCount > 0 ? Number(((checkedInCount / confirmedCount) * 100).toFixed(1)) : 0,
          capacityUtilizationPct: capacity > 0 ? Number(((confirmedCount / capacity) * 100).toFixed(1)) : 0,
          status: prog.status,
        };
      });

      const { headers, rows } = ReportController.formatProgramRegistrationRows(items);
      const excel = ExportService.generateExcelXml('Program Registrations', headers, rows);
      res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="program_registrations_${Date.now()}.xls"`);
      res.send(excel);
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 3. EVENT REGISTRATION REPORT
  // =========================================================================

  /**
   * Aggregates registration metrics per event
   */
  static async getEventRegistrationReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const [eventsSnap, progsSnap, regsSnap] = await Promise.all([
        db.collection('events').get(),
        db.collection('programs').get(),
        db.collection('registrations').get(),
      ]);

      const programs = progsSnap.docs.map((d: any) => d.data() as Program);
      const registrations = regsSnap.docs.map((d: any) => d.data() as Registration);

      const items: EventRegistrationReportItem[] = eventsSnap.docs.map((d: any) => {
        const evt = d.data() as Event;
        const evtPrograms = programs.filter((p: Program) => p.eventId === evt.id);
        const evtRegistrations = registrations.filter((r: Registration) => r.eventId === evt.id);

        const totalCapacity = evtPrograms.reduce((acc: number, p: Program) => acc + (p.capacity || 0), 0);
        const confirmedCount = evtRegistrations.filter((r: Registration) => r.status === 'CONFIRMED').length;
        const checkedInCount = evtRegistrations.filter((r: Registration) => r.attendanceStatus === 'PRESENT').length;
        const attendanceRatePct = confirmedCount > 0 ? Number(((checkedInCount / confirmedCount) * 100).toFixed(1)) : 0;

        return {
          eventId: evt.id,
          eventName: evt.name,
          eventCode: evt.code,
          status: evt.status,
          startDate: evt.startDate,
          endDate: evt.endDate,
          totalPrograms: evtPrograms.length,
          totalCapacity,
          totalRegistrations: evtRegistrations.length,
          confirmedCount,
          checkedInCount,
          attendanceRatePct,
        };
      });

      res.json({
        success: true,
        data: items,
        count: items.length,
      });
    } catch (err) {
      next(err);
    }
  }

  private static formatEventRegistrationRows(items: EventRegistrationReportItem[]) {
    const headers = [
      'Event Code',
      'Event Name',
      'Status',
      'Start Date',
      'End Date',
      'Total Programs',
      'Total Capacity',
      'Total Registrations',
      'Confirmed Registrations',
      'Checked-In Participants',
      'Turnout Rate %',
    ];
    const rows = items.map((e) => [
      e.eventCode,
      e.eventName,
      e.status,
      e.startDate,
      e.endDate,
      e.totalPrograms,
      e.totalCapacity,
      e.totalRegistrations,
      e.confirmedCount,
      e.checkedInCount,
      `${e.attendanceRatePct}%`,
    ]);
    return { headers, rows };
  }

  static async exportEventRegistrationCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const [eventsSnap, progsSnap, regsSnap] = await Promise.all([
        db.collection('events').get(),
        db.collection('programs').get(),
        db.collection('registrations').get(),
      ]);
      const programs = progsSnap.docs.map((d: any) => d.data() as Program);
      const registrations = regsSnap.docs.map((d: any) => d.data() as Registration);

      const items: EventRegistrationReportItem[] = eventsSnap.docs.map((d: any) => {
        const evt = d.data() as Event;
        const evtPrograms = programs.filter((p: Program) => p.eventId === evt.id);
        const evtRegistrations = registrations.filter((r: Registration) => r.eventId === evt.id);
        const totalCapacity = evtPrograms.reduce((acc: number, p: Program) => acc + (p.capacity || 0), 0);
        const confirmedCount = evtRegistrations.filter((r: Registration) => r.status === 'CONFIRMED').length;
        const checkedInCount = evtRegistrations.filter((r: Registration) => r.attendanceStatus === 'PRESENT').length;
        return {
          eventId: evt.id,
          eventName: evt.name,
          eventCode: evt.code,
          status: evt.status,
          startDate: evt.startDate,
          endDate: evt.endDate,
          totalPrograms: evtPrograms.length,
          totalCapacity,
          totalRegistrations: evtRegistrations.length,
          confirmedCount,
          checkedInCount,
          attendanceRatePct: confirmedCount > 0 ? Number(((checkedInCount / confirmedCount) * 100).toFixed(1)) : 0,
        };
      });

      const { headers, rows } = ReportController.formatEventRegistrationRows(items);
      const csv = ExportService.generateCsv(headers, rows);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="event_registrations_${Date.now()}.csv"`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }

  static async exportEventRegistrationExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const [eventsSnap, progsSnap, regsSnap] = await Promise.all([
        db.collection('events').get(),
        db.collection('programs').get(),
        db.collection('registrations').get(),
      ]);
      const programs = progsSnap.docs.map((d: any) => d.data() as Program);
      const registrations = regsSnap.docs.map((d: any) => d.data() as Registration);

      const items: EventRegistrationReportItem[] = eventsSnap.docs.map((d: any) => {
        const evt = d.data() as Event;
        const evtPrograms = programs.filter((p: Program) => p.eventId === evt.id);
        const evtRegistrations = registrations.filter((r: Registration) => r.eventId === evt.id);
        const totalCapacity = evtPrograms.reduce((acc: number, p: Program) => acc + (p.capacity || 0), 0);
        const confirmedCount = evtRegistrations.filter((r: Registration) => r.status === 'CONFIRMED').length;
        const checkedInCount = evtRegistrations.filter((r: Registration) => r.attendanceStatus === 'PRESENT').length;
        return {
          eventId: evt.id,
          eventName: evt.name,
          eventCode: evt.code,
          status: evt.status,
          startDate: evt.startDate,
          endDate: evt.endDate,
          totalPrograms: evtPrograms.length,
          totalCapacity,
          totalRegistrations: evtRegistrations.length,
          confirmedCount,
          checkedInCount,
          attendanceRatePct: confirmedCount > 0 ? Number(((checkedInCount / confirmedCount) * 100).toFixed(1)) : 0,
        };
      });

      const { headers, rows } = ReportController.formatEventRegistrationRows(items);
      const excel = ExportService.generateExcelXml('Event Registrations', headers, rows);
      res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="event_registrations_${Date.now()}.xls"`);
      res.send(excel);
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 4. PROGRAM WINNERS REPORT
  // =========================================================================

  /**
   * Winner report query across program, event, category, department
   */
  static async getWinnerReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const { eventId, programId, category, department, rank, position } = req.query;

      let query = db.collection('results').where('resultStatus', '==', 'PUBLISHED');
      if (eventId) query = query.where('eventId', '==', String(eventId));
      if (programId) query = query.where('programId', '==', String(programId));

      const snapshot = await query.get();
      let results: Result[] = snapshot.docs.map((d: any) => ({
        id: d.id,
        ...d.data(),
      }));

      const progsSnap = await db.collection('programs').get();
      const progMap = new Map<string, Program>();
      progsSnap.docs.forEach((d: any) => {
        progMap.set(d.id, d.data() as Program);
      });

      if (category) {
        const catLower = String(category).toLowerCase();
        results = results.filter((res) => {
          const prog = progMap.get(res.programId);
          const c = res.programCategory || prog?.category || '';
          return c.toLowerCase() === catLower;
        });
      }

      if (department) {
        const deptLower = String(department).toLowerCase();
        results = results.filter(
          (res) => (res.department || '').toLowerCase() === deptLower
        );
      }

      if (rank) {
        results = results.filter((res) => res.rank === Number(rank));
      }
      if (position) {
        results = results.filter((res) => res.position === String(position));
      }

      results.sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        return b.averageScore - a.averageScore;
      });

      const winners: WinnerReportItem[] = results.map((res) => {
        const prog = progMap.get(res.programId);
        return {
          id: res.id,
          rank: res.rank,
          position: res.position,
          medal: res.medal || (res.rank === 1 ? 'Gold' : res.rank === 2 ? 'Silver' : res.rank === 3 ? 'Bronze' : null),
          participantName: res.participantName,
          teamName: res.teamName,
          registrationNumber: res.registrationNumber,
          department: res.department || 'General',
          programId: res.programId,
          programName: res.programName || prog?.name || 'Program',
          programCategory: res.programCategory || prog?.category || 'General',
          eventId: res.eventId,
          eventName: res.eventName || 'Festival Event',
          score: res.averageScore,
          pointsAwarded: res.pointsAwarded,
          calculatedAt: res.calculatedAt,
          publishedAt: res.publishedAt,
        };
      });

      res.json({
        success: true,
        data: winners,
        count: winners.length,
      });
    } catch (err) {
      next(err);
    }
  }

  private static formatWinnerRows(results: Result[], progMap: Map<string, Program>) {
    const headers = [
      'Rank',
      'Medal',
      'Position',
      'Participant/Team Name',
      'Registration Number',
      'Department',
      'Program',
      'Category',
      'Event',
      'Score',
      'Points Awarded',
      'Calculated Date',
    ];

    const rows = results.map((res) => {
      const prog = progMap.get(res.programId);
      const medal = res.medal || (res.rank === 1 ? 'Gold' : res.rank === 2 ? 'Silver' : res.rank === 3 ? 'Bronze' : '');
      return [
        res.rank,
        medal,
        res.position,
        res.participantName,
        res.registrationNumber,
        res.department || 'General',
        res.programName || prog?.name || '',
        res.programCategory || prog?.category || '',
        res.eventName || '',
        res.averageScore,
        res.pointsAwarded,
        res.calculatedAt,
      ];
    });

    return { headers, rows };
  }

  static async exportWinnersCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const { eventId, programId, category, department, rank, position } = req.query;

      let query = db.collection('results').where('resultStatus', '==', 'PUBLISHED');
      if (eventId) query = query.where('eventId', '==', String(eventId));
      if (programId) query = query.where('programId', '==', String(programId));

      const snapshot = await query.get();
      let results: Result[] = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));

      const progsSnap = await db.collection('programs').get();
      const progMap = new Map<string, Program>();
      progsSnap.docs.forEach((d: any) => progMap.set(d.id, d.data() as Program));

      if (category) {
        const catLower = String(category).toLowerCase();
        results = results.filter((res) => {
          const prog = progMap.get(res.programId);
          const c = res.programCategory || prog?.category || '';
          return c.toLowerCase() === catLower;
        });
      }

      if (department) {
        const deptLower = String(department).toLowerCase();
        results = results.filter((res) => (res.department || '').toLowerCase() === deptLower);
      }

      if (rank) results = results.filter((res) => res.rank === Number(rank));
      if (position) results = results.filter((res) => res.position === String(position));

      results.sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        return b.averageScore - a.averageScore;
      });

      const { headers, rows } = ReportController.formatWinnerRows(results, progMap);
      const csv = ExportService.generateCsv(headers, rows);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="winners_report_${Date.now()}.csv"`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }

  static async exportWinnersExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const { eventId, programId, category, department, rank, position } = req.query;
      let query = db.collection('results').where('resultStatus', '==', 'PUBLISHED');
      if (eventId) query = query.where('eventId', '==', String(eventId));
      if (programId) query = query.where('programId', '==', String(programId));

      const snapshot = await query.get();
      let results: Result[] = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      const progsSnap = await db.collection('programs').get();
      const progMap = new Map<string, Program>();
      progsSnap.docs.forEach((d: any) => progMap.set(d.id, d.data() as Program));

      if (category) {
        const catLower = String(category).toLowerCase();
        results = results.filter((res) => (res.programCategory || progMap.get(res.programId)?.category || '').toLowerCase() === catLower);
      }
      if (department) {
        results = results.filter((res) => (res.department || '').toLowerCase() === String(department).toLowerCase());
      }
      if (rank) results = results.filter((res) => res.rank === Number(rank));
      if (position) results = results.filter((res) => res.position === String(position));

      results.sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : b.averageScore - a.averageScore));

      const { headers, rows } = ReportController.formatWinnerRows(results, progMap);
      const excel = ExportService.generateExcelXml('Program Winners', headers, rows);
      res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="winners_report_${Date.now()}.xls"`);
      res.send(excel);
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 5. EVENT WINNERS REPORT
  // =========================================================================

  /**
   * Aggregated report of all winners across an entire event, grouped by program
   */
  static async getEventWinnersReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const eventId = String(req.query.eventId || '');
      let query = db
        .collection('results')
        .where('resultStatus', '==', 'PUBLISHED')
        .where('rank', '<=', 3);

      if (eventId) {
        query = query.where('eventId', '==', eventId);
      }

      const resultsSnap = await query.get();

      const winners = resultsSnap.docs
        .map((d: any) => d.data() as Result)
        .sort((a: Result, b: Result) => {
          if (a.eventId !== b.eventId) return a.eventId.localeCompare(b.eventId);
          if (a.programId !== b.programId) return a.programId.localeCompare(b.programId);
          return a.rank - b.rank;
        });

      // Compute medal tally per department for this event
      const departmentTally: Record<string, { gold: number; silver: number; bronze: number; totalMedals: number; totalPoints: number }> = {};
      for (const w of winners) {
        const d = w.department || 'General';
        if (!departmentTally[d]) {
          departmentTally[d] = { gold: 0, silver: 0, bronze: 0, totalMedals: 0, totalPoints: 0 };
        }
        if (w.rank === 1) departmentTally[d].gold += 1;
        if (w.rank === 2) departmentTally[d].silver += 1;
        if (w.rank === 3) departmentTally[d].bronze += 1;
        departmentTally[d].totalMedals += 1;
        departmentTally[d].totalPoints += w.pointsAwarded || 0;
      }

      res.json({
        success: true,
        data: {
          eventId,
          totalPodiumWinners: winners.length,
          winners,
          departmentTally,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async exportEventWinnersCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const eventId = String(req.query.eventId || '');
      let query = db.collection('results').where('resultStatus', '==', 'PUBLISHED').where('rank', '<=', 3);
      if (eventId) query = query.where('eventId', '==', eventId);

      const snap = await query.get();
      const winners = snap.docs.map((d: any) => d.data() as Result);

      const headers = ['Event', 'Program', 'Rank', 'Medal', 'Position', 'Participant/Team', 'Department', 'Score', 'Points Awarded'];
      const rows = winners.map((w: Result) => [
        w.eventName || w.eventId,
        w.programName || w.programId,
        w.rank,
        w.medal || (w.rank === 1 ? 'Gold' : w.rank === 2 ? 'Silver' : 'Bronze'),
        w.position,
        w.participantName,
        w.department || 'General',
        w.averageScore,
        w.pointsAwarded,
      ]);

      const csv = ExportService.generateCsv(headers, rows);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="event_winners_${Date.now()}.csv"`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }

  static async exportEventWinnersExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const eventId = String(req.query.eventId || '');
      let query = db.collection('results').where('resultStatus', '==', 'PUBLISHED').where('rank', '<=', 3);
      if (eventId) query = query.where('eventId', '==', eventId);

      const snap = await query.get();
      const winners = snap.docs.map((d: any) => d.data() as Result);

      const headers = ['Event', 'Program', 'Rank', 'Medal', 'Position', 'Participant/Team', 'Department', 'Score', 'Points Awarded'];
      const rows = winners.map((w: Result) => [
        w.eventName || w.eventId,
        w.programName || w.programId,
        w.rank,
        w.medal || (w.rank === 1 ? 'Gold' : w.rank === 2 ? 'Silver' : 'Bronze'),
        w.position,
        w.participantName,
        w.department || 'General',
        w.averageScore,
        w.pointsAwarded,
      ]);

      const excel = ExportService.generateExcelXml('Event Winners', headers, rows);
      res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="event_winners_${Date.now()}.xls"`);
      res.send(excel);
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 6. DEPARTMENT LEADERBOARD
  // =========================================================================

  /**
   * Department points leaderboard calculation
   */
  static async getDepartmentLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const { eventId } = req.query;

      let resultsQuery = db.collection('results').where('resultStatus', '==', 'PUBLISHED');
      if (eventId) {
        resultsQuery = resultsQuery.where('eventId', '==', String(eventId));
      }

      const resultsSnapshot = await resultsQuery.get();
      const results = resultsSnapshot.docs.map((d: any) => d.data() as Result);

      const deptMap: Record<string, DepartmentLeaderboardEntry> = {};

      for (const resItem of results) {
        const dept = resItem.department || 'General';
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

        deptMap[dept].totalPoints += resItem.pointsAwarded || 0;
        deptMap[dept].totalParticipants += 1;

        if (resItem.position === '1st' || resItem.medal === 'Gold') deptMap[dept].goldCount += 1;
        if (resItem.position === '2nd' || resItem.medal === 'Silver') deptMap[dept].silverCount += 1;
        if (resItem.position === '3rd' || resItem.medal === 'Bronze') deptMap[dept].bronzeCount += 1;
      }

      const leaderboard = Object.values(deptMap).sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.goldCount !== a.goldCount) return b.goldCount - a.goldCount;
        return b.silverCount - a.silverCount;
      });

      res.json({
        success: true,
        data: leaderboard,
      });
    } catch (err) {
      next(err);
    }
  }

  private static formatLeaderboardRows(leaderboard: DepartmentLeaderboardEntry[]) {
    const headers = [
      'Rank',
      'Department',
      'Total Fest Points',
      'Gold Medals (1st)',
      'Silver Medals (2nd)',
      'Bronze Medals (3rd)',
      'Total Participants',
    ];
    const rows = leaderboard.map((item, index) => [
      index + 1,
      item.department,
      item.totalPoints,
      item.goldCount,
      item.silverCount,
      item.bronzeCount,
      item.totalParticipants,
    ]);
    return { headers, rows };
  }

  static async exportLeaderboardCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const { eventId } = req.query;

      let resultsQuery = db.collection('results').where('resultStatus', '==', 'PUBLISHED');
      if (eventId) resultsQuery = resultsQuery.where('eventId', '==', String(eventId));

      const resultsSnapshot = await resultsQuery.get();
      const results = resultsSnapshot.docs.map((d: any) => d.data() as Result);

      const deptMap: Record<string, DepartmentLeaderboardEntry> = {};
      for (const resItem of results) {
        const dept = resItem.department || 'General';
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
        deptMap[dept].totalPoints += resItem.pointsAwarded || 0;
        deptMap[dept].totalParticipants += 1;
        if (resItem.position === '1st' || resItem.medal === 'Gold') deptMap[dept].goldCount += 1;
        if (resItem.position === '2nd' || resItem.medal === 'Silver') deptMap[dept].silverCount += 1;
        if (resItem.position === '3rd' || resItem.medal === 'Bronze') deptMap[dept].bronzeCount += 1;
      }

      const leaderboard = Object.values(deptMap).sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.goldCount !== a.goldCount) return b.goldCount - a.goldCount;
        return b.silverCount - a.silverCount;
      });

      const { headers, rows } = ReportController.formatLeaderboardRows(leaderboard);
      const csv = ExportService.generateCsv(headers, rows);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="department_leaderboard_${Date.now()}.csv"`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }

  static async exportLeaderboardExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const { eventId } = req.query;
      let resultsQuery = db.collection('results').where('resultStatus', '==', 'PUBLISHED');
      if (eventId) resultsQuery = resultsQuery.where('eventId', '==', String(eventId));
      const resultsSnapshot = await resultsQuery.get();
      const results = resultsSnapshot.docs.map((d: any) => d.data() as Result);

      const deptMap: Record<string, DepartmentLeaderboardEntry> = {};
      for (const resItem of results) {
        const dept = resItem.department || 'General';
        if (!deptMap[dept]) {
          deptMap[dept] = { department: dept, totalPoints: 0, goldCount: 0, silverCount: 0, bronzeCount: 0, totalParticipants: 0 };
        }
        deptMap[dept].totalPoints += resItem.pointsAwarded || 0;
        deptMap[dept].totalParticipants += 1;
        if (resItem.position === '1st' || resItem.medal === 'Gold') deptMap[dept].goldCount += 1;
        if (resItem.position === '2nd' || resItem.medal === 'Silver') deptMap[dept].silverCount += 1;
        if (resItem.position === '3rd' || resItem.medal === 'Bronze') deptMap[dept].bronzeCount += 1;
      }
      const leaderboard = Object.values(deptMap).sort((a, b) => b.totalPoints - a.totalPoints);
      const { headers, rows } = ReportController.formatLeaderboardRows(leaderboard);
      const excel = ExportService.generateExcelXml('Department Leaderboard', headers, rows);
      res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="department_leaderboard_${Date.now()}.xls"`);
      res.send(excel);
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 7. OVERALL LEADERBOARD (CROSS-EVENT INSTITUTIONAL CHAMPIONSHIP)
  // =========================================================================

  /**
   * System-wide overall championship combining department standings,
   * top individual performers, and top teams across all festivals
   */
  static async getOverallLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const [resultsSnap, progsSnap, regsSnap] = await Promise.all([
        db.collection('results').where('resultStatus', '==', 'PUBLISHED').get(),
        db.collection('programs').where('status', '==', 'RESULTS_PUBLISHED').get(),
        db.collection('registrations').get(),
      ]);

      const results = resultsSnap.docs.map((d: any) => d.data() as Result);
      const regMap = new Map<string, Registration>();
      regsSnap.docs.forEach((d: any) => regMap.set(d.id, d.data() as Registration));

      // Department standings
      const deptMap: Record<string, DepartmentLeaderboardEntry> = {};
      for (const resItem of results) {
        const dept = resItem.department || 'General';
        if (!deptMap[dept]) {
          deptMap[dept] = { department: dept, totalPoints: 0, goldCount: 0, silverCount: 0, bronzeCount: 0, totalParticipants: 0 };
        }
        deptMap[dept].totalPoints += resItem.pointsAwarded || 0;
        deptMap[dept].totalParticipants += 1;
        if (resItem.rank === 1) deptMap[dept].goldCount += 1;
        if (resItem.rank === 2) deptMap[dept].silverCount += 1;
        if (resItem.rank === 3) deptMap[dept].bronzeCount += 1;
      }

      const departmentLeaderboard = Object.values(deptMap).sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.goldCount !== a.goldCount) return b.goldCount - a.goldCount;
        return b.silverCount - a.silverCount;
      });

      // Individual champions
      const partMap: Record<string, any> = {};
      for (const r of results) {
        const reg = regMap.get(r.registrationId);
        if (reg?.participantType === 'TEAM') continue;
        const key = r.participantName;
        if (!partMap[key]) {
          partMap[key] = {
            rank: 1,
            participantName: r.participantName,
            department: r.department,
            registerNumber: r.registrationNumber,
            totalPoints: 0,
            goldCount: 0,
            silverCount: 0,
            bronzeCount: 0,
            eventsWonCount: 0,
            programsWon: [],
          };
        }
        partMap[key].totalPoints += r.pointsAwarded || 0;
        if (r.rank === 1) partMap[key].goldCount += 1;
        if (r.rank === 2) partMap[key].silverCount += 1;
        if (r.rank === 3) partMap[key].bronzeCount += 1;
        if (r.rank <= 3) {
          partMap[key].eventsWonCount += 1;
          partMap[key].programsWon.push({ programId: r.programId, programName: r.programName, position: r.position, points: r.pointsAwarded });
        }
      }
      const topParticipants = Object.values(partMap)
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .map((p, i) => ({ ...p, rank: i + 1 }))
        .slice(0, 10);

      // Team champions
      const teamMap: Record<string, any> = {};
      for (const r of results) {
        const reg = regMap.get(r.registrationId);
        if (reg && reg.participantType !== 'TEAM') continue;
        const key = r.teamName || r.participantName;
        if (!teamMap[key]) {
          teamMap[key] = {
            rank: 1,
            teamName: key,
            department: r.department,
            totalPoints: 0,
            goldCount: 0,
            silverCount: 0,
            bronzeCount: 0,
            eventsWonCount: 0,
            programsWon: [],
          };
        }
        teamMap[key].totalPoints += r.pointsAwarded || 0;
        if (r.rank === 1) teamMap[key].goldCount += 1;
        if (r.rank === 2) teamMap[key].silverCount += 1;
        if (r.rank === 3) teamMap[key].bronzeCount += 1;
        if (r.rank <= 3) {
          teamMap[key].eventsWonCount += 1;
          teamMap[key].programsWon.push({ programId: r.programId, programName: r.programName, position: r.position, points: r.pointsAwarded });
        }
      }
      const topTeams = Object.values(teamMap)
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .map((t, i) => ({ ...t, rank: i + 1 }))
        .slice(0, 10);

      const overall: OverallLeaderboardData = {
        departmentLeaderboard,
        topParticipants,
        topTeams,
        totalPublishedPrograms: progsSnap.size,
        totalMedalsAwarded: results.filter((r: Result) => r.rank <= 3).length,
      };

      res.json({
        success: true,
        data: overall,
      });
    } catch (err) {
      next(err);
    }
  }

  static async exportOverallLeaderboardCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const resultsSnap = await db.collection('results').where('resultStatus', '==', 'PUBLISHED').get();
      const results = resultsSnap.docs.map((d: any) => d.data() as Result);
      const deptMap: Record<string, DepartmentLeaderboardEntry> = {};
      for (const resItem of results) {
        const dept = resItem.department || 'General';
        if (!deptMap[dept]) {
          deptMap[dept] = { department: dept, totalPoints: 0, goldCount: 0, silverCount: 0, bronzeCount: 0, totalParticipants: 0 };
        }
        deptMap[dept].totalPoints += resItem.pointsAwarded || 0;
        deptMap[dept].totalParticipants += 1;
        if (resItem.rank === 1) deptMap[dept].goldCount += 1;
        if (resItem.rank === 2) deptMap[dept].silverCount += 1;
        if (resItem.rank === 3) deptMap[dept].bronzeCount += 1;
      }
      const leaderboard = Object.values(deptMap).sort((a, b) => b.totalPoints - a.totalPoints);
      const { headers, rows } = ReportController.formatLeaderboardRows(leaderboard);
      const csv = ExportService.generateCsv(headers, rows);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="overall_leaderboard_${Date.now()}.csv"`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }

  static async exportOverallLeaderboardExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const resultsSnap = await db.collection('results').where('resultStatus', '==', 'PUBLISHED').get();
      const results = resultsSnap.docs.map((d: any) => d.data() as Result);
      const deptMap: Record<string, DepartmentLeaderboardEntry> = {};
      for (const resItem of results) {
        const dept = resItem.department || 'General';
        if (!deptMap[dept]) {
          deptMap[dept] = { department: dept, totalPoints: 0, goldCount: 0, silverCount: 0, bronzeCount: 0, totalParticipants: 0 };
        }
        deptMap[dept].totalPoints += resItem.pointsAwarded || 0;
        deptMap[dept].totalParticipants += 1;
        if (resItem.rank === 1) deptMap[dept].goldCount += 1;
        if (resItem.rank === 2) deptMap[dept].silverCount += 1;
        if (resItem.rank === 3) deptMap[dept].bronzeCount += 1;
      }
      const leaderboard = Object.values(deptMap).sort((a, b) => b.totalPoints - a.totalPoints);
      const { headers, rows } = ReportController.formatLeaderboardRows(leaderboard);
      const excel = ExportService.generateExcelXml('Overall Leaderboard', headers, rows);
      res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="overall_leaderboard_${Date.now()}.xls"`);
      res.send(excel);
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 8. JURY SCORING AUDIT REPORT
  // =========================================================================

  /**
   * Complete jury scoring audit: program, jury member, participant, criteria breakdown, total score, status
   */
  static async getJuryScoringReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const { programId, eventId, juryId, status, search } = req.query;

      let query = db.collection('scores');
      if (programId) query = query.where('programId', '==', String(programId));
      if (juryId) query = query.where('juryId', '==', String(juryId));
      if (status) query = query.where('status', '==', String(status));

      const [scoresSnap, progsSnap, eventsSnap, regsSnap, usersSnap] = await Promise.all([
        query.get(),
        db.collection('programs').get(),
        db.collection('events').get(),
        db.collection('registrations').get(),
        db.collection('users').get(),
      ]);

      const progMap = new Map<string, Program>();
      progsSnap.docs.forEach((d: any) => progMap.set(d.id, d.data() as Program));

      const eventMap = new Map<string, string>();
      eventsSnap.docs.forEach((d: any) => eventMap.set(d.id, d.data().name || d.id));

      const regMap = new Map<string, Registration>();
      regsSnap.docs.forEach((d: any) => regMap.set(d.id, d.data() as Registration));

      const userMap = new Map<string, { name: string; email: string }>();
      usersSnap.docs.forEach((d: any) => {
        const u = d.data();
        userMap.set(d.id, { name: u.name, email: u.email });
      });

      let items: JuryScoringReportItem[] = scoresSnap.docs.map((d: any) => {
        const s = d.data() as Score;
        const prog = progMap.get(s.programId);
        const reg = regMap.get(s.registrationId);
        const juryUser = userMap.get(s.juryId);

        const participantName =
          reg?.participantType === 'TEAM'
            ? reg.teamName || reg.participantData?.teamName || 'Team'
            : reg?.participantData?.name || reg?.participantData?.fullName || 'Participant';

        const isLocked = s.status === 'LOCKED' || s.status === 'SUBMITTED' || !!(s as any).isLocked;

        return {
          id: s.id,
          programId: s.programId,
          programName: prog?.name || s.programId,
          eventId: prog?.eventId || '',
          eventName: prog ? eventMap.get(prog.eventId) || prog.eventId : '',
          registrationId: s.registrationId,
          registrationNumber: reg?.registrationNumber || '',
          participantName,
          department: reg?.department || 'General',
          juryId: s.juryId,
          juryName: juryUser?.name || s.juryName || s.juryId,
          juryEmail: juryUser?.email,
          criteriaScores: s.criteriaScores || {},
          totalScore: s.totalScore,
          status: s.status as any,
          isLocked,
          comments: s.feedback || (s as any).comments,
          submittedAt: s.submittedAt,
          updatedAt: s.updatedAt,
        };
      });

      if (eventId) {
        items = items.filter((item) => item.eventId === String(eventId));
      }

      if (search) {
        const s = String(search).toLowerCase();
        items = items.filter(
          (item) =>
            item.programName.toLowerCase().includes(s) ||
            item.juryName?.toLowerCase().includes(s) ||
            item.participantName.toLowerCase().includes(s) ||
            item.registrationNumber.toLowerCase().includes(s)
        );
      }

      res.json({
        success: true,
        data: items,
        count: items.length,
      });
    } catch (err) {
      next(err);
    }
  }

  private static formatJuryScoringRows(items: JuryScoringReportItem[]) {
    const headers = [
      'Program Name',
      'Event',
      'Jury Member',
      'Jury Email',
      'Participant/Team',
      'Registration #',
      'Department',
      'Total Score',
      'Status',
      'Locked',
      'Comments',
      'Submission Timestamp',
    ];
    const rows = items.map((i) => [
      i.programName,
      i.eventName,
      i.juryName || '',
      i.juryEmail || '',
      i.participantName,
      i.registrationNumber,
      i.department,
      i.totalScore,
      i.status,
      i.isLocked ? 'Yes' : 'No',
      i.comments || '',
      i.submittedAt || i.updatedAt || '',
    ]);
    return { headers, rows };
  }

  static async exportJuryScoringCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const [scoresSnap, progsSnap, regsSnap, usersSnap] = await Promise.all([
        db.collection('scores').get(),
        db.collection('programs').get(),
        db.collection('registrations').get(),
        db.collection('users').get(),
      ]);

      const progMap = new Map<string, Program>();
      progsSnap.docs.forEach((d: any) => progMap.set(d.id, d.data() as Program));
      const regMap = new Map<string, Registration>();
      regsSnap.docs.forEach((d: any) => regMap.set(d.id, d.data() as Registration));
      const userMap = new Map<string, { name: string; email: string }>();
      usersSnap.docs.forEach((d: any) => userMap.set(d.id, { name: d.data().name, email: d.data().email }));

      const items: JuryScoringReportItem[] = scoresSnap.docs.map((d: any) => {
        const s = d.data() as Score;
        const prog = progMap.get(s.programId);
        const reg = regMap.get(s.registrationId);
        const juryUser = userMap.get(s.juryId);
        return {
          id: s.id,
          programId: s.programId,
          programName: prog?.name || s.programId,
          eventId: prog?.eventId || '',
          eventName: prog?.eventId || '',
          registrationId: s.registrationId,
          registrationNumber: reg?.registrationNumber || '',
          participantName: reg?.participantData?.name || reg?.teamName || 'Participant',
          department: reg?.department || 'General',
          juryId: s.juryId,
          juryName: juryUser?.name || s.juryName || s.juryId,
          juryEmail: juryUser?.email,
          criteriaScores: s.criteriaScores || {},
          totalScore: s.totalScore,
          status: s.status as any,
          isLocked: s.status === 'LOCKED' || s.status === 'SUBMITTED' || !!(s as any).isLocked,
          comments: s.feedback || (s as any).comments,
          submittedAt: s.submittedAt,
        };
      });

      const { headers, rows } = ReportController.formatJuryScoringRows(items);
      const csv = ExportService.generateCsv(headers, rows);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="jury_scoring_report_${Date.now()}.csv"`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }

  static async exportJuryScoringExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();
      const [scoresSnap, progsSnap, regsSnap, usersSnap] = await Promise.all([
        db.collection('scores').get(),
        db.collection('programs').get(),
        db.collection('registrations').get(),
        db.collection('users').get(),
      ]);

      const progMap = new Map<string, Program>();
      progsSnap.docs.forEach((d: any) => progMap.set(d.id, d.data() as Program));
      const regMap = new Map<string, Registration>();
      regsSnap.docs.forEach((d: any) => regMap.set(d.id, d.data() as Registration));
      const userMap = new Map<string, { name: string; email: string }>();
      usersSnap.docs.forEach((d: any) => userMap.set(d.id, { name: d.data().name, email: d.data().email }));

      const items: JuryScoringReportItem[] = scoresSnap.docs.map((d: any) => {
        const s = d.data() as Score;
        const prog = progMap.get(s.programId);
        const reg = regMap.get(s.registrationId);
        const juryUser = userMap.get(s.juryId);
        return {
          id: s.id,
          programId: s.programId,
          programName: prog?.name || s.programId,
          eventId: prog?.eventId || '',
          eventName: prog?.eventId || '',
          registrationId: s.registrationId,
          registrationNumber: reg?.registrationNumber || '',
          participantName: reg?.participantData?.name || reg?.teamName || 'Participant',
          department: reg?.department || 'General',
          juryId: s.juryId,
          juryName: juryUser?.name || s.juryName || s.juryId,
          juryEmail: juryUser?.email,
          criteriaScores: s.criteriaScores || {},
          totalScore: s.totalScore,
          status: s.status as any,
          isLocked: s.status === 'LOCKED' || s.status === 'SUBMITTED' || !!(s as any).isLocked,
          comments: s.feedback || (s as any).comments,
          submittedAt: s.submittedAt,
        };
      });

      const { headers, rows } = ReportController.formatJuryScoringRows(items);
      const excel = ExportService.generateExcelXml('Jury Scoring Audit', headers, rows);
      res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="jury_scoring_report_${Date.now()}.xls"`);
      res.send(excel);
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // LEADERBOARDS & DASHBOARD STATS
  // =========================================================================

  /**
   * Event leaderboard endpoint aggregating Department, Participant, and Team standings
   */
  static async getEventLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const eventId = String(req.params.eventId || req.query.eventId || '');
      if (!eventId) {
        res.status(400).json({ success: false, message: 'eventId is required' });
        return;
      }

      const { firstPlace, secondPlace, thirdPlace } = req.query;
      const customPointsConfig = {
        firstPlace: firstPlace !== undefined ? Number(firstPlace) : undefined,
        secondPlace: secondPlace !== undefined ? Number(secondPlace) : undefined,
        thirdPlace: thirdPlace !== undefined ? Number(thirdPlace) : undefined,
      };

      const data = await ResultService.getEventLeaderboards(eventId, customPointsConfig);
      res.json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getParticipantLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const eventId = String(req.params.eventId || req.query.eventId || '');
      if (!eventId) {
        res.status(400).json({ success: false, message: 'eventId is required' });
        return;
      }
      const data = await ResultService.getEventLeaderboards(eventId);
      res.json({
        success: true,
        data: data.participantLeaderboard,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getTeamLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const eventId = String(req.params.eventId || req.query.eventId || '');
      if (!eventId) {
        res.status(400).json({ success: false, message: 'eventId is required' });
        return;
      }
      const data = await ResultService.getEventLeaderboards(eventId);
      res.json({
        success: true,
        data: data.teamLeaderboard,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Overall dashboard metrics, trends, and charts
   */
  static async getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const db = getDb();

      const [eventsSnap, progsSnap, regsSnap, resultsSnap] = await Promise.all([
        db.collection('events').get(),
        db.collection('programs').get(),
        db.collection('registrations').get(),
        db.collection('results').get(),
      ]);

      const events = eventsSnap.docs.map((d: any) => d.data() as Event);
      const programs = progsSnap.docs.map((d: any) => d.data() as Program);
      const registrations = regsSnap.docs.map((d: any) => d.data() as Registration);

      const activeEvents = events.filter((e: Event) =>
        ['PUBLISHED', 'REGISTRATION_OPEN', 'ONGOING'].includes(e.status)
      ).length;

      const openRegistrations = programs.filter(
        (p: Program) => p.status === 'REGISTRATION_OPEN'
      ).length;

      const completedPrograms = programs.filter((p: Program) =>
        ['COMPLETED', 'RESULTS_PUBLISHED'].includes(p.status)
      ).length;

      const pendingResults = programs.filter((p: Program) =>
        ['JUDGING', 'ONGOING'].includes(p.status)
      ).length;

      const resultsPublished = programs.filter(
        (p: Program) => p.status === 'RESULTS_PUBLISHED'
      ).length;

      const activeRegistrations = registrations.filter(
        (r: Registration) => r.status === 'CONFIRMED'
      ).length;

      // Group registrations by department for analytics chart
      const deptCounts: Record<string, number> = {};
      for (const reg of registrations) {
        const d = reg.department || reg.participantData?.department || 'General';
        deptCounts[d] = (deptCounts[d] || 0) + 1;
      }

      // Group registrations by category
      const categoryCounts: Record<string, number> = {};
      for (const prog of programs) {
        const cat = prog.category || 'Other';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + (prog.registeredCount || 0);
      }

      // Registrations by Program
      const progRegMap: Record<string, number> = {};
      for (const reg of registrations) {
        progRegMap[reg.programId] = (progRegMap[reg.programId] || 0) + 1;
      }
      const registrationsByProgram = programs.map((p: Program) => ({
        programId: p.id,
        programName: p.name,
        count: progRegMap[p.id] || p.registeredCount || 0,
      })).sort((a: any, b: any) => b.count - a.count);

      // Registration Trends (by date)
      const dateMap: Record<string, number> = {};
      for (const reg of registrations) {
        if (reg.registeredAt) {
          const d = reg.registeredAt.split('T')[0];
          dateMap[d] = (dateMap[d] || 0) + 1;
        }
      }
      const registrationTrends = Object.entries(dateMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const stats: DashboardAnalyticsData = {
        kpis: {
          totalEvents: events.length,
          activeEvents,
          totalPrograms: programs.length,
          openRegistrations,
          totalRegistrations: registrations.length,
          activeRegistrations,
          completedPrograms,
          pendingResults,
          resultsPublished,
          publishedWinners: resultsSnap.size,
        },
        charts: {
          registrationsByDepartment: deptCounts,
          registrationsByCategory: categoryCounts,
          registrationsByProgram,
          registrationTrends,
        },
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (err) {
      next(err);
    }
  }
}
