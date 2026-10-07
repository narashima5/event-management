import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import {
  Program,
  Event,
  CreateProgramInput,
  ProgramStatuses,
  RegistrationField,
  ScoringCriterion,
  ParticipationTypes,
  DefaultCategories,
} from '../../types';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { useToast } from '../../contexts/ToastContext';
import {
  Layers,
  PlusCircle,
  Edit2,
  Trash2,
  Users,
  MapPin,
  Calendar,
  CheckCircle2,
  Settings,
  Sliders,
  Eye,
} from 'lucide-react';

export const AdminProgramsPage: React.FC = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'fields' | 'scoring'>('details');
  const toast = useToast();

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<CreateProgramInput>({
    eventId: '',
    name: '',
    code: '',
    slug: '',
    description: '',
    category: 'Cultural',
    participationType: 'INDIVIDUAL',
    venue: '',
    date: '2027-03-15',
    startTime: '10:00 AM',
    endTime: '01:00 PM',
    capacity: 40,
    status: 'REGISTRATION_OPEN',
    registrationStart: '2026-09-01T00:00:00Z',
    registrationEnd: '2027-03-10T23:59:59Z',
    rules: '',
    instructions: '',
    registrationFields: [
      { id: 'f1', name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'e.g. Student Name' },
      { id: 'f2', name: 'registerNumber', label: 'Student Register Number', type: 'text', required: true, placeholder: 'e.g. 23CS001' },
      { id: 'f3', name: 'department', label: 'Department', type: 'select', required: true, options: ['Computer Science', 'Fine Arts', 'Electronics', 'Mechanical'] },
    ],
    scoringConfig: {
      criteria: [
        { id: 'c1', name: 'Execution & Technique', maxScore: 40, weight: 1, description: 'Core technical execution' },
        { id: 'c2', name: 'Creativity & Impact', maxScore: 30, weight: 1, description: 'Originality and audience impact' },
        { id: 'c3', name: 'Presentation & Timing', maxScore: 30, weight: 1, description: 'Stage presentation and rhythm' },
      ],
      totalMaxScore: 100,
      calculationMethod: 'SUM',
      pointsConfig: { firstPlace: 5, secondPlace: 3, thirdPlace: 1 },
      tieBreakerRule: 'Highest score on Execution & Technique',
      isJuryScoreVisibleToCoord: true,
    },
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [progs, evts] = await Promise.all([api.getPrograms(), api.getEvents()]);
      setPrograms(progs);
      setEvents(evts);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load programs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingProgram(null);
    setActiveTab('details');
    setFormData({
      eventId: events[0]?.id || '',
      name: '',
      code: '',
      slug: '',
      description: '',
      category: 'Cultural',
      participationType: 'INDIVIDUAL',
      venue: '',
      date: '2027-03-15',
      startTime: '10:00 AM',
      endTime: '01:00 PM',
      capacity: 40,
      status: 'REGISTRATION_OPEN',
      registrationStart: '2026-09-01T00:00:00Z',
      registrationEnd: '2027-03-10T23:59:59Z',
      rules: '',
      instructions: '',
      registrationFields: [
        { id: 'f1', name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'e.g. Student Name' },
        { id: 'f2', name: 'registerNumber', label: 'Student Register Number', type: 'text', required: true, placeholder: 'e.g. 23CS001' },
        { id: 'f3', name: 'department', label: 'Department', type: 'select', required: true, options: ['Computer Science', 'Fine Arts', 'Electronics', 'Mechanical'] },
      ],
      scoringConfig: {
        criteria: [
          { id: 'c1', name: 'Execution & Technique', maxScore: 40, weight: 1, description: 'Core technical execution' },
          { id: 'c2', name: 'Creativity & Impact', maxScore: 30, weight: 1, description: 'Originality and audience impact' },
          { id: 'c3', name: 'Presentation & Timing', maxScore: 30, weight: 1, description: 'Stage presentation and rhythm' },
        ],
        totalMaxScore: 100,
        calculationMethod: 'SUM',
        pointsConfig: { firstPlace: 5, secondPlace: 3, thirdPlace: 1 },
        tieBreakerRule: 'Highest score on Execution & Technique',
        isJuryScoreVisibleToCoord: true,
      },
    });
    setIsModalOpen(true);
  };

  const openEditModal = (prog: Program) => {
    setEditingProgram(prog);
    setActiveTab('details');
    setFormData({
      eventId: prog.eventId,
      name: prog.name,
      code: prog.code,
      slug: prog.slug,
      description: prog.description,
      category: prog.category,
      participationType: prog.participationType,
      venue: prog.venue,
      date: prog.date,
      startTime: prog.startTime,
      endTime: prog.endTime,
      capacity: prog.capacity,
      status: prog.status,
      registrationStart: prog.registrationStart,
      registrationEnd: prog.registrationEnd,
      rules: prog.rules || '',
      instructions: prog.instructions || '',
      registrationFields: prog.registrationFields || [],
      scoringConfig: prog.scoringConfig,
    });
    setIsModalOpen(true);
  };

  const handleStatusChange = async (programId: string, status: string) => {
    try {
      await api.updateProgramStatus(programId, status);
      toast.success(`Program status updated to ${status}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.eventId) {
      toast.error('Please select an event for this program');
      return;
    }

    setSubmitting(true);
    try {
      if (editingProgram) {
        await api.updateProgram(editingProgram.id, formData);
        toast.success(`Program '${formData.name}' updated!`);
      } else {
        await api.createProgram(formData);
        toast.success(`Program '${formData.name}' created!`);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save program');
    } finally {
      setSubmitting(false);
    }
  };

  // Custom Fields Builder Handlers
  const addField = () => {
    const id = `f_${Date.now()}`;
    setFormData((prev) => ({
      ...prev,
      registrationFields: [
        ...prev.registrationFields,
        { id, name: `custom_${prev.registrationFields.length + 1}`, label: 'New Field', type: 'text', required: true },
      ],
    }));
  };

  const removeField = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      registrationFields: prev.registrationFields.filter((_, i) => i !== index),
    }));
  };

  const updateField = (index: number, updates: Partial<RegistrationField>) => {
    setFormData((prev) => ({
      ...prev,
      registrationFields: prev.registrationFields.map((f, i) => (i === index ? { ...f, ...updates } : f)),
    }));
  };

  // Dynamic Scoring Criteria Builder Handlers
  const addCriterion = () => {
    const id = `crit_${Date.now()}`;
    setFormData((prev) => {
      const nextCrit = [
        ...prev.scoringConfig.criteria,
        { id, name: '', maxScore: 25, weight: 1, description: '' },
      ];
      return {
        ...prev,
        scoringConfig: {
          ...prev.scoringConfig,
          criteria: nextCrit,
          totalMaxScore: nextCrit.reduce((sum, c) => sum + (Number(c.maxScore) || 0), 0),
        },
      };
    });
  };

  const removeCriterion = (index: number) => {
    setFormData((prev) => {
      const nextCrit = prev.scoringConfig.criteria.filter((_, i) => i !== index);
      return {
        ...prev,
        scoringConfig: {
          ...prev.scoringConfig,
          criteria: nextCrit,
          totalMaxScore: nextCrit.reduce((sum, c) => sum + (Number(c.maxScore) || 0), 0),
        },
      };
    });
  };

  const updateCriterion = (index: number, updates: Partial<ScoringCriterion>) => {
    setFormData((prev) => {
      const nextCrit = prev.scoringConfig.criteria.map((c, i) => (i === index ? { ...c, ...updates } : c));
      return {
        ...prev,
        scoringConfig: {
          ...prev.scoringConfig,
          criteria: nextCrit,
          totalMaxScore: nextCrit.reduce((sum, c) => sum + (Number(c.maxScore) || 0), 0),
        },
      };
    });
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Program & Competition Catalog</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
            Configure dynamic registration forms, dynamic scoring criteria, and program status
          </p>
        </div>

        <button onClick={openCreateModal} className="btn btn-primary">
          <PlusCircle size={16} /> Create Program
        </button>
      </div>

      {/* Program Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Program Name</th>
              <th>Category</th>
              <th>Type</th>
              <th>Capacity</th>
              <th>Status</th>
              <th>Schedule</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {programs.map((prog) => {
              return (
                <tr key={prog.id}>
                  <td>
                    <span className="badge badge-primary">{prog.code}</span>
                  </td>
                  <td>
                    <Link
                      to={`/admin/programs/${prog.id}`}
                      style={{ color: 'var(--text-main)', display: 'block', fontWeight: 600, textDecoration: 'none' }}
                    >
                      {prog.name}
                    </Link>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{prog.venue}</span>
                  </td>
                  <td>
                    <span className="badge badge-neutral">{prog.category}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8125rem' }}>{prog.participationType}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      {prog.registeredCount || 0} / {prog.capacity}
                    </span>
                  </td>
                  <td>
                    <select
                      className="form-select"
                      style={{ padding: '4px 8px', fontSize: '0.75rem', width: 'auto' }}
                      value={prog.status}
                      onChange={(e) => handleStatusChange(prog.id, e.target.value)}
                    >
                      {ProgramStatuses.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {prog.date} &bull; {prog.startTime}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <Link
                        to={`/admin/programs/${prog.id}`}
                        className="btn btn-primary btn-sm"
                        title="View Full Program Details & Staff"
                      >
                        <Eye size={13} /> View
                      </Link>
                      <button
                        onClick={() => openEditModal(prog)}
                        className="btn btn-secondary btn-sm"
                        title="Edit Program & Scoring Rules"
                      >
                        <Edit2 size={13} /> Configure
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal with Tabs: Basic Details | Dynamic Fields | Scoring Config */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProgram ? `Configure Program: ${editingProgram.name}` : 'Create New Program'}
        maxWidth="820px"
      >
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`btn btn-sm ${activeTab === 'details' ? 'btn-primary' : 'btn-ghost'}`}
          >
            <Settings size={14} /> General Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fields')}
            className={`btn btn-sm ${activeTab === 'fields' ? 'btn-primary' : 'btn-ghost'}`}
          >
            <Users size={14} /> Custom Registration Fields ({formData.registrationFields.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('scoring')}
            className={`btn btn-sm ${activeTab === 'scoring' ? 'btn-primary' : 'btn-ghost'}`}
          >
            <Sliders size={14} /> Scoring Criteria ({formData.scoringConfig.criteria.length})
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* TAB 1: General Info */}
          {activeTab === 'details' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Parent Event *</label>
                  <select
                    className="form-select"
                    required
                    value={formData.eventId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, eventId: e.target.value }))}
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
                  <label className="form-label">Program Category *</label>
                  <select
                    className="form-select"
                    value={formData.category}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  >
                    {DefaultCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Program Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="e.g. Solo Classical Dance"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        name: e.target.value,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                      }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Program Code *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="e.g. SD"
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
                  rows={2}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Participation Type</label>
                  <select
                    className="form-select"
                    value={formData.participationType}
                    onChange={(e) => setFormData((prev) => ({ ...prev, participationType: e.target.value as any }))}
                  >
                    {ParticipationTypes.map((pt) => (
                      <option key={pt} value={pt}>
                        {pt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Maximum Capacity *</label>
                  <input
                    type="number"
                    className="form-input"
                    required
                    min={1}
                    value={formData.capacity}
                    onChange={(e) => setFormData((prev) => ({ ...prev, capacity: parseInt(e.target.value, 10) }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Status *</label>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as any }))}
                  >
                    {ProgramStatuses.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Venue *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={formData.venue}
                    onChange={(e) => setFormData((prev) => ({ ...prev, venue: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Start Time *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="e.g. 10:00 AM"
                    value={formData.startTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Competition Rules</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Key competition guidelines, timing limits..."
                  value={formData.rules}
                  onChange={(e) => setFormData((prev) => ({ ...prev, rules: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* TAB 2: Dynamic Custom Fields Builder */}
          {activeTab === 'fields' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  Define custom registration fields that public participants must fill for this program.
                </p>
                <button type="button" onClick={addField} className="btn btn-secondary btn-sm">
                  + Add Custom Field
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
                {formData.registrationFields.map((field, idx) => (
                  <div
                    key={field.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px',
                      display: 'grid',
                      gridTemplateColumns: '2fr 1.5fr 1fr auto auto',
                      gap: '12px',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Label</span>
                      <input
                        type="text"
                        className="form-input"
                        value={field.label}
                        onChange={(e) => updateField(idx, { label: e.target.value, name: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_') })}
                      />
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Field Type</span>
                      <select
                        className="form-select"
                        value={field.type}
                        onChange={(e) => updateField(idx, { type: e.target.value as any })}
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="select">Dropdown Select</option>
                        <option value="radio">Radio Buttons</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="date">Date Picker</option>
                        <option value="textarea">Multi-line Text</option>
                        <option value="file">File Upload</option>
                      </select>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Required</span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', marginTop: '6px' }}>
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateField(idx, { required: e.target.checked })}
                        />
                        Mandatory
                      </label>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => removeField(idx)}
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--rose)', marginTop: '16px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Dynamic Scoring Criteria Builder */}
          {activeTab === 'scoring' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0 }}>Dynamic Evaluation Rubric</h4>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.8125rem', margin: '2px 0 0' }}>
                    Each competition can have custom evaluation criteria. Total maximum points are computed dynamically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addCriterion}
                  className="btn btn-primary btn-sm"
                  style={{ background: 'var(--amber)', borderColor: 'var(--amber)', color: '#090a10', fontWeight: 700 }}
                >
                  <PlusCircle size={14} /> Add Criterion
                </button>
              </div>

              {/* Scoring Configuration Meta Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Score Calculation Method</label>
                  <select
                    className="form-control"
                    style={{ fontSize: '0.8125rem' }}
                    value={formData.scoringConfig.calculationMethod}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        scoringConfig: { ...prev.scoringConfig, calculationMethod: e.target.value as any },
                      }))
                    }
                  >
                    <option value="SUM">Sum of Points (Total Score)</option>
                    <option value="AVERAGE">Average Across Judges</option>
                    <option value="WEIGHTED">Weighted Dimension Average</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Calculated Total Max Points</label>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--amber)', lineHeight: '36px' }}>
                    {formData.scoringConfig.criteria.reduce((sum, c) => sum + (Number(c.maxScore) || 0), 0)} pts
                  </div>
                </div>
              </div>

              {formData.scoringConfig.criteria.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 16px', background: 'rgba(255,255,255,0.01)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-subtle)' }}>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem', margin: '0 0 12px' }}>
                    No evaluation criteria defined yet. Each event has different criteria.
                  </p>
                  <button type="button" onClick={addCriterion} className="btn btn-secondary btn-sm">
                    <PlusCircle size={14} /> Add First Criterion
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                  {formData.scoringConfig.criteria.map((crit, idx) => (
                    <div
                      key={crit.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '12px', alignItems: 'center' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Criterion Name *</label>
                          <input
                            type="text"
                            className="form-control"
                            required
                            placeholder="e.g. Technical Execution"
                            value={crit.name}
                            onChange={(e) => updateCriterion(idx, { name: e.target.value })}
                          />
                        </div>

                        <div>
                          <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Max Score *</label>
                          <input
                            type="number"
                            className="form-control"
                            required
                            min={1}
                            max={100}
                            value={crit.maxScore}
                            onChange={(e) => updateCriterion(idx, { maxScore: parseInt(e.target.value, 10) || 0 })}
                          />
                        </div>

                        <div>
                          <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Weight</label>
                          <input
                            type="number"
                            className="form-control"
                            min={0.1}
                            step={0.5}
                            value={crit.weight || 1}
                            onChange={(e) => updateCriterion(idx, { weight: parseFloat(e.target.value) || 1 })}
                          />
                        </div>

                        <div style={{ alignSelf: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => removeCriterion(idx)}
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--rose)', padding: '8px' }}
                            title="Remove criterion"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Optional evaluation guidelines or description..."
                          value={crit.description || ''}
                          onChange={(e) => updateCriterion(idx, { description: e.target.value })}
                          style={{ fontSize: '0.8125rem' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingProgram ? 'Update Program' : 'Create Program'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
