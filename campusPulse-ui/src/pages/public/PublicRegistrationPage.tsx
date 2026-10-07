import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Event, Program, Registration, RegistrationField } from '../../types';
import { Skeleton } from '../../components/Skeleton';
import {
  CheckCircle2,
  Printer,
  Download,
  Copy,
  Sparkles,
  AlertCircle,
  QrCode,
  Calendar,
  MapPin,
  Clock,
  ArrowLeft,
  Users,
  FileText,
  UploadCloud,
  Check,
} from 'lucide-react';

export const PublicRegistrationPage: React.FC = () => {
  const params = useParams<{
    eventSlug?: string;
    programSlug?: string;
    eventCode?: string;
    programCode?: string;
  }>();

  const eventIdentifier = params.eventSlug || params.eventCode || '';
  const programIdentifier = params.programSlug || params.programCode || '';

  const [event, setEvent] = useState<Event | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [teamName, setTeamName] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [teamMembers, setTeamMembers] = useState<Array<{ name: string; registerNumber: string; email: string }>>([
    { name: '', registerNumber: '', email: '' },
  ]);

  // Success Confirmation State
  const [confirmedReg, setConfirmedReg] = useState<Registration | null>(null);

  useEffect(() => {
    const fetchProgramDetails = async () => {
      if (!eventIdentifier || !programIdentifier) return;
      setLoading(true);
      setErrorMsg(null);
      try {
        // Try direct lookup endpoint first
        try {
          const res = await api.getPublicProgramDetails(eventIdentifier, programIdentifier);
          setEvent(res.event);
          setProgram(res.program);
          return;
        } catch {
          // Fallback to getPublicEvent and matching program
          const res = await api.getPublicEvent(eventIdentifier);
          setEvent(res.event);
          const prog = res.programs.find(
            (p) =>
              p.code.toUpperCase() === programIdentifier.toUpperCase() ||
              p.slug.toLowerCase() === programIdentifier.toLowerCase()
          );
          if (!prog) {
            setErrorMsg(`Competition '${programIdentifier}' was not found in event '${eventIdentifier}'`);
          } else {
            setProgram(prog);
          }
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load registration details. Please verify the URL.');
      } finally {
        setLoading(false);
      }
    };

    fetchProgramDetails();
  }, [eventIdentifier, programIdentifier]);

  const handleInputChange = (fieldKey: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldKey]: value }));
    // Clear validation error if user types
    if (fieldErrors[fieldKey]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[fieldKey];
        return next;
      });
    }
  };

  const handleFileUpload = (fieldKey: string, file: File | null) => {
    if (!file) {
      handleInputChange(fieldKey, null);
      return;
    }
    // Read file name and basic metadata
    handleInputChange(fieldKey, {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      lastModified: file.lastModified,
    });
  };

  const handleAddTeamMember = () => {
    setTeamMembers((prev) => [...prev, { name: '', registerNumber: '', email: '' }]);
  };

  const handleRemoveTeamMember = (index: number) => {
    setTeamMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTeamMemberChange = (index: number, key: string, val: string) => {
    setTeamMembers((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [key]: val } : m))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !program) return;

    setSubmitting(true);
    setErrorMsg(null);
    setFieldErrors({});

    // Client-side pre-validation
    const errors: Record<string, string> = {};
    const sortedFields = [...(program.registrationFields || [])].sort(
      (a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0)
    );

    for (const field of sortedFields) {
      const fieldKey = field.key || field.name;
      const val = formData[fieldKey];
      if (field.required) {
        if (val === undefined || val === null || val === '' || (field.type === 'checkbox' && !val)) {
          errors[fieldKey] = `${field.label} is required`;
        }
      }
      if (val && field.validation) {
        try {
          const regex = new RegExp(field.validation);
          if (!regex.test(String(val))) {
            errors[fieldKey] = `${field.label} is invalid`;
          }
        } catch {
          // Ignore regex error
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMsg('Please complete all required fields correctly before submitting.');
      setSubmitting(false);
      return;
    }

    try {
      const payload: any = {
        participantType: program.participationType,
        participantData: {
          ...formData,
          department: department || formData.department,
        },
        department: department || formData.department,
      };

      if (program.participationType === 'TEAM') {
        payload.teamName = teamName || formData.teamName;
        payload.teamMembers = teamMembers.filter((m) => m.name.trim() !== '');
      }

      const result = await api.registerPublic(event.code, program.code, payload);
      setConfirmedReg(result);
    } catch (err: any) {
      if (err.details?.errors) {
        const errMap: Record<string, string> = {};
        for (const item of err.details.errors) {
          const key = item.field.replace('participantData.', '');
          errMap[key] = item.message;
        }
        setFieldErrors(errMap);
      }
      setErrorMsg(err.message || 'Registration submission failed. Please verify your details.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyRegNumber = () => {
    if (confirmedReg?.registrationNumber) {
      navigator.clipboard.writeText(confirmedReg.registrationNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadConfirmationSlip = () => {
    if (!confirmedReg || !event || !program) return;
    const slipText = `========================================================
     COLLEGE EVENT MANAGEMENT SYSTEM
       OFFICIAL REGISTRATION CONFIRMATION SLIP
========================================================

REGISTRATION ID: ${confirmedReg.registrationNumber}
STATUS:          ${confirmedReg.status}
TIMESTAMP:       ${new Date(confirmedReg.registeredAt).toLocaleString()}

EVENT DETAILS:
--------------------------------------------------------
Event Name:      ${confirmedReg.eventName} (${event.code})
Venue:           ${event.venue}
Date:            ${new Date(event.startDate).toLocaleDateString()} - ${new Date(event.endDate).toLocaleDateString()}

PROGRAM DETAILS:
--------------------------------------------------------
Program Name:    ${confirmedReg.programName} (${program.code})
Category:        ${program.category}
Participation:   ${confirmedReg.participantType}
Schedule:        ${program.date} at ${program.startTime}
Venue:           ${program.venue}

PARTICIPANT INFORMATION:
--------------------------------------------------------
${
  confirmedReg.participantType === 'TEAM'
    ? `Team Name:       ${confirmedReg.teamName || 'N/A'}\nDepartment:      ${confirmedReg.department}\nMembers:\n${(
        confirmedReg.teamMembers || []
      )
        .map((m, i) => `  ${i + 1}. ${m.name} (Reg No: ${m.registerNumber || 'N/A'}, Email: ${m.email || 'N/A'})`)
        .join('\n')}`
    : `Participant Name:${confirmedReg.participantData?.name || confirmedReg.participantData?.fullName || 'N/A'}\nRegister Number: ${confirmedReg.participantData?.registerNumber || confirmedReg.participantData?.studentId || 'N/A'}\nDepartment:      ${confirmedReg.department}\nEmail:           ${confirmedReg.participantData?.email || 'N/A'}\nPhone:           ${confirmedReg.participantData?.phone || 'N/A'}`
}

IMPORTANT INSTRUCTIONS:
--------------------------------------------------------
1. Report to ${program.venue} 30 minutes before the scheduled start time (${program.startTime}).
2. Bring your College Student ID card and this registration confirmation slip.
3. Observe all code of conduct rules. Jury decisions will be final.

${program.rules ? `PROGRAM RULES:\n${program.rules}\n` : ''}
${program.instructions ? `ADDITIONAL INSTRUCTIONS:\n${program.instructions}\n` : ''}
========================================================
           Generated on: ${new Date().toISOString()}
========================================================`;

    const blob = new Blob([slipText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Registration-${confirmedReg.registrationNumber}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Printable confirmation view
  if (confirmedReg) {
    return (
      <div
        style={{
          minHeight: '100vh',
          padding: '40px 20px',
          background: 'var(--bg-app)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          className="glass-card"
          style={{
            maxWidth: '680px',
            width: '100%',
            padding: '40px',
            border: '2px solid rgba(99, 102, 241, 0.4)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header */}
          <div
            style={{
              textAlign: 'center',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '24px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--emerald)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <CheckCircle2 size={36} />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '8px' }}>
              Registration Confirmed!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
              Your spot has been successfully confirmed in <strong>{confirmedReg.programName}</strong>.
            </p>
          </div>

          {/* Registration Number Highlight Slip */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(139, 92, 246, 0.12))',
              border: '1px solid var(--primary-glow)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              textAlign: 'center',
              marginBottom: '28px',
              position: 'relative',
            }}
          >
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--text-dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Official Registration ID
            </span>
            <div
              style={{
                fontSize: '2.25rem',
                fontWeight: 800,
                color: '#818cf8',
                letterSpacing: '0.04em',
                margin: '8px 0',
                fontFamily: 'monospace',
              }}
            >
              {confirmedReg.registrationNumber}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span className="badge badge-success">&bull; Status: {confirmedReg.status}</span>
              <button
                type="button"
                onClick={copyRegNumber}
                className="btn btn-ghost btn-sm"
                title="Copy Registration Number"
                style={{ fontSize: '0.75rem' }}
              >
                {copied ? <Check size={14} color="var(--emerald)" /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Registration Details Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
              marginBottom: '24px',
              fontSize: '0.875rem',
              background: 'rgba(255, 255, 255, 0.02)',
              padding: '20px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', display: 'block' }}>Event</span>
              <strong style={{ color: 'var(--text-main)', fontSize: '0.9375rem' }}>
                {confirmedReg.eventName}
              </strong>
            </div>

            <div>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', display: 'block' }}>Competition</span>
              <strong style={{ color: 'var(--text-main)', fontSize: '0.9375rem' }}>
                {confirmedReg.programName}
              </strong>
            </div>

            <div>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', display: 'block' }}>
                {confirmedReg.participantType === 'TEAM' ? 'Team Name' : 'Participant Name'}
              </span>
              <strong style={{ color: 'var(--text-main)', fontSize: '0.9375rem' }}>
                {confirmedReg.participantType === 'TEAM'
                  ? confirmedReg.teamName || 'Team'
                  : confirmedReg.participantData?.name || confirmedReg.participantData?.fullName || 'Participant'}
              </strong>
            </div>

            <div>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', display: 'block' }}>Department</span>
              <strong style={{ color: 'var(--text-main)' }}>{confirmedReg.department || 'General'}</strong>
            </div>

            <div>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', display: 'block' }}>Registration Date</span>
              <strong style={{ color: 'var(--text-main)' }}>
                {new Date(confirmedReg.registeredAt).toLocaleString()}
              </strong>
            </div>

            <div>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', display: 'block' }}>Participation Type</span>
              <span className="badge badge-neutral">{confirmedReg.participantType}</span>
            </div>
          </div>

          {/* Important Instructions Box */}
          <div
            style={{
              padding: '20px',
              background: 'rgba(99, 102, 241, 0.06)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '28px',
            }}
          >
            <h4
              style={{
                fontSize: '0.9375rem',
                fontWeight: 700,
                color: '#a5b4fc',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '10px',
              }}
            >
              <AlertCircle size={18} /> Important Event Day Instructions
            </h4>
            <ul
              style={{
                fontSize: '0.8125rem',
                color: 'var(--text-muted)',
                lineHeight: 1.6,
                paddingLeft: '20px',
                margin: 0,
              }}
            >
              <li>
                Present this <strong>Registration Number ({confirmedReg.registrationNumber})</strong> at the venue desk.
              </li>
              <li>
                Venue: <strong>{program?.venue || 'Campus Venue'}</strong> &bull; Schedule: <strong>{program?.date} at {program?.startTime}</strong>.
              </li>
              <li>Please report at least 30 minutes prior to the start of the competition.</li>
              <li>Valid college identification is mandatory for all team and individual participants.</li>
              {program?.instructions && <li>{program.instructions}</li>}
            </ul>
          </div>

          {/* QR Code Graphic Slip */}
          <div
            style={{
              padding: '16px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '32px',
            }}
          >
            <div style={{ padding: '8px', background: 'white', borderRadius: 'var(--radius-sm)' }}>
              <QrCode size={48} color="#0b0f19" />
            </div>
            <div style={{ flex: 1, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              A digital copy of this slip has been recorded. Save or print this confirmation for check-in verification.
            </div>
          </div>

          {/* Action CTAs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <button
              onClick={() => window.print()}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Printer size={16} /> Print Confirmation
            </button>
            <button
              onClick={downloadConfirmationSlip}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Download size={16} /> Download Slip (.txt)
            </button>
          </div>

          <div style={{ textAlign: 'center' }}>
            <Link
              to={`/events/${event?.slug || event?.code || ''}`}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              Back to Event Overview
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-app)', display: 'flex', flexDirection: 'column' }}>
      {/* Isolated Public Navbar - Strictly isolated with zero admin navigation links */}
      <nav
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(8, 11, 17, 0.85)',
          backdropFilter: 'blur(16px)',
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link
          to={`/events/${eventIdentifier}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={16} /> Back to Event
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color="var(--primary)" />
          <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Participant Registration Desk</span>
        </div>
      </nav>

      {/* Main Registration Form Body */}
      <main style={{ flex: 1, padding: '36px 20px', maxWidth: '780px', margin: '0 auto', width: '100%' }}>
        {loading ? (
          <div>
            <Skeleton height="80px" borderRadius="var(--radius-lg)" style={{ marginBottom: '24px' }} />
            <Skeleton height="350px" borderRadius="var(--radius-xl)" />
          </div>
        ) : errorMsg && !program ? (
          <div
            className="glass-card"
            style={{
              padding: '32px',
              textAlign: 'center',
              border: '1px solid rgba(244, 63, 94, 0.3)',
            }}
          >
            <AlertCircle size={40} color="var(--rose)" style={{ marginBottom: '16px' }} />
            <h3>Unable to Load Registration Desk</h3>
            <p style={{ color: 'var(--text-muted)', margin: '12px 0 20px' }}>{errorMsg}</p>
            <Link to="/" className="btn btn-primary">
              View All Events
            </Link>
          </div>
        ) : program && event ? (
          <div className="glass-card" style={{ padding: '36px' }}>
            {/* Competition Header */}
            <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '20px', marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span className="badge badge-primary">{event.code}</span>
                <span className="badge badge-neutral">{program.category}</span>
                <span className="badge badge-success">{program.participationType}</span>
                {program.capacity && (
                  <span className="badge badge-neutral">
                    Seats: {program.registeredCount || 0} / {program.capacity}
                  </span>
                )}
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '6px' }}>
                {program.name}
              </h2>
              {program.description && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', marginBottom: '12px' }}>
                  {program.description}
                </p>
              )}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '16px',
                  color: 'var(--text-dim)',
                  fontSize: '0.8125rem',
                  marginTop: '12px',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={14} /> {program.venue}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={14} /> {program.date} ({program.startTime})
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={14} /> Closes: {new Date(program.registrationEnd).toLocaleDateString()}
                </span>
              </div>
            </div>

            {errorMsg && (
              <div
                style={{
                  padding: '14px 18px',
                  background: 'rgba(244, 63, 94, 0.12)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  color: '#fda4af',
                  fontSize: '0.875rem',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <AlertCircle size={18} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit}>
              {/* If Team Participation, Team Info Block */}
              {program.participationType === 'TEAM' && (
                <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={18} color="var(--primary)" /> Team Information
                  </h4>

                  <div className="form-group">
                    <label className="form-label">Team Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="e.g. Cyber Ninjas"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Representing Department *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="e.g. Computer Science & Engineering"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    />
                  </div>

                  {/* Team Members List */}
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Team Members</span>
                      <button
                        type="button"
                        onClick={handleAddTeamMember}
                        className="btn btn-secondary btn-sm"
                      >
                        + Add Member
                      </button>
                    </div>

                    {teamMembers.map((member, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr)) auto',
                          gap: '10px',
                          alignItems: 'center',
                          marginBottom: '10px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          padding: '12px',
                          borderRadius: 'var(--radius-md)',
                        }}
                      >
                        <input
                          type="text"
                          className="form-input"
                          placeholder={`Member #${idx + 1} Name`}
                          required
                          value={member.name}
                          onChange={(e) => handleTeamMemberChange(idx, 'name', e.target.value)}
                        />
                        <input
                          type="text"
                          className="form-input"
                          placeholder="College Register No."
                          required
                          value={member.registerNumber}
                          onChange={(e) => handleTeamMemberChange(idx, 'registerNumber', e.target.value)}
                        />
                        <input
                          type="email"
                          className="form-input"
                          placeholder="Email Address"
                          value={member.email}
                          onChange={(e) => handleTeamMemberChange(idx, 'email', e.target.value)}
                        />
                        {teamMembers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTeamMember(idx)}
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--rose)' }}
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic Program-Configured Custom Fields */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} color="var(--primary)" /> Participant Details
                </h4>

                {[...(program.registrationFields || [])]
                  .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0))
                  .map((field: RegistrationField) => {
                    const fieldKey = field.key || field.name;
                    const error = fieldErrors[fieldKey];

                    return (
                      <div key={field.id} className="form-group" style={{ marginBottom: '18px' }}>
                        <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>
                            {field.label} {field.required && <span style={{ color: 'var(--rose)' }}>*</span>}
                          </span>
                        </label>

                        {/* SELECT DROPDOWN */}
                        {field.type === 'select' ? (
                          <select
                            className={`form-select ${error ? 'border-rose' : ''}`}
                            required={field.required}
                            value={formData[fieldKey] || ''}
                            onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                          >
                            <option value="">-- Select {field.label} --</option>
                            {field.options?.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : /* RADIO GROUP */
                        field.type === 'radio' ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', padding: '6px 0' }}>
                            {field.options?.map((opt) => (
                              <label
                                key={opt}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem',
                                  color: 'var(--text-main)',
                                }}
                              >
                                <input
                                  type="radio"
                                  name={fieldKey}
                                  value={opt}
                                  checked={formData[fieldKey] === opt}
                                  onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                                  required={field.required}
                                />
                                {opt}
                              </label>
                            ))}
                          </div>
                        ) : /* CHECKBOX */
                        field.type === 'checkbox' ? (
                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              padding: '6px 0',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={!!formData[fieldKey]}
                              onChange={(e) => handleInputChange(fieldKey, e.target.checked)}
                              required={field.required}
                            />
                            <span>{field.placeholder || `I agree / confirm for ${field.label}`}</span>
                          </label>
                        ) : /* DATE */
                        field.type === 'date' ? (
                          <input
                            type="date"
                            className={`form-input ${error ? 'border-rose' : ''}`}
                            required={field.required}
                            value={formData[fieldKey] || ''}
                            onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                          />
                        ) : /* TEXTAREA */
                        field.type === 'textarea' ? (
                          <textarea
                            className={`form-textarea ${error ? 'border-rose' : ''}`}
                            rows={3}
                            required={field.required}
                            placeholder={field.placeholder || ''}
                            value={formData[fieldKey] || ''}
                            onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                          />
                        ) : /* FILE UPLOAD */
                        field.type === 'file' ? (
                          <div
                            style={{
                              padding: '16px',
                              border: '1px dashed var(--border-subtle)',
                              borderRadius: 'var(--radius-md)',
                              background: 'rgba(255, 255, 255, 0.02)',
                              textAlign: 'center',
                            }}
                          >
                            <UploadCloud size={24} color="var(--primary)" style={{ margin: '0 auto 8px' }} />
                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                              {formData[fieldKey]?.fileName ? (
                                <span style={{ color: 'var(--emerald)' }}>
                                  Selected: {formData[fieldKey].fileName}
                                </span>
                              ) : (
                                'Upload documents or image verification (Max 5MB)'
                              )}
                            </div>
                            <input
                              type="file"
                              accept={field.accept || 'image/*,application/pdf'}
                              onChange={(e) => handleFileUpload(fieldKey, e.target.files?.[0] || null)}
                              required={field.required && !formData[fieldKey]}
                              style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}
                            />
                          </div>
                        ) : (
                          /* STANDARD INPUT (text, number, email, phone) */
                          <input
                            type={
                              field.type === 'number'
                                ? 'number'
                                : field.type === 'email'
                                ? 'email'
                                : field.type === 'phone'
                                ? 'tel'
                                : 'text'
                            }
                            className={`form-input ${error ? 'border-rose' : ''}`}
                            required={field.required}
                            placeholder={field.placeholder || ''}
                            value={formData[fieldKey] || ''}
                            onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                          />
                        )}

                        {error && (
                          <div style={{ color: 'var(--rose)', fontSize: '0.75rem', marginTop: '4px' }}>
                            {error}
                          </div>
                        )}

                        {field.helperText && !error && (
                          <div className="form-hint" style={{ fontSize: '0.75rem' }}>
                            {field.helperText}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Competition Rules & Instructions */}
              {(program.rules || program.instructions) && (
                <div
                  style={{
                    padding: '18px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '24px',
                    fontSize: '0.8125rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  {program.rules && (
                    <div style={{ marginBottom: program.instructions ? '12px' : '0' }}>
                      <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                        Competition Rules:
                      </strong>
                      {program.rules}
                    </div>
                  )}
                  {program.instructions && (
                    <div>
                      <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                        Important Instructions:
                      </strong>
                      {program.instructions}
                    </div>
                  )}
                </div>
              )}

              {/* Submit Action */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <Link to={`/events/${eventIdentifier}`} className="btn btn-secondary">
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={submitting}
                  style={{ minWidth: '220px' }}
                >
                  {submitting ? 'Submitting Registration...' : 'Complete Registration'}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </main>
    </div>
  );
};
