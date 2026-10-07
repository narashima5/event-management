import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Registration } from '../../types';
import { Search, Printer, ArrowLeft, CheckCircle2, QrCode, AlertCircle } from 'lucide-react';

export const PublicLookupPage: React.FC = () => {
  const [regNumber, setRegNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Registration | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNumber.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await api.getPublicConfirmation(regNumber.trim());
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'No registration found matching this registration number.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-app)', display: 'flex', flexDirection: 'column' }}>
      <nav
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
          <ArrowLeft size={16} /> Back to Events
        </Link>
        <span style={{ fontWeight: 700 }}>Registration Verification Desk</span>
      </nav>

      <main style={{ flex: 1, padding: '40px 20px', maxWidth: '640px', margin: '0 auto', width: '100%' }}>
        <div className="glass-card" style={{ padding: '32px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px' }}>
            Find Your Registration Slip
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '20px' }}>
            Enter your unique registration number (e.g. ARTS27-SD-0001) to verify your confirmation or print your ticket slip.
          </p>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. ARTS27-SD-0001"
              value={regNumber}
              onChange={(e) => setRegNumber(e.target.value)}
              required
              style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
            />
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: '120px' }}>
              <Search size={16} /> {loading ? 'Searching...' : 'Find Ticket'}
            </button>
          </form>

          {error && (
            <div
              style={{
                marginTop: '20px',
                padding: '14px',
                background: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: '#fda4af',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={18} /> {error}
            </div>
          )}
        </div>

        {/* Found Ticket Slip */}
        {result && (
          <div className="glass-card" style={{ padding: '32px', border: '1px solid rgba(99, 102, 241, 0.35)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--emerald)', fontWeight: 600 }}>
                <CheckCircle2 size={20} /> Verified Record
              </div>
              <span className="badge badge-success">{result.status}</span>
            </div>

            <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: 'var(--radius-md)', marginBottom: '24px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Registration Number</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#818cf8', fontFamily: 'monospace', margin: '6px 0' }}>
                {result.registrationNumber}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', fontSize: '0.875rem' }}>
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Participant</span>
                <strong style={{ display: 'block', color: 'var(--text-main)' }}>
                  {result.participantType === 'TEAM'
                    ? result.teamName || result.participantData?.teamName
                    : result.participantData?.name || result.participantData?.fullName}
                </strong>
              </div>

              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Department</span>
                <strong style={{ display: 'block', color: 'var(--text-main)' }}>{result.department || 'General'}</strong>
              </div>

              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Program</span>
                <strong style={{ display: 'block', color: 'var(--text-main)' }}>{result.programName}</strong>
              </div>

              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Registration Date</span>
                <strong style={{ display: 'block', color: 'var(--text-main)' }}>
                  {new Date(result.registeredAt).toLocaleDateString()}
                </strong>
              </div>
            </div>

            <button onClick={() => window.print()} className="btn btn-primary" style={{ width: '100%' }}>
              <Printer size={16} /> Print Confirmation Slip
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
