import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Skeleton } from '../../components/Skeleton';
import { DashboardAnalyticsData } from '../../types';
import {
  Calendar,
  Layers,
  Users,
  Trophy,
  PlusCircle,
  FileSpreadsheet,
  TrendingUp,
  UserCheck,
  CheckCircle2,
  Clock,
  Award,
  BarChart3,
  CheckSquare,
  ShieldAlert,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div>
      {/* Title & Quick Actions Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Executive Overview</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
            System-wide analytics, operational metrics, and event intelligence
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link to="/admin/events" className="btn btn-primary btn-sm">
            <PlusCircle size={15} /> Create Event
          </Link>
          <Link to="/admin/programs" className="btn btn-secondary btn-sm">
            <Layers size={15} /> Create Program
          </Link>
          <Link to="/admin/reports" className="btn btn-secondary btn-sm">
            <FileSpreadsheet size={15} /> Reporting Center
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid (6 Required Metrics) */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height="120px" borderRadius="var(--radius-lg)" />
          ))}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          {/* Card 1: Total & Active Events */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', fontWeight: 600 }}>Total Events</span>
              <div style={{ padding: '8px', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)' }}>
                <Calendar size={18} />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {stats?.kpis.totalEvents || 0}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--emerald)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
              <CheckCircle2 size={13} /> {stats?.kpis.activeEvents || 0} active / scheduled
            </span>
          </div>

          {/* Card 2: Total Programs */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', fontWeight: 600 }}>Total Programs</span>
              <div style={{ padding: '8px', borderRadius: 'var(--radius-md)', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--cyan)' }}>
                <Layers size={18} />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {stats?.kpis.totalPrograms || 0}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
              <Clock size={13} /> {stats?.kpis.openRegistrations || 0} open for registration
            </span>
          </div>

          {/* Card 3: Total Registrations */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', fontWeight: 600 }}>Total Registrations</span>
              <div style={{ padding: '8px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--emerald)' }}>
                <Users size={18} />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {stats?.kpis.totalRegistrations || 0}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
              Across all festivals
            </span>
          </div>

          {/* Card 4: Active Registrations */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', fontWeight: 600 }}>Active Registrations</span>
              <div style={{ padding: '8px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--emerald)' }}>
                <UserCheck size={18} />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--emerald)' }}>
              {stats?.kpis.activeRegistrations || 0}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--emerald)', marginTop: '4px', display: 'block' }}>
              Confirmed enrollment
            </span>
          </div>

          {/* Card 5: Completed Programs */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', fontWeight: 600 }}>Completed Programs</span>
              <div style={{ padding: '8px', borderRadius: 'var(--radius-md)', background: 'rgba(168, 85, 247, 0.15)', color: 'var(--purple)' }}>
                <CheckSquare size={18} />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {stats?.kpis.completedPrograms || 0}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
              Concluded events
            </span>
          </div>

          {/* Card 6: Results Published */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', fontWeight: 600 }}>Results Published</span>
              <div style={{ padding: '8px', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--amber)' }}>
                <Trophy size={18} />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--amber)' }}>
              {stats?.kpis.resultsPublished || 0}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
              {stats?.kpis.publishedWinners || 0} podium winners
            </span>
          </div>
        </div>
      )}

      {/* Analytics Breakdown Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* Registrations by Program */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={18} color="var(--primary)" /> Registrations by Program
          </h3>

          {loading ? (
            <Skeleton height="180px" />
          ) : stats?.charts.registrationsByProgram && stats.charts.registrationsByProgram.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {stats.charts.registrationsByProgram.slice(0, 6).map((prog) => {
                const total = stats.kpis.totalRegistrations || 1;
                const pct = Math.min(100, Math.round((prog.count / total) * 100));

                return (
                  <div key={prog.programId}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{prog.programName}</span>
                      <span style={{ color: 'var(--text-dim)' }}>{prog.count} registered ({pct}%)</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.max(5, pct)}%`,
                          background: 'linear-gradient(90deg, var(--primary) 0%, var(--cyan) 100%)',
                          borderRadius: '4px',
                          transition: 'width 0.6s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>No registrations recorded yet.</p>
          )}
        </div>

        {/* Registrations by Department */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="var(--cyan)" /> Registrations by Department
          </h3>

          {loading ? (
            <Skeleton height="180px" />
          ) : stats?.charts.registrationsByDepartment &&
            Object.keys(stats.charts.registrationsByDepartment).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {Object.entries(stats.charts.registrationsByDepartment).map(([dept, count]: any) => {
                const total = stats.kpis.totalRegistrations || 1;
                const pct = Math.round((count / total) * 100);

                return (
                  <div key={dept}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600 }}>{dept}</span>
                      <span style={{ color: 'var(--text-dim)' }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.max(5, pct)}%`,
                          background: 'linear-gradient(90deg, #06b6d4 0%, #10b981 100%)',
                          borderRadius: '4px',
                          transition: 'width 0.6s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>No department data recorded yet.</p>
          )}
        </div>
      </div>

      {/* Registration Velocity Trends Chart */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '32px' }}>
        <h3 style={{ fontSize: '1.125rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={18} color="var(--amber)" /> Daily Registration Trends
        </h3>

        {loading ? (
          <Skeleton height="140px" />
        ) : stats?.charts.registrationTrends && stats.charts.registrationTrends.length > 0 ? (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '12px',
                height: '130px',
                paddingTop: '20px',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              {stats.charts.registrationTrends.map((trend) => {
                const max = Math.max(...stats.charts.registrationTrends.map((t) => t.count), 1);
                const heightPct = Math.max(15, Math.round((trend.count / max) * 100));

                return (
                  <div
                    key={trend.date}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      height: '100%',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--amber)' }}>
                      {trend.count}
                    </span>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: '40px',
                        height: `${heightPct}%`,
                        background: 'linear-gradient(180deg, var(--amber) 0%, rgba(245, 158, 11, 0.3) 100%)',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.4s ease',
                      }}
                    />
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                      {trend.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '8px', textAlign: 'right' }}>
              Registration timeline activity
            </p>
          </div>
        ) : (
          <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>No trend data recorded yet.</p>
        )}
      </div>

      {/* Reports Directory Launchpad (8 Reports Required in Phase 8) */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.125rem', marginBottom: '8px' }}>Administrative Reporting System</h3>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem', marginBottom: '20px' }}>
          Access all 8 authoritative administrative reports with server-side CSV, Excel (.xls), and print exports
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          <Link
            to="/admin/reports?tab=participants"
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-subtle)',
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              transition: 'background 0.2s',
            }}
          >
            <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)' }}>
              <Users size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>1. Participant Report</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Multi-attribute filters & roster query</div>
            </div>
          </Link>

          <Link
            to="/admin/reports?tab=program-reg"
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-subtle)',
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--cyan)' }}>
              <Layers size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>2. Program Registration</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Capacities & attendance rates</div>
            </div>
          </Link>

          <Link
            to="/admin/reports?tab=event-reg"
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-subtle)',
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--emerald)' }}>
              <Calendar size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>3. Event Registration</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Festival turnout & enrollments</div>
            </div>
          </Link>

          <Link
            to="/admin/reports?tab=program-winners"
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-subtle)',
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--amber)' }}>
              <Trophy size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>4. Program Winners</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Official competition ranks & medals</div>
            </div>
          </Link>

          <Link
            to="/admin/reports?tab=event-winners"
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-subtle)',
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--rose)' }}>
              <Award size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>5. Event Winners</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Festival-wide podium rollup</div>
            </div>
          </Link>

          <Link
            to="/admin/reports?tab=dept-leaderboard"
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-subtle)',
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.15)', color: 'var(--purple)' }}>
              <BarChart3 size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>6. Department Leaderboard</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Institutional point standings</div>
            </div>
          </Link>

          <Link
            to="/admin/reports?tab=overall-leaderboard"
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-subtle)',
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary)' }}>
              <Trophy size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>7. Overall Leaderboard</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Cross-festival champions</div>
            </div>
          </Link>

          <Link
            to="/admin/reports?tab=jury-scoring"
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-subtle)',
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--amber)' }}>
              <ShieldAlert size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>8. Jury Scoring Audit</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Judge evaluations & criteria logs</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};
