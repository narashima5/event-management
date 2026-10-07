import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import {
  Program,
  Result,
  DepartmentLeaderboardEntry,
  WinnerReportItem,
  Event,
  EventLeaderboardData,
  ParticipantLeaderboardEntry,
  TeamLeaderboardEntry,
} from '../../types';
import { Badge } from '../../components/Badge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { useToast } from '../../contexts/ToastContext';
import {
  Trophy,
  Medal,
  Play,
  Share2,
  CheckCircle2,
  Sparkles,
  Award,
  Crown,
  Download,
  Filter,
  Printer,
  Calendar,
  Layers,
  Search,
  ChevronRight,
  TrendingUp,
  RotateCcw,
  AlertTriangle,
  EyeOff,
  Users,
} from 'lucide-react';

export const AdminResultsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PROGRAM_RESULTS' | 'EVENT_LEADERBOARDS' | 'WINNER_REPORT'>('PROGRAM_RESULTS');

  // Programs & Result Data
  const [events, setEvents] = useState<Event[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [incompleteJudgingWarning, setIncompleteJudgingWarning] = useState<string | null>(null);

  // Event Leaderboard State
  const [selectedLeaderboardEventId, setSelectedLeaderboardEventId] = useState('');
  const [eventLeaderboardView, setEventLeaderboardView] = useState<'DEPARTMENT' | 'PARTICIPANT' | 'TEAM'>('DEPARTMENT');
  const [eventLeaderboardData, setEventLeaderboardData] = useState<EventLeaderboardData | null>(null);
  const [pointConfig1st, setPointConfig1st] = useState<number>(5);
  const [pointConfig2nd, setPointConfig2nd] = useState<number>(3);
  const [pointConfig3rd, setPointConfig3rd] = useState<number>(1);

  // Winner Report State
  const [winnerReports, setWinnerReports] = useState<WinnerReportItem[]>([]);
  const [winnerFilterEventId, setWinnerFilterEventId] = useState('');
  const [winnerFilterCategory, setWinnerFilterCategory] = useState('');
  const [winnerFilterDepartment, setWinnerFilterDepartment] = useState('');
  const [winnerFilterRank, setWinnerFilterRank] = useState('');
  const [winnerLoading, setWinnerLoading] = useState(false);

  // Loading & Action states
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [unpublishDialogOpen, setUnpublishDialogOpen] = useState(false);

  const toast = useToast();

  const loadInitialData = async () => {
    try {
      const [evts, progs] = await Promise.all([
        api.getEvents(),
        api.getPrograms(),
      ]);
      setEvents(evts);
      setPrograms(progs);
      if (evts.length > 0) {
        setSelectedLeaderboardEventId(evts[0].id);
      }
      if (progs.length > 0) {
        setSelectedProgramId(progs[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadProgramResults = async (progId: string) => {
    if (!progId) return;
    setLoading(true);
    setIncompleteJudgingWarning(null);
    try {
      const data = await api.getProgramResults(progId);
      setResults(data);
    } catch (err: any) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  const loadEventLeaderboards = async (
    eventId: string,
    pointsConfig?: { firstPlace: number; secondPlace: number; thirdPlace: number }
  ) => {
    if (!eventId) return;
    try {
      const data = await api.getEventLeaderboards(eventId, pointsConfig);
      setEventLeaderboardData(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load event leaderboards');
    }
  };

  const loadWinnerReports = async () => {
    setWinnerLoading(true);
    try {
      const data = await api.getWinnerReport({
        eventId: winnerFilterEventId || undefined,
        category: winnerFilterCategory || undefined,
        department: winnerFilterDepartment || undefined,
        rank: winnerFilterRank ? Number(winnerFilterRank) : undefined,
      });
      setWinnerReports(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load winner report');
    } finally {
      setWinnerLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedProgramId) {
      loadProgramResults(selectedProgramId);
    }
  }, [selectedProgramId]);

  useEffect(() => {
    if (activeTab === 'EVENT_LEADERBOARDS' && selectedLeaderboardEventId) {
      loadEventLeaderboards(selectedLeaderboardEventId, {
        firstPlace: pointConfig1st,
        secondPlace: pointConfig2nd,
        thirdPlace: pointConfig3rd,
      });
    }
  }, [activeTab, selectedLeaderboardEventId]);

  useEffect(() => {
    if (activeTab === 'WINNER_REPORT') {
      loadWinnerReports();
    }
  }, [activeTab, winnerFilterEventId, winnerFilterCategory, winnerFilterDepartment, winnerFilterRank]);

  const handleCalculateResults = async () => {
    if (!selectedProgramId) return;
    setCalculating(true);
    setIncompleteJudgingWarning(null);
    try {
      const outcome: any = await api.calculateProgramResults(selectedProgramId);
      const computedList = Array.isArray(outcome) ? outcome : outcome.data || [];
      setResults(computedList);

      if (outcome.incompleteJudging) {
        setIncompleteJudgingWarning(
          `Notice: Incomplete judging panel (${outcome.completedJuryCount} of ${outcome.totalJuriesAssigned} assigned juries submitted scores). Results calculated from submitted evaluations.`
        );
        toast.warning('Results calculated, but some jury evaluations are still pending.');
      } else {
        toast.success('Authoritative results successfully calculated by backend calculation engine!');
      }

      setPrograms((prev) =>
        prev.map((p) => (p.id === selectedProgramId ? { ...p, status: 'COMPLETED' } : p))
      );
    } catch (err: any) {
      toast.error(err.message || 'Result calculation failed');
    } finally {
      setCalculating(false);
    }
  };

  const handlePublishResults = async () => {
    if (!selectedProgramId) return;
    setPublishing(true);
    try {
      await api.publishProgramResults(selectedProgramId);
      toast.success('Results published to participants and live leaderboard!');
      setPublishDialogOpen(false);
      await loadProgramResults(selectedProgramId);
      if (selectedLeaderboardEventId) {
        await loadEventLeaderboards(selectedLeaderboardEventId, {
          firstPlace: pointConfig1st,
          secondPlace: pointConfig2nd,
          thirdPlace: pointConfig3rd,
        });
      }
      setPrograms((prev) =>
        prev.map((p) => (p.id === selectedProgramId ? { ...p, status: 'RESULTS_PUBLISHED' } : p))
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish results');
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublishResults = async () => {
    if (!selectedProgramId) return;
    setUnpublishing(true);
    try {
      await api.unpublishProgramResults(selectedProgramId);
      toast.success('Results unpublished. Status reverted to draft.');
      setUnpublishDialogOpen(false);
      await loadProgramResults(selectedProgramId);
      if (selectedLeaderboardEventId) {
        await loadEventLeaderboards(selectedLeaderboardEventId, {
          firstPlace: pointConfig1st,
          secondPlace: pointConfig2nd,
          thirdPlace: pointConfig3rd,
        });
      }
      setPrograms((prev) =>
        prev.map((p) => (p.id === selectedProgramId ? { ...p, status: 'COMPLETED' } : p))
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to unpublish results');
    } finally {
      setUnpublishing(false);
    }
  };

  const handleApplyCustomPoints = () => {
    if (!selectedLeaderboardEventId) return;
    loadEventLeaderboards(selectedLeaderboardEventId, {
      firstPlace: pointConfig1st,
      secondPlace: pointConfig2nd,
      thirdPlace: pointConfig3rd,
    });
    toast.success(`Updated leaderboard points: 1st=${pointConfig1st}, 2nd=${pointConfig2nd}, 3rd=${pointConfig3rd}`);
  };

  const selectedProg = programs.find((p) => p.id === selectedProgramId);
  const categories = Array.from(new Set(programs.map((p) => p.category).filter(Boolean)));
  const departments = ['CSE', 'ECE', 'MECH', 'CIVIL', 'IT', 'AI-DS', 'EEE', 'Fine Arts', 'General'];

  // Podium participants for selected program
  const gold = results.find((r) => r.rank === 1);
  const silver = results.find((r) => r.rank === 2);
  const bronze = results.find((r) => r.rank === 3);

  const isPublished = selectedProg?.status === 'RESULTS_PUBLISHED' || results.some((r) => r.resultStatus === 'PUBLISHED');

  return (
    <div>
      {/* Title & Tab Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.625rem', fontWeight: 800 }}>Results & Championship Engine</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
            Authoritative scoring calculations, podium medals, department championship & winner reports
          </p>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', gap: '4px' }}>
          <button
            onClick={() => setActiveTab('PROGRAM_RESULTS')}
            className={`btn btn-sm ${activeTab === 'PROGRAM_RESULTS' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ border: 'none' }}
          >
            <Award size={14} /> Competition Results
          </button>
          <button
            onClick={() => setActiveTab('EVENT_LEADERBOARDS')}
            className={`btn btn-sm ${activeTab === 'EVENT_LEADERBOARDS' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ border: 'none' }}
          >
            <Trophy size={14} /> Event Leaderboards
          </button>
          <button
            onClick={() => setActiveTab('WINNER_REPORT')}
            className={`btn btn-sm ${activeTab === 'WINNER_REPORT' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ border: 'none' }}
          >
            <Medal size={14} /> Winner Reports
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: COMPETITION RESULTS & EVALUATION */}
      {/* ======================================================== */}
      {activeTab === 'PROGRAM_RESULTS' && (
        <div>
          {/* Incomplete Judging Banner if applicable */}
          {incompleteJudgingWarning && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 20px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: 'var(--amber)',
                fontSize: '0.875rem',
                marginBottom: '20px',
              }}
            >
              <AlertTriangle size={20} />
              <span>{incompleteJudgingWarning}</span>
            </div>
          )}

          {/* Program Selector & Action Toolbar */}
          <div
            className="glass-card"
            style={{
              padding: '22px',
              marginBottom: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '280px' }}>
              <div style={{ flex: 1, maxWidth: '420px' }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Select Competition Program</label>
                <select
                  className="form-select"
                  value={selectedProgramId}
                  onChange={(e) => setSelectedProgramId(e.target.value)}
                  style={{ width: '100%', fontSize: '0.875rem' }}
                >
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code}) &bull; {p.status}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProg && (
                <div style={{ marginTop: '20px' }}>
                  <Badge status={selectedProg.status} />
                </div>
              )}
            </div>

            {/* Program Points Config & Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {selectedProg?.scoringConfig?.pointsConfig && (
                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.75rem',
                    color: 'var(--text-dim)',
                  }}
                >
                  Points: 1st <strong style={{ color: 'var(--amber)' }}>{selectedProg.scoringConfig.pointsConfig.firstPlace}</strong> &bull; 2nd <strong style={{ color: '#94a3b8' }}>{selectedProg.scoringConfig.pointsConfig.secondPlace}</strong> &bull; 3rd <strong style={{ color: '#d97706' }}>{selectedProg.scoringConfig.pointsConfig.thirdPlace}</strong>
                </div>
              )}

              {/* Generate / Regenerate Results */}
              <button
                onClick={handleCalculateResults}
                className="btn btn-secondary btn-sm"
                disabled={calculating}
                title="Calculate authoritative rankings from submitted jury scores"
              >
                <Play size={15} /> {calculating ? 'Calculating...' : results.length > 0 ? 'Regenerate Results' : 'Generate Results'}
              </button>

              {/* Publish Results */}
              {!isPublished ? (
                <button
                  onClick={() => setPublishDialogOpen(true)}
                  className="btn btn-primary btn-sm"
                  disabled={publishing || results.length === 0}
                  title="Make calculated rankings visible to the public"
                >
                  <Share2 size={15} /> Publish Results
                </button>
              ) : (
                <button
                  onClick={() => setUnpublishDialogOpen(true)}
                  className="btn btn-outline btn-sm"
                  style={{ borderColor: 'rgba(239, 68, 68, 0.5)', color: '#ef4444' }}
                  disabled={unpublishing}
                  title="Unpublish results back to draft status"
                >
                  <EyeOff size={15} /> Unpublish Results
                </button>
              )}
            </div>
          </div>

          {/* Podium Showcase */}
          {results.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <span className="badge badge-primary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Official Podium Standings
                </span>
                <h3 style={{ fontSize: '1.375rem', fontWeight: 800, marginTop: '6px' }}>
                  {selectedProg?.name} Medalists
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
                {/* 2nd Place: Silver */}
                <div
                  className="glass-card"
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    border: '1px solid rgba(148, 163, 184, 0.4)',
                    background: 'linear-gradient(180deg, rgba(148, 163, 184, 0.12) 0%, rgba(8, 11, 17, 0.8) 100%)',
                    borderRadius: 'var(--radius-lg)',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      margin: '0 auto 12px',
                      borderRadius: '50%',
                      background: '#94a3b8',
                      color: '#080b11',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      boxShadow: '0 0 20px rgba(148, 163, 184, 0.4)',
                    }}
                  >
                    🥈
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    2nd Place &bull; Silver Medal
                  </span>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '4px', marginBottom: '4px' }}>
                    {silver ? silver.participantName : '—'}
                  </h4>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', marginBottom: '16px' }}>
                    {silver ? `${silver.department} • Reg: ${silver.registrationNumber}` : 'Pending evaluation'}
                  </p>
                  {silver && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                        {silver.averageScore} pts
                      </span>
                      <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                        +{silver.pointsAwarded} Fest Points
                      </span>
                    </div>
                  )}
                </div>

                {/* 1st Place: Gold */}
                <div
                  className="glass-card"
                  style={{
                    padding: '28px 24px',
                    textAlign: 'center',
                    border: '1px solid rgba(245, 158, 11, 0.6)',
                    background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.18) 0%, rgba(8, 11, 17, 0.9) 100%)',
                    borderRadius: 'var(--radius-lg)',
                    transform: 'translateY(-6px)',
                    position: 'relative',
                    boxShadow: '0 8px 32px rgba(245, 158, 11, 0.2)',
                  }}
                >
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      margin: '0 auto 12px',
                      borderRadius: '50%',
                      background: 'var(--grad-primary)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      boxShadow: '0 0 25px rgba(99, 102, 241, 0.5)',
                    }}
                  >
                    <Crown size={28} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--amber)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    🏆 1st Place &bull; Gold Medalist
                  </span>
                  <h4 style={{ fontSize: '1.375rem', fontWeight: 800, marginTop: '4px', marginBottom: '4px', color: 'var(--text-main)' }}>
                    {gold ? gold.participantName : '—'}
                  </h4>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', marginBottom: '16px' }}>
                    {gold ? `${gold.department} • Reg: ${gold.registrationNumber}` : 'Pending evaluation'}
                  </p>
                  {gold && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <span className="badge badge-primary" style={{ fontSize: '0.8125rem' }}>
                        {gold.averageScore} pts
                      </span>
                      <span className="badge badge-success" style={{ fontSize: '0.8125rem' }}>
                        +{gold.pointsAwarded} Fest Points
                      </span>
                    </div>
                  )}
                </div>

                {/* 3rd Place: Bronze */}
                <div
                  className="glass-card"
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    border: '1px solid rgba(217, 119, 6, 0.4)',
                    background: 'linear-gradient(180deg, rgba(217, 119, 6, 0.12) 0%, rgba(8, 11, 17, 0.8) 100%)',
                    borderRadius: 'var(--radius-lg)',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      margin: '0 auto 12px',
                      borderRadius: '50%',
                      background: '#d97706',
                      color: '#080b11',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      boxShadow: '0 0 20px rgba(217, 119, 6, 0.4)',
                    }}
                  >
                    🥉
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    3rd Place &bull; Bronze Medal
                  </span>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '4px', marginBottom: '4px' }}>
                    {bronze ? bronze.participantName : '—'}
                  </h4>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', marginBottom: '16px' }}>
                    {bronze ? `${bronze.department} • Reg: ${bronze.registrationNumber}` : 'Pending evaluation'}
                  </p>
                  {bronze && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                        {bronze.averageScore} pts
                      </span>
                      <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                        +{bronze.pointsAwarded} Fest Points
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Full Participant Rankings Table */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Program Leaderboard & Rankings</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  {results.length} evaluated participants &bull; Tie breaker rule: {selectedProg?.scoringConfig?.tieBreakerRule || 'Criterion 1 average'}
                </p>
              </div>
              {results.length > 0 && <Badge status={results[0].resultStatus} />}
            </div>

            {loading ? (
              <TableSkeleton rows={4} columns={6} />
            ) : results.length === 0 ? (
              <EmptyState
                icon={Trophy}
                title="No Calculated Results"
                description="Click 'Generate Results' above to aggregate jury evaluations and compute authoritative rankings."
              />
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Participant / Team</th>
                      <th>Department</th>
                      <th>Registration No.</th>
                      <th>Score</th>
                      <th>Position</th>
                      <th>Fest Points</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((res) => (
                      <tr key={res.id}>
                        <td>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              fontWeight: 800,
                              fontSize: '0.8125rem',
                              background:
                                res.rank === 1
                                  ? 'rgba(245, 158, 11, 0.2)'
                                  : res.rank === 2
                                  ? 'rgba(148, 163, 184, 0.2)'
                                  : res.rank === 3
                                  ? 'rgba(217, 119, 6, 0.2)'
                                  : 'rgba(255, 255, 255, 0.05)',
                              color:
                                res.rank === 1
                                  ? 'var(--amber)'
                                  : res.rank === 2
                                  ? '#94a3b8'
                                  : res.rank === 3
                                  ? '#d97706'
                                  : 'var(--text-dim)',
                            }}
                          >
                            {res.rank}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--text-main)' }}>{res.participantName}</strong>
                          {res.teamName && (
                            <span style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-dim)' }}>
                              Team: {res.teamName}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-neutral">{res.department}</span>
                        </td>
                        <td style={{ fontFamily: 'monospace', color: '#818cf8', fontSize: '0.8125rem' }}>
                          {res.registrationNumber}
                        </td>
                        <td>
                          <strong style={{ fontSize: '0.9375rem' }}>{res.averageScore} pts</strong>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              res.position === '1st'
                                ? 'badge-primary'
                                : res.position === '2nd'
                                ? 'badge-neutral'
                                : res.position === '3rd'
                                ? 'badge-warning'
                                : 'badge-neutral'
                            }`}
                          >
                            {res.position}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: res.pointsAwarded > 0 ? 'var(--emerald)' : 'var(--text-dim)' }}>
                            +{res.pointsAwarded} pts
                          </strong>
                        </td>
                        <td>
                          <Badge status={res.resultStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: EVENT-LEVEL MULTI-TIER LEADERBOARDS               */}
      {/* ======================================================== */}
      {activeTab === 'EVENT_LEADERBOARDS' && (
        <div>
          {/* Event Filter & Configurable Points Bar */}
          <div
            className="glass-card"
            style={{
              padding: '20px 24px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem', margin: 0 }}>Festival Event:</label>
                <select
                  className="form-select"
                  value={selectedLeaderboardEventId}
                  onChange={(e) => setSelectedLeaderboardEventId(e.target.value)}
                  style={{ minWidth: '240px', fontSize: '0.8125rem' }}
                >
                  {events.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.code} - {evt.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Configurable Point Inputs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Points Scale:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem' }}>1st</span>
                  <input
                    type="number"
                    className="form-input"
                    value={pointConfig1st}
                    onChange={(e) => setPointConfig1st(Number(e.target.value))}
                    style={{ width: '50px', padding: '4px 6px', fontSize: '0.75rem', textAlign: 'center' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem' }}>2nd</span>
                  <input
                    type="number"
                    className="form-input"
                    value={pointConfig2nd}
                    onChange={(e) => setPointConfig2nd(Number(e.target.value))}
                    style={{ width: '50px', padding: '4px 6px', fontSize: '0.75rem', textAlign: 'center' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem' }}>3rd</span>
                  <input
                    type="number"
                    className="form-input"
                    value={pointConfig3rd}
                    onChange={(e) => setPointConfig3rd(Number(e.target.value))}
                    style={{ width: '50px', padding: '4px 6px', fontSize: '0.75rem', textAlign: 'center' }}
                  />
                </div>
                <button onClick={handleApplyCustomPoints} className="btn btn-secondary btn-sm" style={{ padding: '5px 10px', fontSize: '0.75rem' }}>
                  Apply Scale
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => window.print()} className="btn btn-secondary btn-sm">
                <Printer size={15} /> Print Standings
              </button>
              <a
                href={api.getExportLeaderboardUrl(selectedLeaderboardEventId || undefined)}
                download
                className="btn btn-primary btn-sm"
              >
                <Download size={15} /> Export CSV
              </a>
            </div>
          </div>

          {/* Subtabs: Department / Participant / Team */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <button
              onClick={() => setEventLeaderboardView('DEPARTMENT')}
              className={`btn btn-sm ${eventLeaderboardView === 'DEPARTMENT' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Trophy size={14} /> Department Standings
            </button>
            <button
              onClick={() => setEventLeaderboardView('PARTICIPANT')}
              className={`btn btn-sm ${eventLeaderboardView === 'PARTICIPANT' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Medal size={14} /> Individual Champions (Participant Leaderboard)
            </button>
            <button
              onClick={() => setEventLeaderboardView('TEAM')}
              className={`btn btn-sm ${eventLeaderboardView === 'TEAM' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Users size={14} /> Team Champions (Team Leaderboard)
            </button>
          </div>

          {/* SUBVIEW A: DEPARTMENT STANDINGS */}
          {eventLeaderboardView === 'DEPARTMENT' && (
            <div>
              {/* Department Top 3 Cards */}
              {eventLeaderboardData?.departmentLeaderboard && eventLeaderboardData.departmentLeaderboard.length >= 3 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '28px' }}>
                  {eventLeaderboardData.departmentLeaderboard.slice(0, 3).map((dept, idx) => {
                    const isFirst = idx === 0;
                    return (
                      <div
                        key={dept.department}
                        className="glass-card"
                        style={{
                          padding: '24px',
                          borderRadius: 'var(--radius-lg)',
                          textAlign: 'center',
                          border: isFirst ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid var(--border-subtle)',
                          background: isFirst ? 'linear-gradient(180deg, rgba(245, 158, 11, 0.15) 0%, rgba(8, 11, 17, 0.9) 100%)' : 'rgba(255, 255, 255, 0.02)',
                        }}
                      >
                        <div
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            margin: '0 auto 10px',
                            background: isFirst ? 'var(--grad-primary)' : 'rgba(255,255,255,0.08)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                          }}
                        >
                          {isFirst ? <Trophy size={22} /> : `#${idx + 1}`}
                        </div>
                        <h4 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>{dept.department}</h4>
                        <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-main)', marginBottom: '8px' }}>
                          {dept.totalPoints} <span style={{ fontSize: '0.875rem', color: 'var(--text-dim)', fontWeight: 500 }}>Points</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', fontSize: '0.75rem' }}>
                          <span className="badge badge-warning">🥇 {dept.goldCount}</span>
                          <span className="badge badge-neutral">🥈 {dept.silverCount}</span>
                          <span className="badge badge-primary">🥉 {dept.bronzeCount}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Department Table */}
              <div className="glass-card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '16px' }}>
                  Department Championship Standings
                </h3>

                {!eventLeaderboardData?.departmentLeaderboard || eventLeaderboardData.departmentLeaderboard.length === 0 ? (
                  <EmptyState
                    icon={Trophy}
                    title="No Standings Available"
                    description="Standings will appear as competitions complete."
                  />
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Department Name</th>
                          <th>Gold Medals (1st)</th>
                          <th>Silver Medals (2nd)</th>
                          <th>Bronze Medals (3rd)</th>
                          <th>Total Participants</th>
                          <th>Championship Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eventLeaderboardData.departmentLeaderboard.map((item, index) => (
                          <tr key={item.department}>
                            <td>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  fontWeight: 800,
                                  fontSize: '0.8125rem',
                                  background: index === 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                  color: index === 0 ? 'var(--amber)' : 'var(--text-dim)',
                                }}
                              >
                                {index + 1}
                              </span>
                            </td>
                            <td>
                              <strong style={{ fontSize: '0.9375rem', color: 'var(--text-main)' }}>{item.department}</strong>
                            </td>
                            <td>
                              <span className="badge badge-warning">🥇 {item.goldCount} Gold</span>
                            </td>
                            <td>
                              <span className="badge badge-neutral">🥈 {item.silverCount} Silver</span>
                            </td>
                            <td>
                              <span className="badge badge-primary">🥉 {item.bronzeCount} Bronze</span>
                            </td>
                            <td style={{ color: 'var(--text-dim)' }}>{item.totalParticipants} registrations</td>
                            <td>
                              <strong style={{ fontSize: '1.125rem', color: '#818cf8' }}>{item.totalPoints} pts</strong>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUBVIEW B: PARTICIPANT LEADERBOARD */}
          {eventLeaderboardView === 'PARTICIPANT' && (
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '16px' }}>
                Individual Participant Champions
              </h3>

              {!eventLeaderboardData?.participantLeaderboard || eventLeaderboardData.participantLeaderboard.length === 0 ? (
                <EmptyState
                  icon={Medal}
                  title="No Participant Standings Yet"
                  description="Individual rankings will appear here as results are published."
                />
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Participant Name</th>
                        <th>Department</th>
                        <th>Competitions Won</th>
                        <th>Medals</th>
                        <th>Total Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventLeaderboardData.participantLeaderboard.map((item) => (
                        <tr key={item.participantName}>
                          <td>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                fontWeight: 800,
                                fontSize: '0.8125rem',
                                background: item.rank === 1 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                color: item.rank === 1 ? 'var(--amber)' : 'var(--text-dim)',
                              }}
                            >
                              {item.rank}
                            </span>
                          </td>
                          <td>
                            <strong style={{ color: 'var(--text-main)' }}>{item.participantName}</strong>
                            {item.registerNumber && (
                              <span style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-dim)' }}>
                                ID: {item.registerNumber}
                              </span>
                            )}
                          </td>
                          <td>
                            <span className="badge badge-neutral">{item.department}</span>
                          </td>
                          <td style={{ fontSize: '0.8125rem' }}>
                            {item.programsWon.map((p) => (
                              <span key={p.programId} style={{ display: 'block', color: 'var(--text-dim)' }}>
                                &bull; {p.programName} ({p.position})
                              </span>
                            ))}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {item.goldCount > 0 && <span className="badge badge-warning">🥇 {item.goldCount}</span>}
                              {item.silverCount > 0 && <span className="badge badge-neutral">🥈 {item.silverCount}</span>}
                              {item.bronzeCount > 0 && <span className="badge badge-primary">🥉 {item.bronzeCount}</span>}
                            </div>
                          </td>
                          <td>
                            <strong style={{ fontSize: '1.125rem', color: '#818cf8' }}>{item.totalPoints} pts</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SUBVIEW C: TEAM LEADERBOARD */}
          {eventLeaderboardView === 'TEAM' && (
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '16px' }}>
                Team Champions (Group Competitions)
              </h3>

              {!eventLeaderboardData?.teamLeaderboard || eventLeaderboardData.teamLeaderboard.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No Team Standings Yet"
                  description="Team rankings will appear here as results are published."
                />
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Team Name</th>
                        <th>Department</th>
                        <th>Competitions Won</th>
                        <th>Medals</th>
                        <th>Total Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventLeaderboardData.teamLeaderboard.map((item) => (
                        <tr key={item.teamName}>
                          <td>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                fontWeight: 800,
                                fontSize: '0.8125rem',
                                background: item.rank === 1 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                color: item.rank === 1 ? 'var(--amber)' : 'var(--text-dim)',
                              }}
                            >
                              {item.rank}
                            </span>
                          </td>
                          <td>
                            <strong style={{ color: 'var(--text-main)' }}>{item.teamName}</strong>
                          </td>
                          <td>
                            <span className="badge badge-neutral">{item.department}</span>
                          </td>
                          <td style={{ fontSize: '0.8125rem' }}>
                            {item.programsWon.map((p) => (
                              <span key={p.programId} style={{ display: 'block', color: 'var(--text-dim)' }}>
                                &bull; {p.programName} ({p.position})
                              </span>
                            ))}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {item.goldCount > 0 && <span className="badge badge-warning">🥇 {item.goldCount}</span>}
                              {item.silverCount > 0 && <span className="badge badge-neutral">🥈 {item.silverCount}</span>}
                              {item.bronzeCount > 0 && <span className="badge badge-primary">🥉 {item.bronzeCount}</span>}
                            </div>
                          </td>
                          <td>
                            <strong style={{ fontSize: '1.125rem', color: '#818cf8' }}>{item.totalPoints} pts</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: OFFICIAL WINNER REPORTS */}
      {/* ======================================================== */}
      {activeTab === 'WINNER_REPORT' && (
        <div>
          {/* Winner Filter Toolbar */}
          <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', alignItems: 'flex-end' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Festival Event</label>
                <select
                  className="form-select"
                  style={{ fontSize: '0.8125rem' }}
                  value={winnerFilterEventId}
                  onChange={(e) => setWinnerFilterEventId(e.target.value)}
                >
                  <option value="">All Events</option>
                  {events.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.code} - {evt.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Category</label>
                <select
                  className="form-select"
                  style={{ fontSize: '0.8125rem' }}
                  value={winnerFilterCategory}
                  onChange={(e) => setWinnerFilterCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Department</label>
                <select
                  className="form-select"
                  style={{ fontSize: '0.8125rem' }}
                  value={winnerFilterDepartment}
                  onChange={(e) => setWinnerFilterDepartment(e.target.value)}
                >
                  <option value="">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Podium Rank</label>
                <select
                  className="form-select"
                  style={{ fontSize: '0.8125rem' }}
                  value={winnerFilterRank}
                  onChange={(e) => setWinnerFilterRank(e.target.value)}
                >
                  <option value="">All Winners (1st, 2nd, 3rd)</option>
                  <option value="1">1st Place Only (Gold)</option>
                  <option value="2">2nd Place Only (Silver)</option>
                  <option value="3">3rd Place Only (Bronze)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => window.print()} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                  <Printer size={14} /> Print
                </button>
                <a
                  href={api.getExportWinnersUrl({
                    eventId: winnerFilterEventId || undefined,
                    category: winnerFilterCategory || undefined,
                    department: winnerFilterDepartment || undefined,
                    rank: winnerFilterRank || undefined,
                  })}
                  download
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                >
                  <Download size={14} /> Export CSV
                </a>
              </div>
            </div>
          </div>

          {/* Winner List Table */}
          {winnerLoading ? (
            <TableSkeleton rows={5} columns={7} />
          ) : winnerReports.length === 0 ? (
            <EmptyState
              icon={Medal}
              title="No Winners Matched"
              description="No published winners matched the currently selected filter combinations."
            />
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Medal & Rank</th>
                    <th>Participant / Team</th>
                    <th>Department</th>
                    <th>Competition Program</th>
                    <th>Category</th>
                    <th>Event</th>
                    <th>Score</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {winnerReports.map((w) => (
                    <tr key={w.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1.25rem' }}>
                            {w.rank === 1 ? '🥇' : w.rank === 2 ? '🥈' : w.rank === 3 ? '🥉' : '🎖️'}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{w.position}</span>
                        </div>
                      </td>
                      <td>
                        <strong style={{ display: 'block', color: 'var(--text-main)' }}>{w.participantName}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                          Reg: {w.registrationNumber}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-neutral">{w.department}</span>
                      </td>
                      <td>
                        <strong>{w.programName}</strong>
                      </td>
                      <td>
                        <span className="badge badge-primary">{w.programCategory}</span>
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--text-dim)' }}>
                        {w.eventName}
                      </td>
                      <td>
                        <strong style={{ fontSize: '0.9375rem' }}>{w.score}</strong>
                      </td>
                      <td>
                        <span className="badge badge-success">+{w.pointsAwarded} pts</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog for Publishing Results */}
      <ConfirmDialog
        isOpen={publishDialogOpen}
        title="Publish Competition Results?"
        message={`Are you sure you want to publish official results for ${selectedProg?.name}? Once published, rankings and medals will be visible on the public event portal and institution leaderboard.`}
        confirmLabel="Confirm & Publish"
        isDestructive={false}
        loading={publishing}
        onConfirm={handlePublishResults}
        onClose={() => setPublishDialogOpen(false)}
      />

      {/* Confirmation Dialog for Unpublishing Results */}
      <ConfirmDialog
        isOpen={unpublishDialogOpen}
        title="Unpublish Competition Results?"
        message={`Are you sure you want to unpublish results for ${selectedProg?.name}? This will remove them from the public results portal and revert standings to draft.`}
        confirmLabel="Unpublish Results"
        isDestructive={true}
        loading={unpublishing}
        onConfirm={handleUnpublishResults}
        onClose={() => setUnpublishDialogOpen(false)}
      />
    </div>
  );
};
