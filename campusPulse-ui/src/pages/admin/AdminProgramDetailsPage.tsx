import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Program, Event, Assignment, User, ProgramStatus } from '../../types';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { SkeletonCard, TableSkeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { useToast } from '../../contexts/ToastContext';
import {
  ArrowLeft,
  Layers,
  Calendar,
  MapPin,
  Clock,
  Users,
  Award,
  BookOpen,
  PlusCircle,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Trophy,
} from 'lucide-react';

export const AdminProgramDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [program, setProgram] = useState<Program | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Status transition state
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Assign staff modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRole, setAssignRole] = useState<'coordinator' | 'jury'>('coordinator');
  const [assigning, setAssigning] = useState(false);

  const fetchProgramData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const prog = await api.getProgram(id);
      setProgram(prog);

      if (prog.eventId) {
        const ev = await api.getEvent(prog.eventId);
        setEvent(ev);
      }

      const asgns = await api.getAssignments({ programId: id });
      setAssignments(asgns);

      const allUsers = await api.getUsers();
      setUsers(allUsers);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load program details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgramData();
  }, [id]);

  const handleStatusChange = async (newStatus: ProgramStatus) => {
    if (!id) return;
    setUpdatingStatus(true);
    try {
      await api.updateProgramStatus(id, newStatus);
      toast.success(`Program status updated to ${newStatus}`);
      setProgram((prev) => prev ? { ...prev, status: newStatus } : null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !program || !assignUserId) return;
    setAssigning(true);
    try {
      await api.createAssignment({
        userId: assignUserId,
        role: assignRole,
        eventId: program.eventId,
        programId: id,
      });
      toast.success(`Assigned as ${assignRole} successfully!`);
      setIsAssignModalOpen(false);
      setAssignUserId('');
      const updatedAsgns = await api.getAssignments({ programId: id });
      setAssignments(updatedAsgns);
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign staff');
    } finally {
      setAssigning(false);
    }
  };

  const handleDeleteAssignment = async (asgnId: string) => {
    try {
      await api.deleteAssignment(asgnId);
      toast.success('Assignment removed');
      setAssignments((prev) => prev.filter((a) => a.id !== asgnId));
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove assignment');
    }
  };

  if (loading || !program) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <SkeletonCard height="240px" />
        <TableSkeleton rows={4} />
      </div>
    );
  }

  const criteria = program.scoringConfig?.criteria || [];
  const dynamicFields = program.registrationFields || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Back button */}
      <div>
        <button onClick={() => navigate('/admin/programs')} className="btn btn-ghost btn-sm">
          <ArrowLeft size={16} /> Back to Programs
        </button>
      </div>

      {/* Program Details Header Card */}
      <div
        className="card"
        style={{
          padding: '28px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.05))',
          border: '1px solid rgba(99, 102, 241, 0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <code style={{ fontSize: '0.875rem', fontWeight: 800, padding: '2px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', color: 'var(--primary)' }}>
                {program.code}
              </code>
              <Badge status={program.status} />
              {event && (
                <Link
                  to={`/admin/events/${event.id}`}
                  style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', textDecoration: 'none' }}
                >
                  Fest: <strong>{event.name} ({event.code})</strong>
                </Link>
              )}
            </div>

            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>{program.name}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', maxWidth: '720px', lineHeight: 1.5, marginBottom: '16px' }}>
              {program.description || 'No description provided.'}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', fontSize: '0.8125rem', color: 'var(--text-dim)' }}>
              <div>Category: <strong style={{ textTransform: 'capitalize', color: 'var(--text-main)' }}>{program.category}</strong></div>
              <div>Type: <strong style={{ textTransform: 'capitalize', color: 'var(--text-main)' }}>{program.participationType}</strong></div>
              <div>Capacity: <strong style={{ color: 'var(--text-main)' }}>{program.registeredCount || 0} / {program.capacity}</strong></div>
              {program.venue && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={14} color="var(--primary)" />
                  <span>{program.venue}</span>
                </div>
              )}
              {program.date && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={14} color="var(--primary)" />
                  <span>{program.date} ({program.startTime} - {program.endTime})</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick status selector */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>Change Program Status:</span>
            <select
              className="form-control"
              style={{ width: '200px', fontSize: '0.8125rem' }}
              value={program.status}
              disabled={updatingStatus}
              onChange={(e) => handleStatusChange(e.target.value as ProgramStatus)}
            >
              <option value="DRAFT">DRAFT</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="REGISTRATION_OPEN">REGISTRATION_OPEN</option>
              <option value="REGISTRATION_CLOSED">REGISTRATION_CLOSED</option>
              <option value="ONGOING">ONGOING</option>
              <option value="JUDGING">JUDGING</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="RESULTS_PUBLISHED">RESULTS_PUBLISHED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>
        </div>

        {/* Rules & Instructions */}
        {program.rules && (
          <div style={{ marginTop: '20px', padding: '12px 16px', background: 'rgba(0,0,0,0.25)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BookOpen size={14} /> Competition Rules & Instructions
            </div>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)', whiteSpace: 'pre-line' }}>
              {program.rules}
            </p>
          </div>
        )}
      </div>

      {/* Staff Assignments Section */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} color="var(--primary)" /> Assigned Coordinators & Jury Panel
            </h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.8125rem' }}>
              Only staff members assigned below possess operational access to this specific competition.
            </p>
          </div>

          <button onClick={() => setIsAssignModalOpen(true)} className="btn btn-primary btn-sm">
            <PlusCircle size={15} /> Assign Staff Member
          </button>
        </div>

        {assignments.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No staff assigned yet"
            description="Assign coordinators to manage check-in or jury members to evaluate scores for this competition."
            actionLabel="Assign Staff"
            onAction={() => setIsAssignModalOpen(true)}
          />
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Email</th>
                  <th>Assigned Role</th>
                  <th>Assigned Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.userName || a.userId}</strong>
                    </td>
                    <td>{a.userEmail || 'N/A'}</td>
                    <td>
                      <span
                        className={`badge ${a.role === 'coordinator' ? 'badge-warning' : 'badge-primary'}`}
                        style={{ textTransform: 'capitalize' }}
                      >
                        {a.role}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-dim)' }}>
                      {new Date(a.assignedAt).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        onClick={() => handleDeleteAssignment(a.id)}
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--rose)' }}
                        title="Remove assignment"
                      >
                        <Trash2 size={15} /> Unassign
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Scoring Criteria & Dynamic Form Specs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Scoring Rubric Card */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={18} color="var(--amber)" /> Scoring Rubric Criteria ({criteria.length})
          </h3>

          {criteria.length === 0 ? (
            <div style={{ color: 'var(--text-dim)', fontSize: '0.8125rem' }}>No criteria defined.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {criteria.map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.875rem' }}>{c.name}</strong>
                    {c.description && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{c.description}</div>
                    )}
                  </div>
                  <span style={{ fontWeight: 700, color: 'var(--amber)', fontSize: '0.875rem' }}>
                    {c.maxScore} pts
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dynamic Registration Form Fields */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={18} color="var(--cyan)" /> Custom Registration Fields ({dynamicFields.length})
          </h3>

          {dynamicFields.length === 0 ? (
            <div style={{ color: 'var(--text-dim)', fontSize: '0.8125rem' }}>
              Standard fields apply (Name, Roll Number, Department, Phone, Email).
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {dynamicFields.map((f) => (
                <div
                  key={f.id}
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.875rem' }}>{f.label}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      key: <code>{f.name}</code> &bull; type: {f.type}
                    </div>
                  </div>
                  <span className={`badge ${f.required ? 'badge-primary' : 'badge-neutral'}`}>
                    {f.required ? 'Required' : 'Optional'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Assign Staff Modal */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Assign Coordinator or Jury Member" maxWidth="480px">
        <form onSubmit={handleCreateAssignment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Role Delegation *</label>
            <select
              className="form-control"
              value={assignRole}
              onChange={(e) => setAssignRole(e.target.value as any)}
            >
              <option value="coordinator">Program Coordinator</option>
              <option value="jury">Jury Member / Judge</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Staff Member *</label>
            <select
              className="form-control"
              required
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
            >
              <option value="">Select staff member...</option>
              {users
                .filter((u) => u.role === assignRole || u.role === 'admin')
                .map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.name} ({u.email}) - {u.role}
                  </option>
                ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button type="button" onClick={() => setIsAssignModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={assigning || !assignUserId} className="btn btn-primary">
              {assigning ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
