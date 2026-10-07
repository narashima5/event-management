import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Event, Program, DepartmentLeaderboardEntry } from '../../types';
import { Badge } from '../../components/Badge';
import { Skeleton, TableSkeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { Modal } from '../../components/Modal';
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Award,
  Sparkles,
  ArrowRight,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Trophy,
  Medal,
  Crown,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export const PublicEventPage: React.FC = () => {
  const { codeOrSlug } = useParams<{ codeOrSlug?: string }>();
  const [events, setEvents] = useState<Event[]>([]);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [mainView, setMainView] = useState<'PROGRAMS' | 'LEADERBOARD'>('PROGRAMS');

  // Program Results Modal
  const [activeWinnersProgram, setActiveWinnersProgram] = useState<Program | null>(null);
  const [programResults, setProgramResults] = useState<any[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  // Department Leaderboard
  const [eventLeaderboard, setEventLeaderboard] = useState<DepartmentLeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        if (codeOrSlug) {
          const res = await api.getPublicEvent(codeOrSlug);
          setCurrentEvent(res.event);
          setPrograms(res.programs);
        } else {
          const eventList = await api.getPublicEvents();
          setEvents(eventList);
          if (eventList.length > 0) {
            const first = eventList[0];
            const res = await api.getPublicEvent(first.code);
            setCurrentEvent(res.event);
            setPrograms(res.programs);
          }
        }
      } catch (err) {
        console.error('Failed to load public event data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [codeOrSlug]);

  useEffect(() => {
    if (mainView === 'LEADERBOARD' && currentEvent) {
      setLoadingLeaderboard(true);
      api
        .getDepartmentLeaderboard(currentEvent.id)
        .then((data) => setEventLeaderboard(data))
        .catch((err) => console.error(err))
        .finally(() => setLoadingLeaderboard(false));
    }
  }, [mainView, currentEvent]);

  const handleOpenWinners = async (prog: Program) => {
    setActiveWinnersProgram(prog);
    setLoadingResults(true);
    try {
      const data = await api.getPublicProgramResults(prog.id);
      setProgramResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingResults(false);
    }
  };

  const categories = ['ALL', ...Array.from(new Set(programs.map((p) => p.category)))];
  const filteredPrograms =
    selectedCategory === 'ALL'
      ? programs
      : programs.filter((p) => p.category === selectedCategory);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Public Header Bar */}
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
            <Sparkles size={20} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 800 }}>CampusPulse</h1>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-dim)' }}>Student Festivals Portal</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/results" className="btn btn-secondary btn-sm" style={{ borderColor: 'rgba(245, 158, 11, 0.4)' }}>
            <Trophy size={14} color="var(--amber)" /> Official Results
          </Link>
          <Link to="/lookup" className="btn btn-outline btn-sm">
            <Search size={14} /> Find My Registration
          </Link>
          <Link to="/login" className="btn btn-primary btn-sm">
            Staff Sign In
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '32px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {loading ? (
          <div>
            <Skeleton height="260px" borderRadius="var(--radius-xl)" style={{ marginBottom: '32px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              <Skeleton height="220px" borderRadius="var(--radius-lg)" />
              <Skeleton height="220px" borderRadius="var(--radius-lg)" />
              <Skeleton height="220px" borderRadius="var(--radius-lg)" />
            </div>
          </div>
        ) : !currentEvent ? (
          <EmptyState
            title="No Published Events Found"
            description="There are currently no active public events or registrations scheduled."
          />
        ) : (
          <>
            {/* Event Hero Showcase Banner */}
            <div
              className="glass-card"
              style={{
                padding: '36px',
                marginBottom: '36px',
                background: `linear-gradient(180deg, rgba(19, 27, 46, 0.7) 0%, rgba(8, 11, 17, 0.95) 100%), url(${currentEvent.bannerUrl || ''}) center/cover no-repeat`,
                border: '1px solid var(--border-card)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span className="badge badge-primary">{currentEvent.code}</span>
                <Badge status={currentEvent.status} />
              </div>

              <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '16px', lineHeight: 1.15 }}>
                {currentEvent.name}
              </h2>

              <p style={{ color: 'var(--text-muted)', fontSize: '1.0625rem', maxWidth: '750px', marginBottom: '24px', lineHeight: 1.6 }}>
                {currentEvent.description}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '0.875rem' }}>
                  <MapPin size={18} color="var(--primary)" />
                  <span>{currentEvent.venue}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '0.875rem' }}>
                  <Calendar size={18} color="var(--cyan)" />
                  <span>
                    {new Date(currentEvent.startDate).toLocaleDateString()} - {new Date(currentEvent.endDate).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '0.875rem' }}>
                  <Clock size={18} color="var(--emerald)" />
                  <span>Registration Closes: {new Date(currentEvent.registrationEnd).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Portal Section Switcher Tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', gap: '4px' }}>
                <button
                  onClick={() => setMainView('PROGRAMS')}
                  className={`btn btn-sm ${mainView === 'PROGRAMS' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ border: 'none' }}
                >
                  <Award size={14} /> Competitions & Registrations
                </button>
                <button
                  onClick={() => setMainView('LEADERBOARD')}
                  className={`btn btn-sm ${mainView === 'LEADERBOARD' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ border: 'none' }}
                >
                  <Trophy size={14} /> 🏆 Live Championship Standings
                </button>
              </div>

              {mainView === 'PROGRAMS' && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* VIEW 1: COMPETITIONS & REGISTRATIONS */}
            {mainView === 'PROGRAMS' && (
              <div>
                {filteredPrograms.length === 0 ? (
                  <EmptyState
                    title="No Competitions Found"
                    description={`No programs found in category '${selectedCategory}'.`}
                  />
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                      gap: '24px',
                    }}
                  >
                    {filteredPrograms.map((prog) => {
                      const isRegOpen = prog.status === 'REGISTRATION_OPEN';
                      const isFull = (prog.registeredCount || 0) >= prog.capacity;
                      const hasResults = prog.status === 'RESULTS_PUBLISHED';

                      return (
                        <div
                          key={prog.id}
                          className="glass-card interactive"
                          style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                              <span className="badge badge-primary">{prog.category}</span>
                              <Badge status={prog.status} />
                            </div>

                            <h4 style={{ fontSize: '1.25rem', marginBottom: '10px' }}>{prog.name}</h4>

                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '16px' }}>
                              {prog.description}
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8125rem', color: 'var(--text-dim)', marginBottom: '20px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <MapPin size={15} /> {prog.venue}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Calendar size={15} /> {prog.date} ({prog.startTime} - {prog.endTime})
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Users size={15} /> {prog.participationType} &bull; Capacity: {prog.registeredCount || 0} / {prog.capacity}
                              </div>
                            </div>
                          </div>

                          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                            {hasResults ? (
                              <button
                                onClick={() => handleOpenWinners(prog)}
                                className="btn btn-secondary btn-sm"
                                style={{
                                  width: '100%',
                                  borderColor: 'rgba(245, 158, 11, 0.4)',
                                  background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.12), rgba(255, 255, 255, 0.02))',
                                  color: 'var(--amber)',
                                }}
                              >
                                <Trophy size={14} /> View Official Results & Podium
                              </button>
                            ) : isRegOpen && !isFull ? (
                              <Link
                                to={`/register/${currentEvent.code}/${prog.code}`}
                                className="btn btn-primary btn-sm"
                                style={{ width: '100%' }}
                              >
                                Register Online <ArrowRight size={15} />
                              </Link>
                            ) : isFull ? (
                              <button className="btn btn-secondary btn-sm" disabled style={{ width: '100%' }}>
                                Capacity Reached
                              </button>
                            ) : (
                              <button className="btn btn-secondary btn-sm" disabled style={{ width: '100%' }}>
                                Registration Closed
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* VIEW 2: LIVE CHAMPIONSHIP LEADERBOARD */}
            {mainView === 'LEADERBOARD' && (
              <div className="glass-card" style={{ padding: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.375rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Trophy size={24} color="var(--amber)" /> {currentEvent.name} — Department Standings
                    </h3>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
                      Aggregated fest points: 1st = 5 pts, 2nd = 3 pts, 3rd = 1 pt
                    </p>
                  </div>
                </div>

                {loadingLeaderboard ? (
                  <TableSkeleton rows={5} columns={5} />
                ) : eventLeaderboard.length === 0 ? (
                  <EmptyState
                    icon={Trophy}
                    title="No Points Awarded Yet"
                    description="Official department rankings will be updated live as competition juries finish and publish scores."
                  />
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Department</th>
                          <th>Gold Medals (1st)</th>
                          <th>Silver Medals (2nd)</th>
                          <th>Bronze Medals (3rd)</th>
                          <th>Total Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eventLeaderboard.map((item, index) => (
                          <tr key={item.department}>
                            <td>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  fontWeight: 800,
                                  fontSize: '0.875rem',
                                  background: index === 0 ? 'var(--grad-primary)' : 'rgba(255, 255, 255, 0.05)',
                                  color: index === 0 ? 'white' : 'var(--text-dim)',
                                }}
                              >
                                {index + 1}
                              </span>
                            </td>
                            <td>
                              <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
                                {item.department}
                              </strong>
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
                              <strong style={{ fontSize: '1.25rem', color: '#818cf8' }}>
                                {item.totalPoints} pts
                              </strong>
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

      {/* Program Official Results Modal */}
      <Modal
        isOpen={Boolean(activeWinnersProgram)}
        onClose={() => setActiveWinnersProgram(null)}
        title={`Official Results — ${activeWinnersProgram?.name || 'Competition'}`}
      >
        <div>
          <div style={{ marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span className="badge badge-success">Results Sealed & Verified</span>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', marginTop: '6px' }}>
              Evaluated by official jury panel &bull; Category: {activeWinnersProgram?.category}
            </p>
          </div>

          {loadingResults ? (
            <TableSkeleton rows={3} columns={4} />
          ) : programResults.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '24px' }}>
              No result rankings available.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {programResults.map((res: any) => {
                const isGold = res.rank === 1;
                const isSilver = res.rank === 2;
                const isBronze = res.rank === 3;

                return (
                  <div
                    key={res.rank}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      background: isGold
                        ? 'linear-gradient(90deg, rgba(245, 158, 11, 0.15), rgba(255, 255, 255, 0.02))'
                        : isSilver
                        ? 'linear-gradient(90deg, rgba(148, 163, 184, 0.15), rgba(255, 255, 255, 0.02))'
                        : isBronze
                        ? 'linear-gradient(90deg, rgba(217, 119, 6, 0.15), rgba(255, 255, 255, 0.02))'
                        : 'rgba(255, 255, 255, 0.03)',
                      border: isGold ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '1.125rem',
                          background: isGold ? '#f59e0b' : isSilver ? '#94a3b8' : isBronze ? '#d97706' : 'rgba(255,255,255,0.06)',
                          color: isGold || isSilver || isBronze ? '#080b11' : 'var(--text-muted)',
                        }}
                      >
                        {isGold ? '🥇' : isSilver ? '🥈' : isBronze ? '🥉' : `#${res.rank}`}
                      </div>

                      <div>
                        <strong style={{ fontSize: '1.0625rem', color: 'var(--text-main)', display: 'block' }}>
                          {res.participantName}
                        </strong>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-dim)' }}>
                          {res.department} &bull; {res.position}
                        </span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        {res.averageScore} pts
                      </span>
                      <span className="badge badge-success" style={{ display: 'block', marginTop: '4px', fontSize: '0.6875rem' }}>
                        +{res.pointsAwarded} Fest Points
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

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
