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
  ClipboardList,
  Calendar,
  MapPin,
  Clock,
  Users,
  ArrowRight,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

export const CoordinatorDashboard: React.FC = () => {
  const { user, assignments } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [eventsMap, setEventsMap] = useState<Record<string, Event>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssignedData = async () => {
      try {
        setLoading(true);
        // Backend API strictly filters programs: Coordinator receives ONLY programs with active assignment!
        const assignedPrograms = await api.getPrograms();
        setPrograms(assignedPrograms);

        // Fetch events for context
        try {
          const eventsData = await api.getEvents();
          const eMap: Record<string, Event> = {};
          eventsData.forEach((e) => {
            eMap[e.id] = e;
          });
          setEventsMap(eMap);
        } catch {
          // If coordinator cannot access all events, ignore
        }
      } catch (err: any) {
        toast.error(`Failed to load coordinator programs: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignedData();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.08))',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
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
                background: 'rgba(99, 102, 241, 0.2)',
                borderRadius: '100px',
                color: 'var(--primary)',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              <Sparkles size={13} /> Program Coordinator Desk
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '4px' }}>
            Welcome back, {user?.name.split(' ')[0]}!
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Manage registrations, track attendance, check-in participants, and oversee logistics for your assigned competitions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
              Assigned Programs
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>
              {programs.length}
            </div>
          </div>
          <div style={{ width: '1px', background: 'var(--border-subtle)' }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
              Total Registered
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--emerald)' }}>
              {programs.reduce((sum, p) => sum + (p.registeredCount || 0), 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Program Roster Header */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ClipboardList size={20} color="var(--primary)" /> Your Assigned Programs
        </h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.8125rem' }}>
          Under strict role isolation, only programs explicitly delegated to your profile are accessible.
        </p>
      </div>

      {/* Program Cards */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : programs.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No programs assigned yet"
          description="You do not currently have any active program assignments. Please contact the Event Administrator to assign you to a specific competition or program."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {programs.map((prog) => {
            const event = eventsMap[prog.eventId];
            const capacityRatio = prog.capacity > 0 ? ((prog.registeredCount || 0) / prog.capacity) * 100 : 0;

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
                onClick={() => navigate(`/coordinator/programs/${prog.id}`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
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
                      {event ? `${event.name} (${event.code})` : 'Assigned Fest'}
                    </span>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <Badge status={prog.status} />
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background:
                            prog.status === 'REGISTRATION_OPEN'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'rgba(255, 255, 255, 0.05)',
                          color: prog.status === 'REGISTRATION_OPEN' ? 'var(--emerald)' : 'var(--text-dim)',
                          border: `1px solid ${
                            prog.status === 'REGISTRATION_OPEN'
                              ? 'rgba(16, 185, 129, 0.3)'
                              : 'var(--border-subtle)'
                          }`,
                        }}
                      >
                        {prog.status === 'REGISTRATION_OPEN' ? 'Reg Open' : 'Reg Closed'}
                      </span>
                    </div>
                  </div>

                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                    {prog.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <code style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>{prog.code}</code>
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

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8125rem', color: 'var(--text-dim)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={15} color="var(--primary)" />
                      <span>{prog.date || 'Date TBD'}</span>
                      {prog.startTime && (
                        <>
                          <Clock size={15} color="var(--primary)" style={{ marginLeft: '6px' }} />
                          <span>{prog.startTime} - {prog.endTime || 'End'}</span>
                        </>
                      )}
                    </div>
                    {prog.venue && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={15} color="var(--primary)" />
                        <span>{prog.venue}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress / Capacity Bar */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={14} /> Capacity / Roster
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {prog.registeredCount || 0} / {prog.capacity}
                    </span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '6px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: '3px',
                      overflow: 'hidden',
                      marginBottom: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, capacityRatio)}%`,
                        height: '100%',
                        background:
                          capacityRatio >= 100
                            ? 'var(--rose)'
                            : capacityRatio >= 80
                            ? 'var(--amber)'
                            : 'var(--grad-primary)',
                        borderRadius: '3px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/coordinator/programs/${prog.id}`);
                      }}
                    >
                      Open Participant Roster <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
