import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Program, Registration, Result, Assignment } from '../../types';
import { Badge } from '../../components/Badge';
import { SkeletonTable, SkeletonCard } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { Modal } from '../../components/Modal';
import { useToast } from '../../contexts/ToastContext';
import {
  ArrowLeft,
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Calendar,
  Eye,
  Trophy,
  ShieldAlert,
  Award,
  BookOpen,
} from 'lucide-react';

export const CoordinatorProgramPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [program, setProgram] = useState<Program | null>(null);
  const [participants, setParticipants] = useState<Registration[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [juryAssignments, setJuryAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected participant detail modal
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);

  // Updating attendance state
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setUnauthorized(false);

      // Fetch program details
      const prog = await api.getProgram(id);
      setProgram(prog);

      // Fetch participants for this program (Backend authorization strictly checks this)
      const parts = await api.getProgramParticipants(id);
      setParticipants(parts);

      // Fetch assigned jury members
      try {
        const assigns = await api.getAssignments({ programId: id, role: 'jury' });
        setJuryAssignments(assigns);
      } catch (e) {
        // Not critical if fails
      }

      // Fetch results if published
      if (prog.status === 'RESULTS_PUBLISHED') {
        try {
          const res = await api.getProgramResults(id);
          setResults(res);
        } catch (e) {
          // Ignore
        }
      }
    } catch (err: any) {
      if (err.status === 403) {
        setUnauthorized(true);
      } else {
        toast.error(`Failed to load program data: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleAttendanceChange = async (regId: string, newStatus: 'PENDING' | 'PRESENT' | 'ABSENT') => {
    try {
      setUpdatingId(regId);
      await api.markAttendance(regId, newStatus);
      setParticipants((prev) =>
        prev.map((p) => (p.id === regId ? { ...p, attendanceStatus: newStatus } : p))
      );
      toast.success(`Check-in status updated to ${newStatus}`);
    } catch (err: any) {
      toast.error(`Could not update attendance: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  if (unauthorized) {
    return (
      <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
        <ShieldAlert size={48} color="var(--rose)" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px' }}>Access Prohibited</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 24px' }}>
          Security Isolation Error: You are not assigned as a Coordinator for this program. You only possess operational access to your explicitly assigned programs.
        </p>
        <button onClick={() => navigate('/coordinator/dashboard')} className="btn btn-primary">
          <ArrowLeft size={16} /> Return to Coordinator Dashboard
        </button>
      </div>
    );
  }

  const filteredParticipants = participants.filter((p) => {
    if (attendanceFilter && p.attendanceStatus !== attendanceFilter) return false;
    if (statusFilter && p.status !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const num = p.registrationNumber.toLowerCase();
      const name = (p.participantData?.name || p.participantData?.teamName || '').toLowerCase();
      const dept = (p.participantData?.department || '').toLowerCase();
      const phone = (p.participantData?.phone || '').toLowerCase();
      if (!num.includes(term) && !name.includes(term) && !dept.includes(term) && !phone.includes(term)) {
        return false;
      }
    }
    return true;
  });

  const presentCount = participants.filter((p) => p.attendanceStatus === 'PRESENT').length;
  const pendingCount = participants.filter((p) => p.attendanceStatus === 'PENDING').length;
  const absentCount = participants.filter((p) => p.attendanceStatus === 'ABSENT').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Back button & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate('/coordinator/dashboard')} className="btn btn-ghost btn-sm">
          <ArrowLeft size={16} /> All Programs
        </button>
      </div>

      {loading || !program ? (
        <SkeletonCard />
      ) : (
        <>
          {/* Header Details Card */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{program.name}</h1>
                  <Badge status={program.status} />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  <span>Code: <code style={{ color: 'var(--primary)' }}>{program.code}</code></span>
                  <span>•</span>
                  <span>Category: <strong style={{ textTransform: 'capitalize' }}>{program.category}</strong></span>
                  <span>•</span>
                  <span>Type: <strong style={{ textTransform: 'capitalize' }}>{program.participationType}</strong></span>
                  {program.venue && (
                    <>
                      <span>•</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={14} color="var(--primary)" /> {program.venue}
                      </span>
                    </>
                  )}
                  {program.date && (
                    <>
                      <span>•</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={14} color="var(--primary)" /> {program.date} ({program.startTime || 'TBD'} - {program.endTime || 'End'})
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Attendance Quick Stats */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="card" style={{ padding: '8px 16px', minWidth: '90px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Registered</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>{participants.length}</div>
                </div>
                <div className="card" style={{ padding: '8px 16px', minWidth: '90px', textAlign: 'center', background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--emerald)', textTransform: 'uppercase' }}>Present</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--emerald)' }}>{presentCount}</div>
                </div>
                <div className="card" style={{ padding: '8px 16px', minWidth: '90px', textAlign: 'center', background: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.2)' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--amber)', textTransform: 'uppercase' }}>Pending</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--amber)' }}>{pendingCount}</div>
                </div>
                <div className="card" style={{ padding: '8px 16px', minWidth: '90px', textAlign: 'center', background: 'rgba(244, 63, 94, 0.08)', borderColor: 'rgba(244, 63, 94, 0.2)' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--rose)', textTransform: 'uppercase' }}>Absent</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--rose)' }}>{absentCount}</div>
                </div>
              </div>
            </div>

            {/* Rules / Operational Notes */}
            {program.rules && (
              <div style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginTop: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '4px' }}>
                  <BookOpen size={15} /> Competition Guidelines & Rules
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0, whiteSpace: 'pre-line' }}>
                  {program.rules}
                </p>
              </div>
            )}
          </div>

          {/* Published Results Section (if available) */}
          {results.length > 0 && (
            <div className="card" style={{ padding: '20px', border: '1px solid rgba(245, 158, 11, 0.3)', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05), transparent)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Trophy size={20} color="var(--amber)" />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--amber)' }}>Official Published Winners</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                {results.slice(0, 3).map((res) => (
                  <div key={res.id} style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: res.rank === 1 ? 'var(--amber)' : res.rank === 2 ? '#cbd5e1' : '#d97706' }}>
                        RANK #{res.rank} ({res.position})
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary)' }}>
                        {res.totalScore.toFixed(1)} pts
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{res.participantName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{res.department} • {res.registrationNumber}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Participant Roster Table & Check-in Desk */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} color="var(--primary)" /> Participant Check-In & Roster
                </h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Mark attendance in real-time as participants arrive at the venue.
                </span>
              </div>

              {/* Filter controls */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search name, reg #, dept..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ paddingLeft: '32px', fontSize: '0.8125rem', width: '220px' }}
                  />
                </div>

                <select
                  className="form-control"
                  style={{ fontSize: '0.8125rem', width: '130px' }}
                  value={attendanceFilter}
                  onChange={(e) => setAttendanceFilter(e.target.value)}
                >
                  <option value="">All Check-ins</option>
                  <option value="PRESENT">Present</option>
                  <option value="PENDING">Pending</option>
                  <option value="ABSENT">Absent</option>
                </select>

                <select
                  className="form-control"
                  style={{ fontSize: '0.8125rem', width: '130px' }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="DISQUALIFIED">Disqualified</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            {filteredParticipants.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No participants found"
                description={searchTerm || attendanceFilter ? 'Try clearing your search filters.' : 'No participants have registered for this program yet.'}
              />
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Reg Number</th>
                      <th>Participant / Team</th>
                      <th>Dept & Info</th>
                      <th>Reg Date</th>
                      <th>Reg Status</th>
                      <th>Check-in Action</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParticipants.map((reg) => {
                      const isUpdating = updatingId === reg.id;
                      const pName = reg.participantData?.name || reg.participantData?.teamName || 'Unknown';
                      const pDept = reg.participantData?.department || 'N/A';
                      const pPhone = reg.participantData?.phone || 'N/A';

                      return (
                        <tr key={reg.id}>
                          <td>
                            <code style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)' }}>
                              {reg.registrationNumber}
                            </code>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.875rem' }}>
                              {pName}
                            </div>
                            {reg.participantType === 'TEAM' && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                Team ({reg.participantData?.teamMembers?.length || 1} members)
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ fontSize: '0.8125rem' }}>{pDept}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{pPhone}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                              {new Date(reg.registeredAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td>
                            <Badge status={reg.status} />
                          </td>
                          <td>
                            {/* Attendance Segmented Toggle */}
                            <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)', padding: '2px', gap: '2px' }}>
                              <button
                                disabled={isUpdating}
                                onClick={() => handleAttendanceChange(reg.id, 'PRESENT')}
                                style={{
                                  border: 'none',
                                  padding: '4px 10px',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  background: reg.attendanceStatus === 'PRESENT' ? 'var(--emerald)' : 'transparent',
                                  color: reg.attendanceStatus === 'PRESENT' ? 'white' : 'var(--text-muted)',
                                }}
                                title="Mark Present"
                              >
                                Present
                              </button>
                              <button
                                disabled={isUpdating}
                                onClick={() => handleAttendanceChange(reg.id, 'PENDING')}
                                style={{
                                  border: 'none',
                                  padding: '4px 10px',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  background: reg.attendanceStatus === 'PENDING' ? 'var(--amber)' : 'transparent',
                                  color: reg.attendanceStatus === 'PENDING' ? 'white' : 'var(--text-muted)',
                                }}
                                title="Mark Pending"
                              >
                                Pending
                              </button>
                              <button
                                disabled={isUpdating}
                                onClick={() => handleAttendanceChange(reg.id, 'ABSENT')}
                                style={{
                                  border: 'none',
                                  padding: '4px 10px',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  background: reg.attendanceStatus === 'ABSENT' ? 'var(--rose)' : 'transparent',
                                  color: reg.attendanceStatus === 'ABSENT' ? 'white' : 'var(--text-muted)',
                                }}
                                title="Mark Absent"
                              >
                                Absent
                              </button>
                            </div>
                          </td>
                          <td>
                            <button
                              onClick={() => setSelectedReg(reg)}
                              className="btn btn-ghost btn-sm"
                              title="View Participant Profile"
                            >
                              <Eye size={15} /> Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Participant Details Modal */}
      {selectedReg && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedReg(null)}
          title={`Registration Profile: ${selectedReg.registrationNumber}`}
          maxWidth="640px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  {selectedReg.participantData?.name || selectedReg.participantData?.teamName}
                </h3>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-dim)' }}>
                  Registered on {new Date(selectedReg.registeredAt).toLocaleString()}
                </span>
              </div>
              <Badge status={selectedReg.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Department</span>
                <div style={{ fontWeight: 600 }}>{selectedReg.participantData?.department || 'N/A'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Register / Roll #</span>
                <div style={{ fontWeight: 600 }}>{selectedReg.participantData?.registerNumber || 'N/A'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Email</span>
                <div style={{ fontWeight: 600 }}>{selectedReg.participantData?.email || 'N/A'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Phone</span>
                <div style={{ fontWeight: 600 }}>{selectedReg.participantData?.phone || 'N/A'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Attendance</span>
                <div>
                  <Badge status={selectedReg.attendanceStatus} />
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Participation Type</span>
                <div style={{ textTransform: 'capitalize', fontWeight: 600 }}>{selectedReg.participantType}</div>
              </div>
            </div>

            {/* Custom fields if present */}
            {selectedReg.participantData && (
              <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-dim)' }}>
                  Additional Form Submissions
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {Object.entries(selectedReg.participantData)
                    .filter(([k]) => !['name', 'teamName', 'department', 'registerNumber', 'email', 'phone', 'teamMembers'].includes(k))
                    .map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '0.8125rem' }}>
                        <span style={{ color: 'var(--text-dim)', textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1')}</span>
                        <span style={{ fontWeight: 500 }}>{String(v)}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Team Members List */}
            {selectedReg.participantData?.teamMembers && (
              <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-dim)' }}>
                  Team Members
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedReg.participantData.teamMembers.map((m: any, idx: number) => (
                    <div key={idx} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', fontSize: '0.8125rem' }}>
                      <strong>{m.name || m}</strong> {m.registerNumber && `(${m.registerNumber})`} {m.department && `• ${m.department}`}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button onClick={() => setSelectedReg(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
