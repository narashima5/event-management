import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { Program, Event } from '../../types';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonCard } from '../../components/Skeleton';
import { useToast } from '../../contexts/ToastContext';
import {
  Award,
  Sparkles,
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Users,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

interface ProgramEvalStats {
  total: number;
  completed: number;
  pending: number;
}

export const JuryDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [evalMap, setEvalMap] = useState<Record<string, ProgramEvalStats>>({});
  const [eventsMap, setEventsMap] = useState<Record<string, Event>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJuryPrograms = async () => {
      try {
        setLoading(true);
        // Backend strictly filters GET /api/programs: Jury receives only assigned programs!
        const assigned = await api.getPrograms();
        setPrograms(assigned);

        // Fetch evaluations for each program to calculate pending/completed counts
        const statsMap: Record<string, ProgramEvalStats> = {};
        await Promise.all(
          assigned.map(async (prog) => {
            try {
              const evalData = await api.getJuryEvaluations(prog.id);
              const evals = evalData.evaluations || [];
              const completed = evals.filter(
                (e: any) => e.evaluationStatus === 'SUBMITTED' || e.evaluationStatus === 'LOCKED'
              ).length;
              statsMap[prog.id] = {
                total: evals.length,
                completed,
                pending: evals.length - completed,
              };
            } catch {
              statsMap[prog.id] = {
                total: prog.registeredCount || 0,
                completed: 0,
                pending: prog.registeredCount || 0,
              };
            }
          })
        );
        setEvalMap(statsMap);

        // Fetch events for context
        try {
          const eventsData = await api.getEvents();
          const eMap: Record<string, Event> = {};
          eventsData.forEach((e) => {
            eMap[e.id] = e;
          });
          setEventsMap(eMap);
        } catch {
          // Ignore
        }
      } catch (err: any) {
        toast.error(`Failed to load jury dashboard: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchJuryPrograms();
  }, []);

  // Summary Metrics
  const totalAssigned = programs.length;
  const totalParticipants = Object.values(evalMap).reduce((sum, s) => sum + s.total, 0);
  const totalCompleted = Object.values(evalMap).reduce((sum, s) => sum + s.completed, 0);
  const totalPending = Object.values(evalMap).reduce((sum, s) => sum + s.pending, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Jury Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(99, 102, 241, 0.08))',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                background: 'rgba(245, 158, 11, 0.2)',
                borderRadius: '100px',
                color: 'var(--amber)',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              <Award size={13} /> Official Jury Panel
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '4px' }}>
            Welcome, Judge {user?.name.split(' ')[0]}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Evaluate participant performances according to program scoring criteria. Save drafts as needed, and submit locked scores when evaluations conclude.
          </p>
        </div>

        {/* Global Summary Stats */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
              Assigned Programs
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>
              {totalAssigned}
            </div>
          </div>
          <div style={{ width: '1px', background: 'var(--border-subtle)' }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
              Participants
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {totalParticipants}
            </div>
          </div>
          <div style={{ width: '1px', background: 'var(--border-subtle)' }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
              Pending Evals
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--amber)' }}>
              {totalPending}
            </div>
          </div>
          <div style={{ width: '1px', background: 'var(--border-subtle)' }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
              Completed Evals
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--emerald)' }}>
              {totalCompleted}
            </div>
          </div>
        </div>
      </div>

      {/* Program Evaluation Roster */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={20} color="var(--amber)" /> Assigned Competitions & Evaluation Panels
        </h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.8125rem' }}>
          Select a program below to review the participant line-up and record your official scores.
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : programs.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No judging assignments found"
          description="You have not been assigned to judge any competitions yet. Please check back later or consult the Chief Event Administrator."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {programs.map((prog) => {
            const event = eventsMap[prog.eventId];
            const criteriaCount = prog.scoringConfig?.criteria?.length || 0;
            const totalMax = prog.scoringConfig?.criteria?.reduce((sum, c) => sum + c.maxScore, 0) || 100;
            const stats = evalMap[prog.id] || { total: prog.registeredCount || 0, completed: 0, pending: prog.registeredCount || 0 };
            const completionPercent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

            return (
              <div
                key={prog.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  transition: 'transform var(--transition-fast), border-color var(--transition-fast)',
                  cursor: 'pointer',
                }}
                onClick={() => navigate(`/jury/programs/${prog.id}/evaluate`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.4)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-card)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '4px',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {event ? `${event.name}` : 'Assigned Event'}
                    </span>
                    <Badge status={prog.status} />
                  </div>

                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                    {prog.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <code style={{ fontSize: '0.75rem', color: 'var(--amber)', fontWeight: 600 }}>{prog.code}</code>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>•</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                      {prog.category} ({prog.participationType})
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: '0.8125rem',
                      color: 'var(--text-muted)',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      marginBottom: '16px',
                    }}
                  >
                    {prog.description || 'No description provided.'}
                  </p>

                  {/* Program Schedule Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8125rem', color: 'var(--text-dim)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={15} color="var(--amber)" />
                      <span>{prog.date || 'Date TBD'}</span>
                      {prog.startTime && (
                        <>
                          <Clock size={15} color="var(--amber)" style={{ marginLeft: '6px' }} />
                          <span>{prog.startTime} - {prog.endTime || 'End'}</span>
                        </>
                      )}
                    </div>
                    {prog.venue && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={15} color="var(--amber)" />
                        <span>{prog.venue}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Evaluation Progress & Participant Metrics */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={14} /> Evaluation Progress
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      {stats.completed} of {stats.total} evaluated ({completionPercent}%)
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div
                    style={{
                      width: '100%',
                      height: '6px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: '3px',
                      overflow: 'hidden',
                      marginBottom: '10px',
                    }}
                  >
                    <div
                      style={{
                        width: `${completionPercent}%`,
                        height: '100%',
                        background:
                          completionPercent === 100
                            ? 'var(--emerald)'
                            : completionPercent > 0
                            ? 'var(--amber)'
                            : 'rgba(255, 255, 255, 0.2)',
                        borderRadius: '3px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-dim)' }}>
                      Pending: <strong style={{ color: 'var(--amber)' }}>{stats.pending}</strong>
                    </span>
                    <span style={{ color: 'var(--text-dim)' }}>
                      Criteria: <strong>{criteriaCount}</strong> ({totalMax} pts max)
                    </span>
                  </div>

                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/jury/programs/${prog.id}/evaluate`);
                    }}
                  >
                    Enter Evaluation Sheet <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
