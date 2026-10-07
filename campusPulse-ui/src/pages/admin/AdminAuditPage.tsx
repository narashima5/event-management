import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AuditLog } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { Badge } from '../../components/Badge';
import { SkeletonTable } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { ShieldAlert, RefreshCw, Filter, Search, Clock, UserCheck } from 'lucide-react';

export const AdminAuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const toast = useToast();

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditLogs({
        entity: entityFilter || undefined,
        action: actionFilter || undefined,
        limit: 100,
      });
      setLogs(data);
    } catch (err: any) {
      toast.error(`Failed to load audit logs: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [entityFilter, actionFilter]);

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const actionMatch = log.action.toLowerCase().includes(term);
    const entityMatch = log.entity.toLowerCase().includes(term);
    const userMatch = (log.userName || log.userId || '').toLowerCase().includes(term);
    const metaMatch = JSON.stringify(log.metadata || {}).toLowerCase().includes(term);
    return actionMatch || entityMatch || userMatch || metaMatch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={28} color="var(--primary)" /> System Audit Trails
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
            Immutable chronological record of administrative actions, score submissions, and authorization events.
          </p>
        </div>
        <button onClick={fetchLogs} className="btn btn-secondary" disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh Logs
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search actions, users, metadata..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} color="var(--text-dim)" />
            <select
              className="form-control"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
            >
              <option value="">All Entities</option>
              <option value="event">Event</option>
              <option value="program">Program</option>
              <option value="user">User</option>
              <option value="assignment">Assignment</option>
              <option value="registration">Registration</option>
              <option value="score">Score</option>
              <option value="result">Result</option>
            </select>
          </div>

          <div>
            <select
              className="form-control"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="ASSIGN">ASSIGN</option>
              <option value="SUBMIT">SUBMIT</option>
              <option value="UNLOCK">UNLOCK</option>
              <option value="CALCULATE">CALCULATE</option>
              <option value="PUBLISH">PUBLISH</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '24px' }}>
            <SkeletonTable rows={8} />
          </div>
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="No audit logs found"
            description={searchTerm || entityFilter || actionFilter ? 'Try clearing your filters or search terms.' : 'Audit events will appear here as system operations occur.'}
            actionLabel="Reset Filters"
            onAction={() => {
              setSearchTerm('');
              setEntityFilter('');
              setActionFilter('');
            }}
          />
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Entity ID</th>
                  <th>Operator</th>
                  <th>Details & Context</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const dateStr = log.timestamp ? new Date(log.timestamp).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  }) : 'N/A';

                  return (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.8125rem', color: 'var(--text-dim)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={14} /> {dateStr}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            background:
                              log.action.includes('DELETE') || log.action.includes('DISQUALIFY')
                                ? 'rgba(244, 63, 94, 0.15)'
                                : log.action.includes('SUBMIT') || log.action.includes('PUBLISH')
                                ? 'rgba(16, 185, 129, 0.15)'
                                : log.action.includes('UNLOCK')
                                ? 'rgba(245, 158, 11, 0.15)'
                                : 'rgba(99, 102, 241, 0.15)',
                            color:
                              log.action.includes('DELETE') || log.action.includes('DISQUALIFY')
                                ? 'var(--rose)'
                                : log.action.includes('SUBMIT') || log.action.includes('PUBLISH')
                                ? 'var(--emerald)'
                                : log.action.includes('UNLOCK')
                                ? 'var(--amber)'
                                : 'var(--primary)',
                            border: '1px solid currentColor',
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{log.entity}</span>
                      </td>
                      <td>
                        <code style={{ fontSize: '0.75rem', padding: '2px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px' }}>
                          {log.entityId}
                        </code>
                      </td>
                      <td>
                        <div>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <UserCheck size={14} color="var(--text-dim)" /> {log.userName || log.userId || 'System'}
                          </span>
                          {log.userRole && (
                            <span style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                              {log.userRole}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {log.metadata && ObjectKeys(log.metadata).length > 0 ? (
                          <pre
                            style={{
                              margin: 0,
                              fontSize: '0.75rem',
                              color: 'var(--text-muted)',
                              fontFamily: 'monospace',
                              maxHeight: '60px',
                              overflowY: 'auto',
                              whiteSpace: 'pre-wrap',
                              background: 'rgba(0,0,0,0.2)',
                              padding: '4px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            {JSON.stringify(log.metadata, null, 1)}
                          </pre>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>No metadata</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

function ObjectKeys(obj: any): string[] {
  return obj ? Object.keys(obj) : [];
}
