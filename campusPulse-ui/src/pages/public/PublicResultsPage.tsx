import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Event, Program, EventLeaderboardData } from '../../types';
import { Badge } from '../../components/Badge';
import { Skeleton, TableSkeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import {
  Trophy,
  Medal,
  Award,
  Crown,
  Search,
  Sparkles,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Users,
  ShieldCheck,
  ChevronRight,
  Filter,
} from 'lucide-react';

export const PublicResultsPage: React.FC = () => {
  const { codeOrSlug } = useParams<{ codeOrSlug?: string }>();

  // Event list & selected event
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventResultsData, setEventResultsData] = useState<any>(null);
  const [leaderboardData, setLeaderboardData] = useState<EventLeaderboardData | null>(null);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'PROGRAM_RESULTS' | 'DEPARTMENT_LEADERBOARD' | 'PARTICIPANT_LEADERBOARD' | 'TEAM_LEADERBOARD'>('PROGRAM_RESULTS');
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Load events
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const list = await api.getPublicEvents();
        setEvents(list);
        if (list.length > 0) {
          if (codeOrSlug) {
            const found = list.find(
              (e) =>
                e.code.toUpperCase() === codeOrSlug.toUpperCase() ||
                e.slug.toLowerCase() === codeOrSlug.toLowerCase() ||
                e.id === codeOrSlug
            );
            setSelectedEvent(found || list[0]);
          } else {
            setSelectedEvent(list[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load events:', err);
      }
    };
    loadEvents();
  }, [codeOrSlug]);

  // Load published results for selected event
  useEffect(() => {
    if (!selectedEvent) return;

    const loadEventResults = async () => {
      setLoading(true);
      try {
        const [resultsRes, lbdRes] = await Promise.all([
          api.getPublicEventResults(selectedEvent.code),
          api.getPublicEventLeaderboard(selectedEvent.code),
        ]);
        setEventResultsData(resultsRes);
        setLeaderboardData(lbdRes);

        // Auto select first program with results if available
        if (resultsRes?.programs && resultsRes.programs.length > 0) {
          setSelectedProgramId(resultsRes.programs[0].id);
        } else {
          setSelectedProgramId('');
        }
      } catch (err) {
        console.error('Failed to load results:', err);
      } finally {
        setLoading(false);
      }
    };

    loadEventResults();
  }, [selectedEvent]);

  const publishedPrograms = eventResultsData?.programs || [];
  const currentProgram = publishedPrograms.find((p: any) => p.id === selectedProgramId) || publishedPrograms[0];
  const programResults = currentProgram?.results || [];

  const gold = programResults.find((r: any) => r.rank === 1);
  const silver = programResults.find((r: any) => r.rank === 2);
  const bronze = programResults.find((r: any) => r.rank === 3);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Public Header */}
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(8, 11, 17, 0.85)',
          backdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--grad-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Trophy size={20} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 800 }}>CampusPulse Results</h1>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-dim)' }}>Official Festival Standings</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to="/" className="btn btn-secondary btn-sm">
            Event Portal
          </Link>
          <Link to="/lookup" className="btn btn-outline btn-sm">
            <Search size={14} /> My Registration
          </Link>
          <Link to="/login" className="btn btn-primary btn-sm">
            Staff Sign In
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, padding: '32px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {/* Event Selector & Title Bar */}
        <div
          className="glass-card"
          style={{
            padding: '24px 32px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <span className="badge badge-primary" style={{ marginBottom: '6px' }}>Official Public Results</span>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
              {selectedEvent?.name || 'Festival Leaderboards & Results'}
            </h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
              Only official, verified results published by the jury panel and event administrators
            </p>
          </div>

          <div style={{ minWidth: '260px' }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Select Festival Event:</label>
            <select
              className="form-select"
              value={selectedEvent?.id || ''}
              onChange={(e) => {
                const found = events.find((ev) => ev.id === e.target.value);
                if (found) setSelectedEvent(found);
              }}
              style={{ fontSize: '0.875rem' }}
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.code} - {ev.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', gap: '4px', marginBottom: '28px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('PROGRAM_RESULTS')}
            className={`btn btn-sm ${activeTab === 'PROGRAM_RESULTS' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ border: 'none' }}
          >
            <Award size={14} /> Competition Leaderboard
          </button>
          <button
            onClick={() => setActiveTab('DEPARTMENT_LEADERBOARD')}
            className={`btn btn-sm ${activeTab === 'DEPARTMENT_LEADERBOARD' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ border: 'none' }}
          >
            <Trophy size={14} /> Department Championship
          </button>
          <button
            onClick={() => setActiveTab('PARTICIPANT_LEADERBOARD')}
            className={`btn btn-sm ${activeTab === 'PARTICIPANT_LEADERBOARD' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ border: 'none' }}
          >
            <Medal size={14} /> Individual Champions
          </button>
          <button
            onClick={() => setActiveTab('TEAM_LEADERBOARD')}
            className={`btn btn-sm ${activeTab === 'TEAM_LEADERBOARD' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ border: 'none' }}
          >
            <Users size={14} /> Team Champions
          </button>
        </div>

        {loading ? (
          <div>
            <Skeleton height="200px" borderRadius="var(--radius-lg)" style={{ marginBottom: '24px' }} />
            <TableSkeleton rows={5} columns={5} />
          </div>
        ) : (
          <>
            {/* ======================================================== */}
            {/* VIEW 1: COMPETITION LEADERBOARD                          */}
            {/* ======================================================== */}
            {activeTab === 'PROGRAM_RESULTS' && (
              <div>
                {publishedPrograms.length === 0 ? (
                  <EmptyState
                    icon={Trophy}
                    title="No Published Results Yet"
                    description={`There are currently no official results published for ${selectedEvent?.name}. Results will appear here once evaluations are sealed and released.`}
                  />
                ) : (
                  <div>
                    {/* Program Selector */}
                    <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <label className="form-label" style={{ fontSize: '0.75rem', margin: 0 }}>Select Competition:</label>
                      <select
                        className="form-select"
                        value={selectedProgramId}
                        onChange={(e) => setSelectedProgramId(e.target.value)}
                        style={{ minWidth: '320px', fontSize: '0.875rem' }}
                      >
                        {publishedPrograms.map((p: any) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.category})
                          </option>
                        ))}
                      </select>
                      <span className="badge badge-success">Official Results Sealed</span>
                    </div>

                    {/* Podium Standings Showcase */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                      {/* 2nd Place: Silver */}
                      <div
                        className="glass-card"
                        style={{
                          padding: '24px',
                          textAlign: 'center',
                          border: '1px solid rgba(148, 163, 184, 0.4)',
                          background: 'linear-gradient(180deg, rgba(148, 163, 184, 0.12) 0%, rgba(8, 11, 17, 0.8) 100%)',
                          borderRadius: 'var(--radius-lg)',
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
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                          2nd Place &bull; Silver Medalist
                        </span>
                        <h4 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '4px', marginBottom: '4px' }}>
                          {silver ? silver.participantName : '—'}
                        </h4>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', marginBottom: '14px' }}>
                          {silver ? silver.department : '—'}
                        </p>
                        {silver && (
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            <span className="badge badge-neutral">{silver.averageScore} pts</span>
                            <span className="badge badge-success">+{silver.pointsAwarded} Fest Points</span>
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
                          🥇
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--amber)', fontWeight: 800, textTransform: 'uppercase' }}>
                          🏆 1st Place &bull; Gold Medalist
                        </span>
                        <h4 style={{ fontSize: '1.375rem', fontWeight: 800, marginTop: '4px', marginBottom: '4px', color: 'var(--text-main)' }}>
                          {gold ? gold.participantName : '—'}
                        </h4>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', marginBottom: '14px' }}>
                          {gold ? gold.department : '—'}
                        </p>
                        {gold && (
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            <span className="badge badge-primary">{gold.averageScore} pts</span>
                            <span className="badge badge-success">+{gold.pointsAwarded} Fest Points</span>
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
                        <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 700, textTransform: 'uppercase' }}>
                          3rd Place &bull; Bronze Medalist
                        </span>
                        <h4 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '4px', marginBottom: '4px' }}>
                          {bronze ? bronze.participantName : '—'}
                        </h4>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', marginBottom: '14px' }}>
                          {bronze ? bronze.department : '—'}
                        </p>
                        {bronze && (
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            <span className="badge badge-neutral">{bronze.averageScore} pts</span>
                            <span className="badge badge-success">+{bronze.pointsAwarded} Fest Points</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Program Leaderboard Table */}
                    <div className="glass-card" style={{ padding: '24px' }}>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '16px' }}>
                        {currentProgram?.name} — Official Standings
                      </h3>

                      <div className="table-container">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Rank</th>
                              <th>Participant / Team</th>
                              <th>Department</th>
                              <th>Score</th>
                              <th>Position</th>
                              <th>Points Awarded</th>
                            </tr>
                          </thead>
                          <tbody>
                            {programResults.map((r: any) => (
                              <tr key={r.rank}>
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
                                        r.rank === 1
                                          ? 'rgba(245, 158, 11, 0.2)'
                                          : r.rank === 2
                                          ? 'rgba(148, 163, 184, 0.2)'
                                          : r.rank === 3
                                          ? 'rgba(217, 119, 6, 0.2)'
                                          : 'rgba(255, 255, 255, 0.05)',
                                      color:
                                        r.rank === 1
                                          ? 'var(--amber)'
                                          : r.rank === 2
                                          ? '#94a3b8'
                                          : r.rank === 3
                                          ? '#d97706'
                                          : 'var(--text-dim)',
                                    }}
                                  >
                                    {r.rank}
                                  </span>
                                </td>
                                <td>
                                  <strong style={{ color: 'var(--text-main)' }}>{r.participantName}</strong>
                                  {r.teamName && (
                                    <span style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-dim)' }}>
                                      Team: {r.teamName}
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <span className="badge badge-neutral">{r.department}</span>
                                </td>
                                <td>
                                  <strong style={{ fontSize: '0.9375rem' }}>{r.averageScore} pts</strong>
                                </td>
                                <td>
                                  <span
                                    className={`badge ${
                                      r.position === '1st'
                                        ? 'badge-primary'
                                        : r.position === '2nd'
                                        ? 'badge-neutral'
                                        : r.position === '3rd'
                                        ? 'badge-warning'
                                        : 'badge-neutral'
                                    }`}
                                  >
                                    {r.position}
                                  </span>
                                </td>
                                <td>
                                  <strong style={{ color: r.pointsAwarded > 0 ? 'var(--emerald)' : 'var(--text-dim)' }}>
                                    +{r.pointsAwarded} pts
                                  </strong>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* VIEW 2: DEPARTMENT CHAMPIONSHIP LEADERBOARD             */}
            {/* ======================================================== */}
            {activeTab === 'DEPARTMENT_LEADERBOARD' && (
              <div className="glass-card" style={{ padding: '28px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Trophy size={20} color="var(--amber)" /> Department Championship Standings
                  </h3>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.8125rem' }}>
                    Official institution championship points: 1st = {leaderboardData?.pointsConfig.firstPlace || 5} pts, 2nd = {leaderboardData?.pointsConfig.secondPlace || 3} pts, 3rd = {leaderboardData?.pointsConfig.thirdPlace || 1} pt
                  </p>
                </div>

                {!leaderboardData?.departmentLeaderboard || leaderboardData.departmentLeaderboard.length === 0 ? (
                  <EmptyState
                    icon={Trophy}
                    title="No Points Awarded Yet"
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
                          <th>Total Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboardData.departmentLeaderboard.map((item, index) => (
                          <tr key={item.department}>
                            <td>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '30px',
                                  height: '30px',
                                  borderRadius: '50%',
                                  fontWeight: 800,
                                  background: index === 0 ? 'var(--grad-primary)' : 'rgba(255, 255, 255, 0.05)',
                                  color: index === 0 ? 'white' : 'var(--text-dim)',
                                }}
                              >
                                {index + 1}
                              </span>
                            </td>
                            <td>
                              <strong style={{ fontSize: '0.9375rem', color: 'var(--text-main)' }}>{item.department}</strong>
                            </td>
                            <td>
                              <span className="badge badge-warning">🥇 {item.goldCount}</span>
                            </td>
                            <td>
                              <span className="badge badge-neutral">🥈 {item.silverCount}</span>
                            </td>
                            <td>
                              <span className="badge badge-primary">🥉 {item.bronzeCount}</span>
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

            {/* ======================================================== */}
            {/* VIEW 3: INDIVIDUAL PARTICIPANT LEADERBOARD              */}
            {/* ======================================================== */}
            {activeTab === 'PARTICIPANT_LEADERBOARD' && (
              <div className="glass-card" style={{ padding: '28px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Medal size={20} color="var(--primary)" /> Individual Festival Champions
                  </h3>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.8125rem' }}>
                    Top individual student performers across all festival competitions
                  </p>
                </div>

                {!leaderboardData?.participantLeaderboard || leaderboardData.participantLeaderboard.length === 0 ? (
                  <EmptyState
                    icon={Medal}
                    title="No Participant Standings Yet"
                    description="Individual champions will be listed here once results are published."
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
                        {leaderboardData.participantLeaderboard.map((item) => (
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

            {/* ======================================================== */}
            {/* VIEW 4: TEAM LEADERBOARD                                 */}
            {/* ======================================================== */}
            {activeTab === 'TEAM_LEADERBOARD' && (
              <div className="glass-card" style={{ padding: '28px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={20} color="var(--cyan)" /> Team Champions
                  </h3>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.8125rem' }}>
                    Top performing teams in group competitions
                  </p>
                </div>

                {!leaderboardData?.teamLeaderboard || leaderboardData.teamLeaderboard.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No Team Standings Yet"
                    description="Group competition champions will be shown here as results are published."
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
                        {leaderboardData.teamLeaderboard.map((item) => (
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
          </>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '24px 32px',
          textAlign: 'center',
          color: 'var(--text-dim)',
          fontSize: '0.8125rem',
        }}
      >
        CampusPulse &copy; {new Date().getFullYear()} College Event Management Platform &bull; Built with React & Firebase
      </footer>
    </div>
  );
};
