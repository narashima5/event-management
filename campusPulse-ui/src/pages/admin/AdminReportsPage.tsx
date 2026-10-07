import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import {
  Registration,
  Event,
  Program,
  ProgramRegistrationReportItem,
  EventRegistrationReportItem,
  WinnerReportItem,
  DepartmentLeaderboardEntry,
  OverallLeaderboardData,
  JuryScoringReportItem,
} from '../../types';
import { Badge } from '../../components/Badge';
import { TableSkeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { useToast } from '../../contexts/ToastContext';
import {
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  Users,
  RotateCcw,
  Sparkles,
  Trophy,
  Layers,
  Calendar,
  Award,
  BarChart3,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react';

export const AdminReportsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'participants';
  const toast = useToast();

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  // Common filters metadata
  const [events, setEvents] = useState<Event[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [evts, progs] = await Promise.all([api.getEvents(), api.getPrograms()]);
        setEvents(evts);
        setPrograms(progs);
      } catch (err) {
        console.error('Failed to load filter metadata:', err);
      }
    };
    fetchMeta();
  }, []);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Administrative Reporting System</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
            Authoritative university reporting with multi-dimensional filtering, pagination, and backend exports
          </p>
        </div>
      </div>

      {/* 8-Report Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '8px',
          marginBottom: '24px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {[
          { id: 'participants', label: '1. Participant Roster', icon: <Users size={16} /> },
          { id: 'program-reg', label: '2. Program Registrations', icon: <Layers size={16} /> },
          { id: 'event-reg', label: '3. Event Registrations', icon: <Calendar size={16} /> },
          { id: 'program-winners', label: '4. Program Winners', icon: <Trophy size={16} /> },
          { id: 'event-winners', label: '5. Event Winners', icon: <Award size={16} /> },
          { id: 'dept-leaderboard', label: '6. Department Standings', icon: <BarChart3 size={16} /> },
          { id: 'overall-leaderboard', label: '7. Overall Champions', icon: <Trophy size={16} /> },
          { id: 'jury-scoring', label: '8. Jury Scoring Audit', icon: <ShieldAlert size={16} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: currentTab === tab.id ? 'var(--primary)' : 'rgba(255, 255, 255, 0.04)',
              color: currentTab === tab.id ? '#ffffff' : 'var(--text-dim)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report Content Panels */}
      {currentTab === 'participants' && <ParticipantReportPanel events={events} programs={programs} />}
      {currentTab === 'program-reg' && <ProgramRegistrationReportPanel events={events} />}
      {currentTab === 'event-reg' && <EventRegistrationReportPanel />}
      {currentTab === 'program-winners' && <ProgramWinnersReportPanel programs={programs} />}
      {currentTab === 'event-winners' && <EventWinnersReportPanel events={events} />}
      {currentTab === 'dept-leaderboard' && <DepartmentLeaderboardReportPanel events={events} />}
      {currentTab === 'overall-leaderboard' && <OverallLeaderboardReportPanel />}
      {currentTab === 'jury-scoring' && <JuryScoringReportPanel programs={programs} />}
    </div>
  );
};

// =========================================================================
// 1. PARTICIPANT REPORT PANEL
// =========================================================================

const ParticipantReportPanel: React.FC<{ events: Event[]; programs: Program[] }> = ({ events, programs }) => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // Multi-Filter State (All Phase 8 required filters)
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [selectedParticipantType, setSelectedParticipantType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedAttendance, setSelectedAttendance] = useState('');
  const [selectedResult, setSelectedResult] = useState('');
  const [selectedWinnerStatus, setSelectedWinnerStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const activeFilters: Record<string, any> = {
        eventId: selectedEventId || undefined,
        programId: selectedProgramId || undefined,
        category: selectedCategory || undefined,
        department: selectedDepartment || undefined,
        year: selectedYear || undefined,
        gender: selectedGender || undefined,
        participantType: selectedParticipantType || undefined,
        status: selectedStatus || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        attendanceStatus: selectedAttendance || undefined,
        result: selectedResult || undefined,
        winnerStatus: selectedWinnerStatus || undefined,
        search: searchTerm || undefined,
        page,
        limit,
      };

      const res = await api.queryParticipants(activeFilters);

      if (Array.isArray(res)) {
        setRegistrations(res);
        setTotalCount(res.length);
        setTotalPages(Math.ceil(res.length / limit));
      } else if (res && res.data) {
        setRegistrations(res.data);
        if (res.pagination) {
          setTotalCount(res.pagination.total);
          setTotalPages(res.pagination.totalPages);
        } else {
          setTotalCount(res.count || res.data.length);
          setTotalPages(Math.ceil((res.count || res.data.length) / limit));
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch participant report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [
    selectedEventId,
    selectedProgramId,
    selectedCategory,
    selectedDepartment,
    selectedYear,
    selectedGender,
    selectedParticipantType,
    selectedStatus,
    startDate,
    endDate,
    selectedAttendance,
    selectedResult,
    selectedWinnerStatus,
  ]);

  useEffect(() => {
    fetchRegistrations();
  }, [
    page,
    limit,
    selectedEventId,
    selectedProgramId,
    selectedCategory,
    selectedDepartment,
    selectedYear,
    selectedGender,
    selectedParticipantType,
    selectedStatus,
    startDate,
    endDate,
    selectedAttendance,
    selectedResult,
    selectedWinnerStatus,
  ]);

  const handleResetFilters = () => {
    setSelectedEventId('');
    setSelectedProgramId('');
    setSelectedCategory('');
    setSelectedDepartment('');
    setSelectedYear('');
    setSelectedGender('');
    setSelectedParticipantType('');
    setSelectedStatus('');
    setStartDate('');
    setEndDate('');
    setSelectedAttendance('');
    setSelectedResult('');
    setSelectedWinnerStatus('');
    setSearchTerm('');
    setPage(1);
  };

  const handleAttendanceToggle = async (regId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'PRESENT' ? 'ABSENT' : 'PRESENT';
    try {
      await api.markAttendance(regId, nextStatus);
      toast.success(`Attendance updated to ${nextStatus}`);
      setRegistrations((prev) =>
        prev.map((r) => (r.id === regId ? { ...r, attendanceStatus: nextStatus } : r))
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to update attendance');
    }
  };

  const currentFilters = {
    eventId: selectedEventId || undefined,
    programId: selectedProgramId || undefined,
    category: selectedCategory || undefined,
    department: selectedDepartment || undefined,
    year: selectedYear || undefined,
    gender: selectedGender || undefined,
    participantType: selectedParticipantType || undefined,
    status: selectedStatus || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    attendanceStatus: selectedAttendance || undefined,
    result: selectedResult || undefined,
    winnerStatus: selectedWinnerStatus || undefined,
    search: searchTerm || undefined,
  };

  const exportCsvUrl = api.getExportParticipantsUrl(currentFilters, 'csv');
  const exportExcelUrl = api.getExportParticipantsUrl(currentFilters, 'excel');
  const exportPrintUrl = api.getExportParticipantsUrl(currentFilters, 'print');

  const availablePrograms = selectedEventId
    ? programs.filter((p) => p.eventId === selectedEventId)
    : programs;
  const categories = Array.from(new Set(programs.map((p) => p.category).filter(Boolean)));
  const departments = ['Computer Science', 'Fine Arts', 'Electronics', 'Mechanical', 'Civil', 'Information Tech', 'AI & Data Science', 'General'];

  return (
    <div>
      {/* Action Toolbar with Direct Backend Exports */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>Total Filtered:</span>
          <span className="badge badge-primary">{totalCount} Records</span>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => api.printExportHtml(exportPrintUrl)} className="btn btn-secondary btn-sm">
            <Printer size={15} /> Print / PDF
          </button>
          <button onClick={() => api.downloadExportFile(exportExcelUrl, `participants_report_${Date.now()}.xls`)} className="btn btn-secondary btn-sm">
            <FileSpreadsheet size={15} color="var(--emerald)" /> Export Excel (.xls)
          </button>
          <button onClick={() => api.downloadExportFile(exportCsvUrl, `participants_report_${Date.now()}.csv`)} className="btn btn-primary btn-sm">
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Comprehensive Multi-Filter Toolbar */}
      <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '12px' }}>
          {/* Search */}
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Search</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Name, Reg No..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '32px', fontSize: '0.8125rem' }}
              />
              <Search size={14} color="var(--text-dim)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          {/* Event */}
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Festival Event</label>
            <select
              className="form-select"
              style={{ fontSize: '0.8125rem' }}
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                setSelectedProgramId('');
              }}
            >
              <option value="">All Events</option>
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>{evt.code} - {evt.name}</option>
              ))}
            </select>
          </div>

          {/* Program */}
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Program</label>
            <select
              className="form-select"
              style={{ fontSize: '0.8125rem' }}
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
            >
              <option value="">All Programs</option>
              {availablePrograms.map((p) => (
                <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Category</label>
            <select
              className="form-select"
              style={{ fontSize: '0.8125rem' }}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Department</label>
            <select
              className="form-select"
              style={{ fontSize: '0.8125rem' }}
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Academic Year */}
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Academic Year</label>
            <select
              className="form-select"
              style={{ fontSize: '0.8125rem' }}
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="">All Years</option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </div>

          {/* Gender */}
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Gender</label>
            <select
              className="form-select"
              style={{ fontSize: '0.8125rem' }}
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
            >
              <option value="">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Participant Type */}
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Participant Type</label>
            <select
              className="form-select"
              style={{ fontSize: '0.8125rem' }}
              value={selectedParticipantType}
              onChange={(e) => setSelectedParticipantType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="INDIVIDUAL">Individual</option>
              <option value="TEAM">Team</option>
            </select>
          </div>

          {/* Registration Status */}
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Registration Status</label>
            <select
              className="form-select"
              style={{ fontSize: '0.8125rem' }}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="WAITLISTED">Waitlisted</option>
            </select>
          </div>

          {/* Attendance */}
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Attendance</label>
            <select
              className="form-select"
              style={{ fontSize: '0.8125rem' }}
              value={selectedAttendance}
              onChange={(e) => setSelectedAttendance(e.target.value)}
            >
              <option value="">All Attendance</option>
              <option value="PRESENT">Present (Checked In)</option>
              <option value="ABSENT">Absent</option>
              <option value="PENDING">Pending Check-in</option>
            </select>
          </div>

          {/* Result / Evaluation */}
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Evaluation Result</label>
            <select
              className="form-select"
              style={{ fontSize: '0.8125rem' }}
              value={selectedResult}
              onChange={(e) => setSelectedResult(e.target.value)}
            >
              <option value="">All Evaluation States</option>
              <option value="EVALUATED">Evaluated / Scored</option>
              <option value="PENDING">Pending Evaluation</option>
            </select>
          </div>

          {/* Winner Status */}
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Winner Status</label>
            <select
              className="form-select"
              style={{ fontSize: '0.8125rem' }}
              value={selectedWinnerStatus}
              onChange={(e) => setSelectedWinnerStatus(e.target.value)}
            >
              <option value="">All Participants</option>
              <option value="WINNERS_ONLY">Podium Winners Only</option>
              <option value="1st">1st Place (Gold)</option>
              <option value="2nd">2nd Place (Silver)</option>
              <option value="3rd">3rd Place (Bronze)</option>
              <option value="NON_WINNER">Non-Winners</option>
            </select>
          </div>
        </div>

        {/* Date Filters & Reset Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginRight: '6px' }}>Registered From:</span>
              <input
                type="date"
                className="form-input"
                style={{ fontSize: '0.75rem', padding: '6px 10px', display: 'inline-block', width: 'auto' }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginRight: '6px' }}>To:</span>
              <input
                type="date"
                className="form-input"
                style={{ fontSize: '0.75rem', padding: '6px 10px', display: 'inline-block', width: 'auto' }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <button onClick={handleResetFilters} className="btn btn-secondary btn-sm" type="button">
            <RotateCcw size={14} /> Reset All Filters
          </button>
        </div>
      </div>

      {/* Roster Table */}
      {loading ? (
        <TableSkeleton rows={8} columns={7} />
      ) : registrations.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Matching Participants"
          description="Try adjusting your filter combinations to see matching roster records."
          actionLabel="Clear Filters"
          onAction={handleResetFilters}
        />
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reg Number</th>
                  <th>Participant / Team</th>
                  <th>Program & Event</th>
                  <th>Department</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Attendance</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((reg) => {
                  const name =
                    reg.participantType === 'TEAM'
                      ? reg.teamName || reg.participantData?.teamName || 'Team'
                      : reg.participantData?.name || reg.participantData?.fullName || 'Participant';

                  return (
                    <tr key={reg.id}>
                      <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)' }}>
                        {reg.registrationNumber}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          {reg.participantData?.email || reg.participantData?.phone || ''}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{reg.programName || reg.programId}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          {reg.eventName || reg.eventId}
                        </div>
                      </td>
                      <td>{reg.department || reg.participantData?.department || 'General'}</td>
                      <td>
                        <span className={`badge ${reg.participantType === 'TEAM' ? 'badge-info' : 'badge-primary'}`}>
                          {reg.participantType}
                        </span>
                      </td>
                      <td>
                        <Badge status={reg.status} />
                      </td>
                      <td>
                        <button
                          onClick={() => handleAttendanceToggle(reg.id, reg.attendanceStatus)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            transition: 'background 0.2s',
                          }}
                          className={`badge ${reg.attendanceStatus === 'PRESENT' ? 'badge-success' : 'badge-danger'}`}
                        >
                          {reg.attendanceStatus === 'PRESENT' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {reg.attendanceStatus}
                        </button>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          {new Date(reg.registeredAt).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderTop: '1px solid var(--border-subtle)',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: 'var(--text-dim)' }}>
              <span>Rows per page:</span>
              <select
                className="form-select"
                style={{ width: 'auto', padding: '4px 8px', fontSize: '0.8125rem' }}
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>Showing {registrations.length} of {totalCount} records</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-dim)' }}>
                Page {page} of {Math.max(1, totalPages)}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// 2. PROGRAM REGISTRATION REPORT PANEL
// =========================================================================

const ProgramRegistrationReportPanel: React.FC<{ events: Event[] }> = ({ events }) => {
  const [data, setData] = useState<ProgramRegistrationReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        const items = await api.getProgramRegistrationReport({ eventId: selectedEventId || undefined });
        setData(items);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [selectedEventId]);

  const csvUrl = api.getExportProgramRegistrationUrl('csv', { eventId: selectedEventId || undefined });
  const excelUrl = api.getExportProgramRegistrationUrl('excel', { eventId: selectedEventId || undefined });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select
            className="form-select"
            style={{ width: '220px', fontSize: '0.8125rem' }}
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
          >
            <option value="">All Events</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.code} - {e.name}</option>
            ))}
          </select>
          <span className="badge badge-primary">{data.length} Programs Tracked</span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => api.downloadExportFile(excelUrl, `report_${Date.now()}.xls`)} className="btn btn-secondary btn-sm">
            <FileSpreadsheet size={15} color="var(--emerald)" /> Export Excel (.xls)
          </button>
          <button onClick={() => api.downloadExportFile(csvUrl, `report_${Date.now()}.csv`)} className="btn btn-primary btn-sm">
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Program Name</th>
                  <th>Event & Category</th>
                  <th>Capacity</th>
                  <th>Registered</th>
                  <th>Confirmed</th>
                  <th>Checked-In</th>
                  <th>Attendance %</th>
                  <th>Fill %</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.programId}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--cyan)' }}>{p.programCode}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.programName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{p.venue}</div>
                    </td>
                    <td>
                      <div>{p.eventName}</div>
                      <span className="badge badge-primary" style={{ fontSize: '0.6875rem' }}>{p.category}</span>
                    </td>
                    <td>{p.capacity}</td>
                    <td>{p.totalRegistrations}</td>
                    <td style={{ fontWeight: 600, color: 'var(--emerald)' }}>{p.confirmedCount}</td>
                    <td>{p.checkedInCount}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: p.attendanceRatePct >= 70 ? 'var(--emerald)' : 'var(--amber)' }}>
                        {p.attendanceRatePct}%
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: p.capacityUtilizationPct >= 90 ? 'var(--rose)' : 'var(--primary)' }}>
                        {p.capacityUtilizationPct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// 3. EVENT REGISTRATION REPORT PANEL
// =========================================================================

const EventRegistrationReportPanel: React.FC = () => {
  const [data, setData] = useState<EventRegistrationReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        const items = await api.getEventRegistrationReport();
        setData(items);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  const csvUrl = api.getExportEventRegistrationUrl('csv');
  const excelUrl = api.getExportEventRegistrationUrl('excel');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <span className="badge badge-primary">{data.length} Festival Events Registered</span>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => api.downloadExportFile(excelUrl, `report_${Date.now()}.xls`)} className="btn btn-secondary btn-sm">
            <FileSpreadsheet size={15} color="var(--emerald)" /> Export Excel (.xls)
          </button>
          <button onClick={() => api.downloadExportFile(csvUrl, `report_${Date.now()}.csv`)} className="btn btn-primary btn-sm">
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={4} columns={6} />
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event Code</th>
                  <th>Event Name</th>
                  <th>Status</th>
                  <th>Programs</th>
                  <th>Total Capacity</th>
                  <th>Registrations</th>
                  <th>Confirmed</th>
                  <th>Checked-In</th>
                  <th>Turnout %</th>
                </tr>
              </thead>
              <tbody>
                {data.map((e) => (
                  <tr key={e.eventId}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)' }}>{e.eventCode}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{e.eventName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {new Date(e.startDate).toLocaleDateString()} - {new Date(e.endDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td><Badge status={e.status} /></td>
                    <td>{e.totalPrograms}</td>
                    <td>{e.totalCapacity}</td>
                    <td>{e.totalRegistrations}</td>
                    <td style={{ fontWeight: 600, color: 'var(--emerald)' }}>{e.confirmedCount}</td>
                    <td>{e.checkedInCount}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: e.attendanceRatePct >= 50 ? 'var(--emerald)' : 'var(--amber)' }}>
                        {e.attendanceRatePct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// 4. PROGRAM WINNERS REPORT PANEL
// =========================================================================

const ProgramWinnersReportPanel: React.FC<{ programs: Program[] }> = ({ programs }) => {
  const [winners, setWinners] = useState<WinnerReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [selectedRank, setSelectedRank] = useState('');

  useEffect(() => {
    const fetchWinners = async () => {
      setLoading(true);
      try {
        const items = await api.getWinnerReport({
          programId: selectedProgramId || undefined,
          rank: selectedRank || undefined,
        });
        setWinners(items);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchWinners();
  }, [selectedProgramId, selectedRank]);

  const csvUrl = api.getExportWinnersUrl({ programId: selectedProgramId || undefined, rank: selectedRank || undefined }, 'csv');
  const excelUrl = api.getExportWinnersUrl({ programId: selectedProgramId || undefined, rank: selectedRank || undefined }, 'excel');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            className="form-select"
            style={{ width: '220px', fontSize: '0.8125rem' }}
            value={selectedProgramId}
            onChange={(e) => setSelectedProgramId(e.target.value)}
          >
            <option value="">All Programs</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
            ))}
          </select>

          <select
            className="form-select"
            style={{ width: '140px', fontSize: '0.8125rem' }}
            value={selectedRank}
            onChange={(e) => setSelectedRank(e.target.value)}
          >
            <option value="">All Ranks</option>
            <option value="1">1st Place (Gold)</option>
            <option value="2">2nd Place (Silver)</option>
            <option value="3">3rd Place (Bronze)</option>
          </select>
          <span className="badge badge-primary">{winners.length} Official Winners</span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => api.downloadExportFile(excelUrl, `report_${Date.now()}.xls`)} className="btn btn-secondary btn-sm">
            <FileSpreadsheet size={15} color="var(--emerald)" /> Export Excel (.xls)
          </button>
          <button onClick={() => api.downloadExportFile(csvUrl, `report_${Date.now()}.csv`)} className="btn btn-primary btn-sm">
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : winners.length === 0 ? (
        <EmptyState icon={Trophy} title="No Winners Recorded" description="Results have not been calculated and published for this selection yet." />
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rank & Medal</th>
                  <th>Winner Name</th>
                  <th>Department</th>
                  <th>Program</th>
                  <th>Score</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {winners.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <span className={`badge ${w.rank === 1 ? 'badge-gold' : w.rank === 2 ? 'badge-silver' : 'badge-bronze'}`}>
                        {w.position} &bull; {w.medal || 'Medal'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{w.participantName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{w.registrationNumber}</div>
                    </td>
                    <td>{w.department}</td>
                    <td>{w.programName}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{w.score}</td>
                    <td style={{ fontWeight: 700, color: 'var(--amber)' }}>+{w.pointsAwarded} pts</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// 5. EVENT WINNERS REPORT PANEL
// =========================================================================

const EventWinnersReportPanel: React.FC<{ events: Event[] }> = ({ events }) => {
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id || '');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedEventId && events.length > 0) {
      setSelectedEventId(events[0].id);
    }
  }, [events]);

  useEffect(() => {
    if (!selectedEventId) return;
    const fetchEventWinners = async () => {
      setLoading(true);
      try {
        const res = await api.getEventWinnersReport(selectedEventId);
        setReport(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEventWinners();
  }, [selectedEventId]);

  const csvUrl = selectedEventId ? api.getExportEventWinnersUrl(selectedEventId, 'csv') : '#';
  const excelUrl = selectedEventId ? api.getExportEventWinnersUrl(selectedEventId, 'excel') : '#';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            className="form-select"
            style={{ width: '260px', fontSize: '0.8125rem' }}
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.code} - {e.name}</option>
            ))}
          </select>
          <span className="badge badge-primary">{report?.totalPodiumWinners || 0} Podium Medalists</span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => api.downloadExportFile(excelUrl, `report_${Date.now()}.xls`)} className="btn btn-secondary btn-sm">
            <FileSpreadsheet size={15} color="var(--emerald)" /> Export Excel (.xls)
          </button>
          <button onClick={() => api.downloadExportFile(csvUrl, `report_${Date.now()}.csv`)} className="btn btn-primary btn-sm">
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : !report || report.winners.length === 0 ? (
        <EmptyState icon={Award} title="No Event Winners Yet" description="No published winners recorded for this event." />
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Program</th>
                  <th>Place</th>
                  <th>Winner</th>
                  <th>Department</th>
                  <th>Authoritative Score</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {report.winners.map((w: any) => (
                  <tr key={w.id}>
                    <td style={{ fontWeight: 600 }}>{w.programName}</td>
                    <td>
                      <span className={`badge ${w.rank === 1 ? 'badge-gold' : w.rank === 2 ? 'badge-silver' : 'badge-bronze'}`}>
                        {w.position} &bull; {w.medal || 'Medal'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{w.participantName}</td>
                    <td>{w.department}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{w.averageScore}</td>
                    <td style={{ fontWeight: 700, color: 'var(--amber)' }}>+{w.pointsAwarded} pts</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// 6. DEPARTMENT LEADERBOARD REPORT PANEL
// =========================================================================

const DepartmentLeaderboardReportPanel: React.FC<{ events: Event[] }> = ({ events }) => {
  const [data, setData] = useState<DepartmentLeaderboardEntry[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const items = await api.getDepartmentLeaderboard(selectedEventId || undefined);
        setData(items);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [selectedEventId]);

  const csvUrl = api.getExportLeaderboardUrl(selectedEventId || undefined, 'csv');
  const excelUrl = api.getExportLeaderboardUrl(selectedEventId || undefined, 'excel');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            className="form-select"
            style={{ width: '240px', fontSize: '0.8125rem' }}
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
          >
            <option value="">All Events (Overall Standings)</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.code} - {e.name}</option>
            ))}
          </select>
          <span className="badge badge-primary">{data.length} Departments Ranked</span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => api.downloadExportFile(excelUrl, `report_${Date.now()}.xls`)} className="btn btn-secondary btn-sm">
            <FileSpreadsheet size={15} color="var(--emerald)" /> Export Excel (.xls)
          </button>
          <button onClick={() => api.downloadExportFile(csvUrl, `report_${Date.now()}.csv`)} className="btn btn-primary btn-sm">
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={4} columns={6} />
      ) : data.length === 0 ? (
        <EmptyState icon={BarChart3} title="No Department Standings" description="No published results exist to compute department points yet." />
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Rank</th>
                  <th>Department</th>
                  <th>Total Points</th>
                  <th>Gold (1st)</th>
                  <th>Silver (2nd)</th>
                  <th>Bronze (3rd)</th>
                  <th>Participants</th>
                </tr>
              </thead>
              <tbody>
                {data.map((dept, index) => (
                  <tr key={dept.department}>
                    <td>
                      <span className={`badge ${index === 0 ? 'badge-gold' : index === 1 ? 'badge-silver' : index === 2 ? 'badge-bronze' : 'badge-neutral'}`}>
                        #{index + 1}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{dept.department}</td>
                    <td style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--amber)' }}>
                      {dept.totalPoints} pts
                    </td>
                    <td><span className="badge badge-gold">{dept.goldCount}</span></td>
                    <td><span className="badge badge-silver">{dept.silverCount}</span></td>
                    <td><span className="badge badge-bronze">{dept.bronzeCount}</span></td>
                    <td>{dept.totalParticipants}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// 7. OVERALL LEADERBOARD REPORT PANEL
// =========================================================================

const OverallLeaderboardReportPanel: React.FC = () => {
  const [data, setData] = useState<OverallLeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverall = async () => {
      setLoading(true);
      try {
        const res = await api.getOverallLeaderboard();
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOverall();
  }, []);

  const csvUrl = api.getExportOverallLeaderboardUrl('csv');
  const excelUrl = api.getExportOverallLeaderboardUrl('excel');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Institutional Championship Standings</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.8125rem' }}>
            Comprehensive university-wide ranking across all events & categories
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => api.downloadExportFile(excelUrl, `report_${Date.now()}.xls`)} className="btn btn-secondary btn-sm">
            <FileSpreadsheet size={15} color="var(--emerald)" /> Export Excel (.xls)
          </button>
          <button onClick={() => api.downloadExportFile(csvUrl, `report_${Date.now()}.csv`)} className="btn btn-primary btn-sm">
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : !data || data.departmentLeaderboard.length === 0 ? (
        <EmptyState icon={Trophy} title="No Championship Data" description="No published competition results recorded yet." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Top Departments */}
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', fontWeight: 700 }}>
              Department Championship Table
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Department</th>
                    <th>Total Points</th>
                    <th>Gold</th>
                    <th>Silver</th>
                    <th>Bronze</th>
                  </tr>
                </thead>
                <tbody>
                  {data.departmentLeaderboard.map((dept, i) => (
                    <tr key={dept.department}>
                      <td>#{i + 1}</td>
                      <td style={{ fontWeight: 700 }}>{dept.department}</td>
                      <td style={{ fontWeight: 800, color: 'var(--amber)' }}>{dept.totalPoints} pts</td>
                      <td>{dept.goldCount}</td>
                      <td>{dept.silverCount}</td>
                      <td>{dept.bronzeCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// 8. JURY SCORING AUDIT REPORT PANEL
// =========================================================================

const JuryScoringReportPanel: React.FC<{ programs: Program[] }> = ({ programs }) => {
  const [data, setData] = useState<JuryScoringReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true);
      try {
        const items = await api.getJuryScoringReport({
          programId: selectedProgramId || undefined,
          status: selectedStatus || undefined,
          search: searchTerm || undefined,
        });
        setData(items);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchScores();
  }, [selectedProgramId, selectedStatus, searchTerm]);

  const csvUrl = api.getExportJuryScoringUrl(
    { programId: selectedProgramId || undefined, status: selectedStatus || undefined, search: searchTerm || undefined },
    'csv'
  );
  const excelUrl = api.getExportJuryScoringUrl(
    { programId: selectedProgramId || undefined, status: selectedStatus || undefined, search: searchTerm || undefined },
    'excel'
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            className="form-select"
            style={{ width: '220px', fontSize: '0.8125rem' }}
            value={selectedProgramId}
            onChange={(e) => setSelectedProgramId(e.target.value)}
          >
            <option value="">All Programs</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
            ))}
          </select>

          <select
            className="form-select"
            style={{ width: '150px', fontSize: '0.8125rem' }}
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">All Evaluation States</option>
            <option value="SUBMITTED">Submitted / Locked</option>
            <option value="DRAFT">In-Progress Draft</option>
          </select>
          <span className="badge badge-primary">{data.length} Score Evaluations</span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => api.downloadExportFile(excelUrl, `report_${Date.now()}.xls`)} className="btn btn-secondary btn-sm">
            <FileSpreadsheet size={15} color="var(--emerald)" /> Export Excel (.xls)
          </button>
          <button onClick={() => api.downloadExportFile(csvUrl, `report_${Date.now()}.csv`)} className="btn btn-primary btn-sm">
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={5} columns={7} />
      ) : data.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="No Score Records" description="No jury scores match your current criteria." />
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Program</th>
                  <th>Jury Member</th>
                  <th>Participant / Team</th>
                  <th>Total Score</th>
                  <th>Status</th>
                  <th>Locked</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.programName}</td>
                    <td>
                      <div>{item.juryName || item.juryId}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{item.juryEmail}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.participantName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{item.registrationNumber} ({item.department})</div>
                    </td>
                    <td style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}>
                      {item.totalScore}
                    </td>
                    <td>
                      <Badge status={item.status} />
                    </td>
                    <td>
                      <span className={`badge ${item.isLocked ? 'badge-danger' : 'badge-neutral'}`}>
                        {item.isLocked ? 'Locked' : 'Unlocked'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {item.submittedAt ? new Date(item.submittedAt).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
