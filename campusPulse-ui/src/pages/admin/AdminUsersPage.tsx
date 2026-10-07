import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { User, UserRole, UserRoles, Assignment } from '../../types';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { EmptyState } from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { useToast } from '../../contexts/ToastContext';
import {
  Users,
  PlusCircle,
  Shield,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  Building,
  Search,
  Filter,
  Eye,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Add User Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'coordinator' as UserRole,
    department: 'Computer Science',
    phone: '',
  });

  // User Details Modal State
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userAssignments, setUserAssignments] = useState<Assignment[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers({
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      });
      setUsers(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createUser(formData);
      toast.success(`User '${formData.name}' created successfully!`);
      setIsModalOpen(false);
      setFormData({ name: '', email: '', password: '', role: 'coordinator' as const, department: 'Computer Science', phone: '' });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (uid: string, currentStatus: string) => {
    const isAct = currentStatus.toLowerCase() === 'active';
    const nextStatus = isAct ? 'inactive' : 'active';
    try {
      await api.updateUserStatus(uid, nextStatus);
      toast.success(`User status changed to ${nextStatus.toUpperCase()}`);
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, status: nextStatus as any } : u))
      );
      if (selectedUser?.uid === uid) {
        setSelectedUser((prev) => prev ? { ...prev, status: nextStatus as any } : null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user status');
    }
  };

  const handleViewDetails = async (u: User) => {
    setSelectedUser(u);
    setLoadingDetails(true);
    try {
      const res = await api.getUserDetails(u.uid);
      setUserAssignments(res.assignments || []);
    } catch (err: any) {
      // Fallback
      setUserAssignments([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = u.name.toLowerCase().includes(term);
    const emailMatch = u.email.toLowerCase().includes(term);
    const deptMatch = (u.department || '').toLowerCase().includes(term);
    const phoneMatch = (u.phone || '').toLowerCase().includes(term);
    return nameMatch || emailMatch || deptMatch || phoneMatch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={28} color="var(--primary)" /> Staff & User Management
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
            Manage staff accounts, assign administrative roles, toggle account statuses, and inspect assigned competition scopes.
          </p>
        </div>

        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <PlusCircle size={16} /> Add Staff Member
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}
            />
            <input
              type="text"
              className="form-control"
              placeholder="Search by name, email, department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} color="var(--text-dim)" />
            <select
              className="form-control"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="admin">Administrator</option>
              <option value="coordinator">Coordinator</option>
              <option value="jury">Jury Member</option>
            </select>
          </div>

          <div>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '24px' }}>
            <TableSkeleton rows={6} columns={6} />
          </div>
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No staff users found"
            description={searchTerm || roleFilter || statusFilter ? 'Try clearing your search filters.' : 'Click "Add Staff Member" to invite an administrator, coordinator, or jury member.'}
            actionLabel={searchTerm || roleFilter || statusFilter ? 'Clear Filters' : undefined}
            onAction={() => {
              setSearchTerm('');
              setRoleFilter('');
              setStatusFilter('');
            }}
          />
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isAct = (u.status || '').toLowerCase() === 'active';
                  return (
                    <tr key={u.uid}>
                      <td>
                        <strong style={{ color: 'var(--text-main)', display: 'block', fontSize: '0.9375rem' }}>{u.name}</strong>
                        {u.phone && <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{u.phone}</span>}
                      </td>
                      <td style={{ fontSize: '0.875rem' }}>{u.email}</td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            background:
                              u.role === 'admin'
                                ? 'rgba(99, 102, 241, 0.15)'
                                : u.role === 'coordinator'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : 'rgba(245, 158, 11, 0.15)',
                            color:
                              u.role === 'admin'
                                ? 'var(--primary)'
                                : u.role === 'coordinator'
                                ? 'var(--emerald)'
                                : 'var(--amber)',
                            border: '1px solid currentColor',
                          }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.875rem' }}>{u.department || 'General'}</td>
                      <td>
                        <Badge status={isAct ? 'ACTIVE' : 'INACTIVE'} />
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleViewDetails(u)}
                            className="btn btn-ghost btn-sm"
                            title="View details & assigned programs"
                          >
                            <Eye size={15} /> Details
                          </button>
                          <button
                            onClick={() => handleToggleStatus(u.uid, u.status)}
                            className={`btn btn-sm ${isAct ? 'btn-ghost' : 'btn-secondary'}`}
                            style={{
                              fontSize: '0.75rem',
                              padding: '4px 8px',
                              color: isAct ? 'var(--rose)' : 'var(--emerald)',
                            }}
                          >
                            {isAct ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Staff User" maxWidth="540px">
        <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="e.g. Dr. Alan Turing"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              className="form-control"
              required
              placeholder="name@college.edu"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Temporary Password *</label>
            <input
              type="password"
              className="form-control"
              required
              minLength={6}
              placeholder="Minimum 6 characters (e.g. Staff@123456)"
              value={formData.password}
              onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
              Used by the user to sign into the system.
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select
                className="form-control"
                value={formData.role}
                onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value as any }))}
              >
                <option value="coordinator">Coordinator</option>
                <option value="jury">Jury Member</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Department</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Fine Arts"
                value={formData.department}
                onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Phone</label>
            <input
              type="text"
              className="form-control"
              placeholder="+91 98765 43210"
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* User Details Modal */}
      {selectedUser && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedUser(null)}
          title={`Staff Profile: ${selectedUser.name}`}
          maxWidth="580px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{selectedUser.name}</h3>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-dim)' }}>{selectedUser.email}</span>
              </div>
              <Badge status={(selectedUser.status || '').toUpperCase()} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Role</span>
                <div style={{ textTransform: 'uppercase', fontWeight: 700, color: 'var(--primary)', fontSize: '0.875rem' }}>
                  {selectedUser.role}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Department</span>
                <div style={{ fontWeight: 600 }}>{selectedUser.department || 'N/A'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Phone</span>
                <div style={{ fontWeight: 600 }}>{selectedUser.phone || 'N/A'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>User ID (UID)</span>
                <code style={{ fontSize: '0.75rem' }}>{selectedUser.uid}</code>
              </div>
            </div>

            {/* Assigned Competitions Section */}
            <div>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={16} color="var(--primary)" /> Program Assignments ({userAssignments.length})
              </h4>
              {loadingDetails ? (
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-dim)' }}>Loading assignments...</div>
              ) : userAssignments.length === 0 ? (
                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '0.8125rem', color: 'var(--text-dim)' }}>
                  {selectedUser.role === 'admin'
                    ? 'Administrators possess global access across all events and programs without needing specific assignments.'
                    : 'No competition assignments currently assigned to this user.'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {userAssignments.map((a) => (
                    <div
                      key={a.id}
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
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Program ID: {a.programId}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Event: {a.eventId} &bull; Role: {a.role}</div>
                      </div>
                      <Badge status={(a.status || 'ACTIVE').toUpperCase()} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <button
                onClick={() => handleToggleStatus(selectedUser.uid, selectedUser.status)}
                className={`btn btn-sm ${(selectedUser.status || '').toLowerCase() === 'active' ? 'btn-danger' : 'btn-primary'}`}
              >
                {(selectedUser.status || '').toLowerCase() === 'active' ? 'Deactivate Account' : 'Activate Account'}
              </button>
              <button onClick={() => setSelectedUser(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
