import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  Layers,
  UserCheck,
  FileSpreadsheet,
  Trophy,
  Users,
  ShieldAlert,
  LogOut,
  ExternalLink,
  Award,
  ClipboardList,
  Sparkles,
} from 'lucide-react';
import { Badge } from './Badge';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 99,
          }}
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div
          style={{
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--grad-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px var(--primary-glow)',
            }}
          >
            <Sparkles size={22} color="white" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              CampusPulse
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 500 }}>
              Event Management OS
            </span>
          </div>
        </div>

        {/* Current User Pill */}
        {user && (
          <div
            style={{
              margin: '16px 20px 8px',
              padding: '12px 14px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {user.name.split(' ')[0]} {user.name.split(' ')[1] || ''}
              </span>
              <Badge status={role || 'user'} />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <div style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          {role === 'admin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ padding: '8px 12px', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Administration
              </span>
              <NavLink to="/admin/dashboard" onClick={onClose} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <LayoutDashboard size={18} /> Overview
              </NavLink>
              <NavLink to="/admin/events" onClick={onClose} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <Calendar size={18} /> Events
              </NavLink>
              <NavLink to="/admin/programs" onClick={onClose} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <Layers size={18} /> Programs
              </NavLink>
              <NavLink to="/admin/assignments" onClick={onClose} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <UserCheck size={18} /> Assignments
              </NavLink>
              <NavLink to="/admin/reports" onClick={onClose} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <FileSpreadsheet size={18} /> Participants & Reports
              </NavLink>
              <NavLink to="/admin/results" onClick={onClose} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <Trophy size={18} /> Results & Leaderboards
              </NavLink>
              <NavLink to="/admin/users" onClick={onClose} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <Users size={18} /> Users
              </NavLink>
              <NavLink to="/admin/audit" onClick={onClose} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <ShieldAlert size={18} /> Audit Trails
              </NavLink>
            </div>
          )}

          {role === 'coordinator' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ padding: '8px 12px', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Coordinator Desk
              </span>
              <NavLink to="/coordinator/dashboard" onClick={onClose} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <ClipboardList size={18} /> Assigned Programs
              </NavLink>
            </div>
          )}

          {role === 'jury' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ padding: '8px 12px', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Jury Arena
              </span>
              <NavLink to="/jury/dashboard" onClick={onClose} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <Award size={18} /> Score Evaluations
              </NavLink>
            </div>
          )}

          <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
            <NavLink to="/" target="_blank" className="sidebar-link">
              <ExternalLink size={18} /> Public Portal
            </NavLink>
          </div>
        </div>

        {/* Sidebar Footer with Account Info & Sign Out */}
        <div style={{ padding: '16px 20px', background: 'rgba(0, 0, 0, 0.25)', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={handleLogout}
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', color: 'var(--rose)', justifyContent: 'center', fontWeight: 600 }}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      <style>{`
        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          color: var(--text-muted);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 500;
          transition: all var(--transition-fast);
        }
        .sidebar-link:hover {
          color: var(--text-main);
          background: rgba(255, 255, 255, 0.05);
        }
        .sidebar-link.active {
          color: white;
          background: rgba(99, 102, 241, 0.18);
          border: 1px solid rgba(99, 102, 241, 0.35);
          font-weight: 600;
        }
      `}</style>
    </>
  );
};
