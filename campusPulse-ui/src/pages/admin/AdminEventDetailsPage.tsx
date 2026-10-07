import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Event, Program, Assignment, EventStatus } from '../../types';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { TableSkeleton, SkeletonCard } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { useToast } from '../../contexts/ToastContext';
import {
  Calendar,
  Award,
  MapPin,
  Clock,
  ArrowLeft,
  PlusCircle,
  Trash2,
  Sliders,
  Edit2,
  Archive,
  Layers,
  Users,
  ExternalLink,
  Mail,
  Phone,
  BookOpen,
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react';

export const AdminEventDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [event, setEvent] = useState<Event | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Status transition state
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Edit Event Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Quick Add Program Modal state
  const [isAddProgramOpen, setIsAddProgramOpen] = useState(false);
  const [newProgData, setNewProgData] = useState({
    name: '',
    code: '',
    category: 'Arts',
    participationType: 'INDIVIDUAL' as 'INDIVIDUAL' | 'TEAM',
    capacity: 50,
    venue: '',
    date: '',
    startTime: '10:00',
    endTime: '13:00',
    description: '',
  });
  const [savingProgram, setSavingProgram] = useState(false);
  const [progCriteria, setProgCriteria] = useState<Array<{ id: string; name: string; maxScore: number; weight?: number; description?: string }>>([
    { id: 'crit_1', name: 'Performance & Execution', maxScore: 50, weight: 1, description: '' },
    { id: 'crit_2', name: 'Presentation & Style', maxScore: 50, weight: 1, description: '' },
  ]);
  const [progCalcMethod, setProgCalcMethod] = useState<'SUM' | 'AVERAGE' | 'WEIGHTED'>('SUM');

  const addProgCriterion = () => {
    setProgCriteria((prev) => [
      ...prev,
      { id: `crit_${Date.now()}`, name: '', maxScore: 25, weight: 1, description: '' }
    ]);
  };

  const removeProgCriterion = (idx: number) => {
    setProgCriteria((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateProgCriterion = (idx: number, updates: any) => {
    setProgCriteria((prev) => prev.map((c, i) => (i === idx ? { ...c, ...updates } : c)));
  };


  const fetchEventData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const eventData = await api.getEvent(id);
      setEvent(eventData);

      const progsData = await api.getPrograms({ eventId: id });
      setPrograms(progsData);

      const asgns = await api.getAssignments();
      const filtered = asgns.filter((a) => a.eventId === id);
      setAssignments(filtered);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();
  }, [id]);

  const handleStatusChange = async (newStatus: EventStatus) => {
    if (!id) return;
    setUpdatingStatus(true);
    try {
      await api.updateEventStatus(id, newStatus);
      toast.success(`Event status transitioned to ${newStatus}`);
      setEvent((prev) => prev ? { ...prev, status: newStatus } : null);
    } catch (err: any) {
      toast.error(err.message || 'Could not update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleOpenEdit = () => {
    if (!event) return;
    setEditFormData({
      name: event.name,
      code: event.code,
      slug: event.slug,
      description: event.description,
      venue: event.venue,
      startDate: event.startDate?.substring(0, 10) || '',
      endDate: event.endDate?.substring(0, 10) || '',
      registrationStart: event.registrationStart?.substring(0, 10) || '',
      registrationEnd: event.registrationEnd?.substring(0, 10) || '',
      status: event.status,
      contactInfo: (event as any).contactInfo || '',
      rules: event.rules || '',
      termsNotes: (event as any).termsNotes || '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSavingEdit(true);
    try {
      const updated = await api.updateEvent(id, {
        ...editFormData,
        startDate: new Date(editFormData.startDate).toISOString(),
        endDate: new Date(editFormData.endDate).toISOString(),
        registrationStart: new Date(editFormData.registrationStart).toISOString(),
        registrationEnd: new Date(editFormData.registrationEnd).toISOString(),
      });
      toast.success('Event details updated successfully!');
      setEvent(updated);
      setIsEditModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update event');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !event) return;
    setSavingProgram(true);
    try {
      await api.createProgram({
        ...newProgData,
        eventId: id,
        slug: `${event.code.toLowerCase()}-${newProgData.code.toLowerCase()}`,
        status: 'REGISTRATION_OPEN',
        registrationStart: event.registrationStart,
        registrationEnd: event.registrationEnd,
        scoringConfig: {
          criteria: progCriteria,
          totalMaxScore: progCriteria.reduce((sum, c) => sum + (Number(c.maxScore) || 0), 0),
          calculationMethod: progCalcMethod,
          pointsConfig: { firstPlace: 5, secondPlace: 3, thirdPlace: 1 },
          tieBreakerRule: 'Highest score on first criterion',
          isJuryScoreVisibleToCoord: true,
        },
        registrationFields: [],
      });
      toast.success(`Program '${newProgData.name}' created inside this event!`);
      setIsAddProgramOpen(false);
      setNewProgData({
        name: '',
        code: '',
        category: 'Arts',
        participationType: 'INDIVIDUAL',
        capacity: 50,
        venue: '',
        date: '',
        startTime: '10:00',
        endTime: '13:00',
        description: '',
      });
      fetchEventData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add program');
    } finally {
      setSavingProgram(false);
    }
  };

  if (loading || !event) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <SkeletonCard height="240px" />
        <TableSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Back button */}
      <div>
        <button onClick={() => navigate('/admin/events')} className="btn btn-ghost btn-sm">
          <ArrowLeft size={16} /> Back to All Events
        </button>
      </div>

      {/* Event Header Banner */}
      <div
        className="card"
        style={{
          padding: '28px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.05))',
          border: '1px solid rgba(99, 102, 241, 0.3)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <code style={{ fontSize: '0.875rem', fontWeight: 800, padding: '2px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', color: 'var(--primary)' }}>
                {event.code}
              </code>
              <Badge status={event.status} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>slug: /{event.slug}</span>
            </div>

            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>{event.name}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', maxWidth: '720px', lineHeight: 1.5, marginBottom: '16px' }}>
              {event.description}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', fontSize: '0.8125rem', color: 'var(--text-dim)' }}>
              {event.venue && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={15} color="var(--primary)" />
                  <span style={{ color: 'var(--text-main)' }}>{event.venue}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={15} color="var(--cyan)" />
                <span>
                  {new Date(event.startDate).toLocaleDateString()} &ndash; {new Date(event.endDate).toLocaleDateString()}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={15} color="var(--emerald)" />
                <span>Registration Closes: {new Date(event.registrationEnd).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={handleOpenEdit} className="btn btn-secondary">
              <Edit2 size={15} /> Edit Event
            </button>
            <Link to={`/events/${event.code}`} target="_blank" className="btn btn-secondary">
              <ExternalLink size={15} /> Public Page
            </Link>
          </div>
        </div>

        {/* Status Lifecycle Quick Action Strip */}
        <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', fontWeight: 600 }}>
            Quick Status Lifecycle Actions:
          </span>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {event.status !== 'PUBLISHED' && (
              <button
                disabled={updatingStatus}
                onClick={() => handleStatusChange('PUBLISHED')}
                className="btn btn-secondary btn-sm"
              >
                Publish Event
              </button>
            )}
            {event.status !== 'REGISTRATION_OPEN' && (
              <button
                disabled={updatingStatus}
                onClick={() => handleStatusChange('REGISTRATION_OPEN')}
                className="btn btn-sm"
                style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--emerald)', border: '1px solid var(--emerald)' }}
              >
                Open Registrations
              </button>
            )}
            {event.status !== 'REGISTRATION_CLOSED' && (
              <button
                disabled={updatingStatus}
                onClick={() => handleStatusChange('REGISTRATION_CLOSED')}
                className="btn btn-secondary btn-sm"
              >
                Close Registrations
              </button>
            )}
            {event.status !== 'COMPLETED' && (
              <button
                disabled={updatingStatus}
                onClick={() => handleStatusChange('COMPLETED')}
                className="btn btn-secondary btn-sm"
              >
                Mark Completed
              </button>
            )}
            {event.status !== 'ARCHIVED' && (
              <button
                disabled={updatingStatus}
                onClick={() => handleStatusChange('ARCHIVED')}
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--rose)' }}
              >
                Archive
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Programs List Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={20} color="var(--primary)" /> Competitions & Programs ({programs.length})
          </h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.8125rem' }}>
            Individual events and competitions hosted under this fest.
          </p>
        </div>

        <button onClick={() => setIsAddProgramOpen(true)} className="btn btn-primary btn-sm">
          <PlusCircle size={15} /> Add Competition
        </button>
      </div>

      {/* Programs Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {programs.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No programs added yet"
            description="Create the first competition or program for this event."
            actionLabel="Add Program"
            onAction={() => setIsAddProgramOpen(true)}
          />
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Program Name</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Capacity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {programs.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <code style={{ color: 'var(--primary)', fontWeight: 700 }}>{p.code}</code>
                    </td>
                    <td>
                      <Link
                        to={`/admin/programs/${p.id}`}
                        style={{ color: 'var(--text-main)', fontWeight: 600, textDecoration: 'none' }}
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td>
                      <span style={{ textTransform: 'capitalize' }}>{p.category}</span>
                    </td>
                    <td>
                      <span style={{ textTransform: 'capitalize' }}>{p.participationType}</span>
                    </td>
                    <td>
                      {p.registeredCount || 0} / {p.capacity}
                    </td>
                    <td>
                      <Badge status={p.status} />
                    </td>
                    <td>
                      <Link to={`/admin/programs/${p.id}`} className="btn btn-secondary btn-sm">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Event Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Event Details" maxWidth="640px">
        <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Event Name *</label>
            <input
              type="text"
              className="form-control"
              required
              value={editFormData.name || ''}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
            />
          </div>

                    <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              rows={3}
              value={editFormData.description || ''}
              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Venue</label>
              <input
                type="text"
                className="form-control"
                value={editFormData.venue || ''}
                onChange={(e) => setEditFormData({ ...editFormData, venue: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-control"
                value={editFormData.status || 'DRAFT'}
                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
              >
                <option value="DRAFT">DRAFT</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="REGISTRATION_OPEN">REGISTRATION_OPEN</option>
                <option value="REGISTRATION_CLOSED">REGISTRATION_CLOSED</option>
                <option value="ONGOING">ONGOING</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-control"
                value={editFormData.startDate || ''}
                onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-control"
                value={editFormData.endDate || ''}
                onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={savingEdit} className="btn btn-primary">
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Competition Modal */}
      <Modal isOpen={isAddProgramOpen} onClose={() => setIsAddProgramOpen(false)} title={`Add Competition to ${event.name}`} maxWidth="600px">
        <form onSubmit={handleCreateProgram} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Program Name *</label>
              <input
                type="text"
                className="form-control"
                required
                placeholder="e.g. Solo Classical Dance"
                value={newProgData.name}
                onChange={(e) => setNewProgData({ ...newProgData, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Code *</label>
              <input
                type="text"
                className="form-control"
                required
                placeholder="e.g. SD"
                value={newProgData.code}
                onChange={(e) => setNewProgData({ ...newProgData, code: e.target.value.toUpperCase() })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-control"
                value={newProgData.category}
                onChange={(e) => setNewProgData({ ...newProgData, category: e.target.value })}
              >
                <option value="Arts">Arts</option>
                <option value="Sports">Sports</option>
                <option value="Technical">Technical</option>
                <option value="Literary">Literary</option>
                <option value="Cultural">Cultural</option>
                <option value="Academic">Academic</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Type</label>
              <select
                className="form-control"
                value={newProgData.participationType}
                onChange={(e) => setNewProgData({ ...newProgData, participationType: e.target.value as any })}
              >
                <option value="INDIVIDUAL">Individual</option>
                <option value="TEAM">Team</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Capacity</label>
              <input
                type="number"
                className="form-control"
                min="1"
                value={newProgData.capacity}
                onChange={(e) => setNewProgData({ ...newProgData, capacity: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Venue</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Auditorium Hall A"
                value={newProgData.venue}
                onChange={(e) => setNewProgData({ ...newProgData, venue: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-control"
                value={newProgData.date}
                onChange={(e) => setNewProgData({ ...newProgData, date: e.target.value })}
              />
            </div>
          </div>

                    {/* Dynamic Evaluation Criteria Section */}
          <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                <label className="form-label" style={{ margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Award size={16} color="var(--amber)" /> Dynamic Evaluation Criteria ({progCriteria.length})
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Total: <strong style={{ color: 'var(--amber)' }}>{progCriteria.reduce((sum, c) => sum + (Number(c.maxScore) || 0), 0)} pts</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={addProgCriterion}
                className="btn btn-secondary btn-sm"
                style={{ borderColor: 'rgba(245, 158, 11, 0.4)', fontSize: '0.75rem' }}
              >
                + Add Criteria
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', marginBottom: '14px' }}>
              {progCriteria.map((c, idx) => (
                <div
                  key={c.id || idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr auto',
                    gap: '8px',
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.02)',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="Criterion Name (e.g. Creativity)"
                    value={c.name}
                    onChange={(e) => updateProgCriterion(idx, { name: e.target.value })}
                    style={{ fontSize: '0.8125rem' }}
                  />
                  <input
                    type="number"
                    className="form-control"
                    required
                    min={1}
                    max={100}
                    placeholder="Max"
                    value={c.maxScore}
                    onChange={(e) => updateProgCriterion(idx, { maxScore: Number(e.target.value) || 0 })}
                    style={{ fontSize: '0.8125rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => removeProgCriterion(idx)}
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--rose)', padding: '6px' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Brief description or eligibility rules..."
              value={newProgData.description}
              onChange={(e) => setNewProgData({ ...newProgData, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button type="button" onClick={() => setIsAddProgramOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={savingProgram} className="btn btn-primary">
              {savingProgram ? 'Adding...' : 'Add Competition'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
