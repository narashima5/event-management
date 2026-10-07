# CampusPulse — Production College Event Management System

CampusPulse is an enterprise-grade, accessible, responsive College Event Management web application built for higher education institutions, cultural festivals, sports meets, and technical symposiums.

The application manages multi-tier college events, programs/competitions, participants, event coordinators, jury members, scoring rubrics, results, department championship leaderboards, and audit logging.

---

## Architecture & Technology Stack

```
campus-pulse/
├── server/                  # Independent Node.js + Express + TypeScript REST API
│   ├── .env.example         # Dedicated backend environment configuration
│   ├── src/
│   │   ├── config/          # Environment & Firebase Admin SDK config (Dual-mode fallback)
│   │   ├── database/        # Cloud Firestore & In-Memory Store abstraction
│   │   ├── types/           # Self-contained backend models, Zod schemas & Enums
│   │   ├── middleware/      # Firebase Auth, Role checks, Program Assignment checks
│   │   ├── services/        # Registration validation, Result calculation, Audit logging
│   │   ├── controllers/     # Event, Program, Registration, Score, Report, Audit controllers
│   │   ├── routes/          # RESTful route definitions
│   │   ├── seed.ts          # Sample data seeder (Events, Programs, Users, Criteria)
│   │   └── __tests__/       # Automated Jest test suites (Auth, Registration, Scoring)
│
└── client/                  # Independent React 18 + Vite + TypeScript Single Page Application
    ├── .env.example         # Dedicated frontend environment configuration
    ├── src/
    │   ├── types/           # Self-contained frontend types, interfaces & Enums
    │   ├── components/      # Glassmorphic UI components, Modals, ConfirmDialog, Badges
    │   ├── contexts/        # AuthContext (Role session + 1-Click Demo switch), ToastContext
    │   ├── layouts/         # DashboardLayout (Sidebar, Header, Route Guards)
    │   ├── pages/
    │   │   ├── public/      # Public Event Portal, Dynamic Registration Form, Lookup Slip
    │   │   ├── auth/        # Login Page & Quick Role Switcher
    │   │   ├── admin/       # Overview, Events, Programs, Assignments, Reports, Results, Audit
    │   │   ├── coordinator/ # Assigned Programs Roster, Attendance & Real-time Check-In Desk
    │   │   └── jury/        # Empaneled Programs, Real-time Rubric Scoring & Score Locking
    │   └── index.css        # Curated Dark Theme & Glassmorphism Design Tokens (Vanilla CSS)
```

### Tech Stack Summary
- **Frontend**: React 18, React Router v6, TypeScript, Lucide Icons, Vanilla CSS (Dark Glassmorphism, Micro-animations, Accessible).
- **Backend**: Node.js, Express 5, TypeScript, Zod validation, CORS, CSV export engine.
- **Database & Security**:
  - Cloud Firestore / In-Memory Dual-Mode Store (transactions, atomic counter increments, queries, index definitions).
  - Firebase Authentication + Firebase Admin SDK for privileged backend operations.
  - `firestore.rules` for defense-in-depth security.
  - `firestore.indexes.json` for compound query indexes.

---

## User Roles & Assignment-Based Access Control

| Role | Scope | Key Capabilities | Prohibited Actions |
|---|---|---|---|
| **PUBLIC** | Public URLs (`/`, `/events/:slug`, `/register/:event/:prog`, `/lookup`) | Browse published events, register online, view registration slip. | Access any admin, coordinator, or jury dashboard. |
| **ADMIN** | System-wide (`/admin/*`) | Create/edit events & programs, assign coordinators & jury, manage users, calculate & publish results, view audit trails, export CSV. | Cannot be restricted by assignment. |
| **COORDINATOR** | Explicitly Assigned Programs (`/coordinator/*`) | View assigned program details, search/filter participants, mark attendance (Check-in), view guidelines and published results. | Access unassigned programs (403), access other events, manage users or scoring criteria. |
| **JURY** | Explicitly Assigned Programs (`/jury/*`) | View participant lineup for assigned programs, score rubric dimensions (sliders/inputs), save drafts, submit final locked scores. | Access unassigned programs (403), edit locked scores, access private admin reports. |

### The Assignment Model
Authorization does not rely simply on `role = "coordinator"`. Instead, explicit program delegations are maintained:
```typescript
interface Assignment {
  id: string;
  userId: string;
  role: 'coordinator' | 'jury';
  eventId: string;
  programId: string;
  assignedAt: string;
}
```
Every coordinator and jury endpoint strictly validates program assignment server-side via `requireProgramAccess(paramName)` middleware.

---

## Pre-Configured Demo Accounts (1-Click Switcher)

When running the application, you can switch between roles instantly from the Login page or the Sidebar bottom bar:

| Role | Email | Auth Token | Assigned Competition |
|---|---|---|---|
| **Administrator** | `admin@college.edu` | `dev-admin-token` | Full System Access |
| **Coordinator A (Dance)** | `dance.coord@college.edu` | `dev-coord-a-token` | Solo Classical & Contemporary Dance (`SD`) |
| **Coordinator B (Quiz)** | `quiz.coord@college.edu` | `dev-coord-b-token` | Grand Tech Quiz (`TQ`) |
| **Jury A (Dance)** | `dance.judge@college.edu` | `dev-jury-a-token` | Solo Classical & Contemporary Dance (`SD`) |
| **Jury B (Quiz)** | `quiz.judge@college.edu` | `dev-jury-b-token` | Grand Tech Quiz (`TQ`) |

---

## Getting Started

### Prerequisites
- Node.js (v18 or v20+)
- npm (v9+)

### Installation
From the root workspace directory:
```bash
npm install
```

### Environment Configuration & Firebase Credentials
- For step-by-step instructions on obtaining all required Firebase keys, refer to:
  👉 [FIREBASE_README.md](FIREBASE_README.md)
- For local offline testing, no keys are required (`USE_LOCAL_STORE=true` in `.env`).


### Running the Application

1. **Development Mode (Server & Client concurrently)**:
   ```bash
   npm run dev
   ```
   - Client: [http://localhost:5173](http://localhost:5173)
   - Backend API: [http://localhost:5000](http://localhost:5000)

2. **Run Tests**:
   ```bash
   npm run test
   ```
   Executes 19 comprehensive automated tests verifying authentication, authorization barriers, public registration validation, jury score locking, and result calculation.

3. **Production Build**:
   ```bash
   npm run build
   ```
   Builds the `@college-events/server` and `@college-events/client` packages independently for production deployment.

---

## Key Features Implemented

1. **Public Registration Portal**:
   - Dynamic form generator responding to program configuration (e.g. required dance styles, track uploads, team rosters).
   - Atomic capacity enforcement and duplicate prevention (by student register number).
   - Unique registration number generation (e.g. `ARTS27-SD-0001`).
   - Printable registration slip with barcode/QR badge display and schedule notes.

2. **Coordinator Operations Desk**:
   - Zero-leakage program roster.
   - Real-time Check-in / Attendance toggle (Present / Pending / Absent).
   - Instant search and filtering by department, status, and phone number.

3. **Jury Scoring Arena**:
   - Weighted multi-criterion scoring rubrics (e.g., Technique, Expression, Choreography, Costume, Overall Impact).
   - Real-time score tallying and progress indicator against maximum points.
   - Two-phase submission: "Save Draft" for ongoing judging and "Submit Final Score" with irreversible lock confirmation.
   - Administrative unlock workflow for approved re-evaluations.

4. **Result Engine & Department Leaderboard**:
   - Automated rank assignment, medal distribution (Gold, Silver, Bronze), and fest points (5-3-1 point system).
   - Department Championship Leaderboard aggregated across all completed competitions.
   - Filtered participant and winner list export to CSV.

5. **Security & Immutable Audit Trail**:
   - Full audit trail logging for user actions, score submissions, locks/unlocks, and result publications.
   - Firebase Security Rules (`firestore.rules`) and Composite Indexes (`firestore.indexes.json`) included for Google Cloud deployment.
