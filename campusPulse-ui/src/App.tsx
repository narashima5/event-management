import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './layouts/DashboardLayout';

// Public Pages
import { PublicEventPage } from './pages/public/PublicEventPage';
import { PublicRegistrationPage } from './pages/public/PublicRegistrationPage';
import { PublicLookupPage } from './pages/public/PublicLookupPage';
import { PublicResultsPage } from './pages/public/PublicResultsPage';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminEventsPage } from './pages/admin/AdminEventsPage';
import { AdminEventDetailsPage } from './pages/admin/AdminEventDetailsPage';
import { AdminProgramsPage } from './pages/admin/AdminProgramsPage';
import { AdminProgramDetailsPage } from './pages/admin/AdminProgramDetailsPage';
import { AdminAssignmentsPage } from './pages/admin/AdminAssignmentsPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminResultsPage } from './pages/admin/AdminResultsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminAuditPage } from './pages/admin/AdminAuditPage';

// Coordinator Pages
import { CoordinatorDashboard } from './pages/coordinator/CoordinatorDashboard';
import { CoordinatorProgramPage } from './pages/coordinator/CoordinatorProgramPage';

// Jury Pages
import { JuryDashboard } from './pages/jury/JuryDashboard';
import { JuryEvaluationPage } from './pages/jury/JuryEvaluationPage';

export const App: React.FC = () => {
  return (
    <Routes>
      {/* ================================================================= */}
      {/* 1. PUBLIC ROUTES (Isolated - No Admin Navigation links)          */}
      {/* ================================================================= */}
      <Route path="/" element={<PublicEventPage />} />
      <Route path="/events/:codeOrSlug" element={<PublicEventPage />} />
      <Route path="/results" element={<PublicResultsPage />} />
      <Route path="/events/:codeOrSlug/results" element={<PublicResultsPage />} />
      <Route path="/register/:eventCode/:programCode" element={<PublicRegistrationPage />} />
      <Route path="/register/:eventSlug/:programSlug" element={<PublicRegistrationPage />} />
      <Route path="/lookup" element={<PublicLookupPage />} />
      <Route path="/registrations/:regNumber" element={<PublicLookupPage />} />

      {/* ================================================================= */}
      {/* 2. AUTHENTICATION ROUTE                                          */}
      {/* ================================================================= */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* ================================================================= */}
      {/* 3. ADMIN PROTECTED WORKSPACE                                     */}
      {/* ================================================================= */}
      <Route path="/admin" element={<DashboardLayout allowedRoles={['admin']} pageTitle="Admin Console" />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="events" element={<AdminEventsPage />} />
        <Route path="events/:id" element={<AdminEventDetailsPage />} />
        <Route path="programs" element={<AdminProgramsPage />} />
        <Route path="programs/:id" element={<AdminProgramDetailsPage />} />
        <Route path="assignments" element={<AdminAssignmentsPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="results" element={<AdminResultsPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="audit" element={<AdminAuditPage />} />
      </Route>

      {/* ================================================================= */}
      {/* 4. COORDINATOR PROTECTED WORKSPACE                               */}
      {/* ================================================================= */}
      <Route path="/coordinator" element={<DashboardLayout allowedRoles={['coordinator']} pageTitle="Coordinator Desk" />}>
        <Route index element={<Navigate to="/coordinator/dashboard" replace />} />
        <Route path="dashboard" element={<CoordinatorDashboard />} />
        <Route path="programs/:id" element={<CoordinatorProgramPage />} />
      </Route>

      {/* ================================================================= */}
      {/* 5. JURY PROTECTED WORKSPACE                                      */}
      {/* ================================================================= */}
      <Route path="/jury" element={<DashboardLayout allowedRoles={['jury']} pageTitle="Jury Arena" />}>
        <Route index element={<Navigate to="/jury/dashboard" replace />} />
        <Route path="dashboard" element={<JuryDashboard />} />
        <Route path="programs/:id/evaluate" element={<JuryEvaluationPage />} />
      </Route>

      {/* Catch-all Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
