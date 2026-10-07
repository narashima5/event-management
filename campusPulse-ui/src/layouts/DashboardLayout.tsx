import React, { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { UserRole } from '../types';

interface DashboardLayoutProps {
  allowedRoles?: UserRole[];
  pageTitle?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  allowedRoles,
  pageTitle = 'Dashboard',
}) => {
  const { user, role, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--border-card)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>Loading workspace...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Not logged in -> send to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role mismatch -> redirect to appropriate home
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (role === 'coordinator') return <Navigate to="/coordinator/dashboard" replace />;
    if (role === 'jury') return <Navigate to="/jury/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Header
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          title={pageTitle}
        />
        <main className="content-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
