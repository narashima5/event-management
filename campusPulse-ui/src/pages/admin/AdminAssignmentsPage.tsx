import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Assignment, User, Event, Program } from '../../types';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import { UserCheck, PlusCircle, Trash2, Shield, Calendar, Layers } from 'lucide-react';

export const AdminAssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // Create Assignment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'coordinator' | 'jury'>('coordinator');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirm Dialog
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [asgns, usrs, evts, progs] = await Promise.all([
        api.getAssignments(),
        api.getUsers(),
        api.getEvents(),
        api.getPrograms(),
      ]);
      setAssignments(asgns);
      setUsers(usrs);
      setEvents(evts);
      setPrograms(progs);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setSelectedUserId(users[0]?.uid || '');
    setSelectedRole('coordinator');
    setSelectedEventId(events[0]?.id || '');
    const firstEventProgs = programs.filter((p) => p.eventId === events[0]?.id);
    setSelectedProgramId(firstEventProgs[0]?.id || programs[0]?.id || '');
    setIsModalOpen(true);
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !selectedProgramId || !selectedEventId) {
      toast.error('Please complete all assignment selections');
      return;
    }

    setSubmitting(true);
    try {
      await api.createAssignment({
        userId: selectedUserId,
        role: selectedRole,
        eventId: selectedEventId,
        programId: selectedProgramId,
      });
      toast.success('Staff member successfully assigned to program!');
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteAssignment(deleteTarget.id);
      toast.success('Assignment removed successfully');
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove assignment');
    } finally {
      setDeleting(false);
    }
  };

  const availablePrograms = selectedEventId
    ? programs.filter((p) => p.eventId === selectedEventId)
    : programs;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Role Assignments</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
            Map coordinators and jury judges to their strictly authorized programs
          </p>
        </div>

        <button onClick={openCreateModal} className="btn btn-primary">
          <PlusCircle size={16} /> Assign Staff
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Staff Member</th>
              <th>Assigned Role</th>
              <th>Event</th>
              <th>Program</th>
              <th>Status</th>
              <th>Assigned Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((asgn) => {
              const matchedProg = programs.find((p) => p.id === asgn.programId);
              const matchedEvent = events.find((e) => e.id === asgn.eventId);

              return (
                <tr key={asgn.id}>
                  <td>
                    <strong style={{ display: 'block', color: 'var(--text-main)' }}>{asgn.userName}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{asgn.userEmail}</span>
                  </td>
                  <td>
                    <span className={`badge ${asgn.role === 'coordinator' ? 'badge-warning' : 'badge-primary'}`}>
                      {asgn.role}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.875rem' }}>{matchedEvent?.name || asgn.eventId}</td>
                  <td>
                    <strong style={{ color: '#818cf8' }}>{matchedProg?.name || asgn.programId}</strong>
                    {matchedProg && (
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        Code: {matchedProg.code}
                      </span>
                    )}
                  </td>
                  <td>
                    <Badge status={asgn.status} />
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-dim)' }}>
                    {new Date(asgn.assignedAt).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      onClick={() => setDeleteTarget(asgn)}
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--rose)' }}
                      title="Revoke Assignment"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Assign Coordinator or Jury Member"
      >
        <form onSubmit={handleCreateAssignment}>
          <div className="form-group">
            <label className="form-label">Select Staff Member *</label>
            <select
              className="form-select"
              required
              value={selectedUserId}
              onChange={(e) => {
                setSelectedUserId(e.target.value);
                const u = users.find((x) => x.uid === e.target.value);
                if (u && (u.role === 'coordinator' || u.role === 'jury')) {
                  setSelectedRole(u.role);
                }
              }}
            >
              <option value="">-- Select User --</option>
              {users.map((u) => (
                <option key={u.uid} value={u.uid}>
                  {u.name} ({u.role}) - {u.email}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Role for Assignment *</label>
            <select
              className="form-select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as any)}
            >
              <option value="coordinator">Event Coordinator (Roster & Attendance)</option>
              <option value="jury">Jury Member (Scoring & Evaluations)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Target Event *</label>
            <select
              className="form-select"
              required
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                const eventProgs = programs.filter((p) => p.eventId === e.target.value);
                setSelectedProgramId(eventProgs[0]?.id || '');
              }}
            >
              <option value="">-- Select Event --</option>
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.name} ({evt.code})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Authorized Program *</label>
            <select
              className="form-select"
              required
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
            >
              <option value="">-- Select Program --</option>
              {availablePrograms.map((prog) => (
                <option key={prog.id} value={prog.id}>
                  {prog.name} ({prog.code}) - {prog.category}
                </option>
              ))}
            </select>
            <div className="form-hint">
              This staff member will ONLY receive access to this specific program. All other programs remain strictly locked.
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteAssignment}
        title="Revoke Assignment"
        message={`Are you sure you want to remove the assignment of ${deleteTarget?.userName} from this program?`}
        confirmLabel="Revoke"
        loading={deleting}
      />
    </div>
  );
};
