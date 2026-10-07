import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Event, CreateEventInput, EventStatuses } from '../../types';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import {
  Calendar,
  MapPin,
  Clock,
  PlusCircle,
  Edit2,
  Archive,
  ExternalLink,
  Search,
} from 'lucide-react';

export const AdminEventsPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const toast = useToast();

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState<CreateEventInput>({
    name: '',
    code: '',
    slug: '',
    description: '',
    venue: '',
    startDate: '',
    endDate: '',
    registrationStart: '',
    registrationEnd: '',
    status: 'DRAFT',
    contactInfo: '',
    rules: '',
    termsNotes: '',
    logoUrl: '',
    bannerUrl: '',
  });

  // Archive Confirm Dialog State
  const [archiveTarget, setArchiveTarget] = useState<Event | null>(null);
  const [archiving, setArchiving] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await api.getEvents();
      setEvents(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const openCreateModal = () => {
    setEditingEvent(null);
    setFormData({
      name: '',
      code: '',
      slug: '',
      description: '',
      venue: '',
      startDate: '2027-03-15T09:00:00Z',
      endDate: '2027-03-18T18:00:00Z',
      registrationStart: '2026-09-01T00:00:00Z',
      registrationEnd: '2027-03-10T23:59:59Z',
      status: 'REGISTRATION_OPEN',
      contactInfo: '',
      rules: '',
      termsNotes: '',
      logoUrl: '',
      bannerUrl: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      name: event.name,
      code: event.code,
      slug: event.slug,
      description: event.description,
      venue: event.venue,
      startDate: event.startDate,
      endDate: event.endDate,
      registrationStart: event.registrationStart,
      registrationEnd: event.registrationEnd,
      status: event.status,
      contactInfo: event.contactInfo || '',
      rules: event.rules || '',
      termsNotes: event.termsNotes || '',
      logoUrl: event.logoUrl || '',
      bannerUrl: event.bannerUrl || '',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      if (editingEvent) {
        await api.updateEvent(editingEvent.id, formData);
        toast.success(`Event '${formData.name}' updated successfully!`);
      } else {
        await api.createEvent(formData);
        toast.success(`Event '${formData.name}' created successfully!`);
      }
      setIsModalOpen(false);
      fetchEvents();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save event');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await api.archiveEvent(archiveTarget.id);
      toast.success(`Event '${archiveTarget.name}' archived.`);
      setArchiveTarget(null);
      fetchEvents();
    } catch (err: any) {
      toast.error(err.message || 'Failed to archive event');
    } finally {
      setArchiving(false);
    }
  };

  const filteredEvents = events.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Event Management</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
            Configure multi-day festivals, venue schedules, and registration timelines
          </p>
        </div>

        <button onClick={openCreateModal} className="btn btn-primary">
          <PlusCircle size={16} /> Create Event
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ position: 'relative', maxWidth: '380px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search events by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '38px' }}
          />
          <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      </div>

      {/* Events List Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
        {filteredEvents.map((evt) => (
          <div key={evt.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span className="badge badge-primary">{evt.code}</span>
                <Badge status={evt.status} />
              </div>

              <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>
                <Link to={`/admin/events/${evt.id}`} style={{ color: 'var(--text-main)', textDecoration: 'none' }}>
                  {evt.name}
                </Link>
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '16px' }}>
                {evt.description}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8125rem', color: 'var(--text-dim)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} /> {evt.venue}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={14} /> {new Date(evt.startDate).toLocaleDateString()} - {new Date(evt.endDate).toLocaleDateString()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} /> Reg: {new Date(evt.registrationStart).toLocaleDateString()} &rarr; {new Date(evt.registrationEnd).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', marginTop: '20px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Link to={`/admin/events/${evt.id}`} className="btn btn-primary btn-sm">
                  Manage Event &rarr;
                </Link>
                <button onClick={() => openEditModal(evt)} className="btn btn-secondary btn-sm">
                  <Edit2 size={14} /> Edit
                </button>
                <button
                  onClick={() => setArchiveTarget(evt)}
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--rose)' }}
                >
                  <Archive size={14} />
                </button>
              </div>

              <a
                href={`/events/${evt.code}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.75rem' }}
              >
                Public Page <ExternalLink size={12} />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEvent ? `Edit Event: ${editingEvent.name}` : 'Create New Event'}
        maxWidth="680px"
      >
        <form onSubmit={handleFormSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Event Name *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. College Arts Fest 2027"
                value={formData.name}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    name: e.target.value,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                  }));
                }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Event Code *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. ARTS27"
                value={formData.code}
                onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                style={{ textTransform: 'uppercase' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea
              className="form-textarea"
              rows={3}
              required
              placeholder="Detailed description of the festival..."
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Venue *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. Main Auditorium & Amphitheater"
                value={formData.venue}
                onChange={(e) => setFormData((prev) => ({ ...prev, venue: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Status *</label>
              <select
                className="form-select"
                value={formData.status}
                onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as any }))}
              >
                {EventStatuses.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Event Start Date *</label>
              <input
                type="datetime-local"
                className="form-input"
                required
                value={formData.startDate.slice(0, 16)}
                onChange={(e) => setFormData((prev) => ({ ...prev, startDate: new Date(e.target.value).toISOString() }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Event End Date *</label>
              <input
                type="datetime-local"
                className="form-input"
                required
                value={formData.endDate.slice(0, 16)}
                onChange={(e) => setFormData((prev) => ({ ...prev, endDate: new Date(e.target.value).toISOString() }))}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Registration Opens *</label>
              <input
                type="datetime-local"
                className="form-input"
                required
                value={formData.registrationStart.slice(0, 16)}
                onChange={(e) => setFormData((prev) => ({ ...prev, registrationStart: new Date(e.target.value).toISOString() }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Registration Deadline *</label>
              <input
                type="datetime-local"
                className="form-input"
                required
                value={formData.registrationEnd.slice(0, 16)}
                onChange={(e) => setFormData((prev) => ({ ...prev, registrationEnd: new Date(e.target.value).toISOString() }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Contact Information</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. committee@college.edu | +91 98765 43210"
              value={formData.contactInfo}
              onChange={(e) => setFormData((prev) => ({ ...prev, contactInfo: e.target.value }))}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={formSubmitting}>
              {formSubmitting ? 'Saving...' : editingEvent ? 'Update Event' : 'Create Event'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
        title="Archive Event"
        message={`Are you sure you want to archive '${archiveTarget?.name}'? Archived events will no longer appear on public listing portals.`}
        confirmLabel="Archive Event"
        loading={archiving}
      />
    </div>
  );
};
