# FitProApp — Architecture & System Documentation

> **Version**: 1.0  
> **Last Updated**: 2026-06-10  
> **Audience**: Engineering team, onboarding developers, technical stakeholders

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Backend Service](#3-backend-service)
4. [Frontend Application](#4-frontend-application)
5. [Database Design](#5-database-design)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [Email & Notification System](#7-email--notification-system)
8. [Scheduled Jobs](#8-scheduled-jobs)
9. [Deployment & Infrastructure](#9-deployment--infrastructure)
10. [Environment Configuration](#10-environment-configuration)
11. [API Reference](#11-api-reference)
12. [Data Flow Diagrams](#12-data-flow-diagrams)
13. [Security Model](#13-security-model)
14. [Performance Considerations](#14-performance-considerations)
15. [Known Limitations & Roadmap](#15-known-limitations--roadmap)

---

## 1. System Overview

FitProApp is a **multi-tenant SaaS fitness management platform** designed for personal trainers and their students. It provides a complete operational layer for managing client relationships, training plans, exercise routines, subscriptions, and payment tracking.

### Core Value Proposition

| Actor | Value Delivered |
|---|---|
| **Trainer (admin)** | Full CRM for client management: invitations, subscriptions, payment tracking, routine assignment, exercise library |
| **Student (client)** | Mobile-friendly portal: view assigned routine, log workouts, track progress, manage account |

### Platform Characteristics

- **Multi-role SaaS**: Single deployment, role-based UX separation (Trainer vs Student)
- **Trainer-scoped data**: Each trainer's students, plans, exercises, and routines are fully isolated
- **Email-driven onboarding**: Students are invited via email tokens, no manual account creation required
- **Asynchronous billing alerts**: Daily cron job notifies trainers and students of upcoming and overdue payments

---

## 2. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              React SPA (frontend-app)                   │   │
│   │   Vite 8 · React 19 · TypeScript · TailwindCSS 4        │   │
│   │   Zustand · React Query · React Router 7 · Shadcn UI    │   │
│   └────────────────────────┬────────────────────────────────┘   │
│                            │ HTTPS / REST                        │
└────────────────────────────┼─────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                        API LAYER                                 │
│                            │                                     │
│   ┌────────────────────────▼────────────────────────────────┐   │
│   │              Express.js API Server (backend)             │   │
│   │   Express 5 · TypeScript 6 · Zod · JWT · bcrypt         │   │
│   │                                                          │   │
│   │  ┌───────────┐  ┌───────────┐  ┌──────────────────────┐ │   │
│   │  │   Auth    │  │  Modules  │  │  Shared Middleware    │ │   │
│   │  │  Module   │  │ (10 feat) │  │  requireAuth         │ │   │
│   │  └───────────┘  └───────────┘  │  requireRole         │ │   │
│   │                                │  validate (Zod)      │ │   │
│   │  ┌───────────────────────────┐ │  error-handler       │ │   │
│   │  │   Infrastructure Layer    │ └──────────────────────┘ │   │
│   │  │  Prisma ORM · Resend      │                          │   │
│   │  │  node-cron jobs           │                          │   │
│   │  └───────────────────────────┘                          │   │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                      DATA LAYER                                  │
│                                                                  │
│   ┌────────────────────────▼────────────────────────────────┐   │
│   │         PostgreSQL on Supabase                          │   │
│   │         pgBouncer connection pooling                    │   │
│   │         17 models · Prisma Migrate                      │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                   EXTERNAL SERVICES                              │
│                                                                  │
│   ┌──────────────┐   ┌──────────────┐   ┌─────────────────────┐ │
│   │    Resend    │   │   Supabase   │   │     Vercel          │ │
│   │  Email API   │   │  PostgreSQL  │   │  Frontend Hosting   │ │
│   └──────────────┘   └──────────────┘   └─────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Technology Stack Summary

| Layer | Technology | Version |
|---|---|---|
| Frontend Framework | React | 19.2.4 |
| Frontend Build | Vite | 8.0.4 |
| Frontend Language | TypeScript | 5.8.3 |
| Frontend Styling | TailwindCSS + Shadcn UI | 4.2.2 |
| Client State | Zustand | 5.0.12 |
| Server State / Cache | TanStack React Query | 5.96.2 |
| Routing | React Router | 7.14.0 |
| HTTP Client | Axios | 1.14.0 |
| Form Handling | React Hook Form + Zod | 7.72.1 |
| Backend Framework | Express.js | 5.2.1 |
| Backend Language | TypeScript | 6.0.2 |
| Input Validation | Zod | 4.3.6 |
| ORM | Prisma | 6.16.3 |
| Database | PostgreSQL (Supabase) | latest |
| Auth | JWT (jsonwebtoken) | 9.0.3 |
| Password Hashing | bcrypt | 6.0.0 |
| Email Service | Resend | 6.10.0 |
| Scheduler | node-cron | 4.2.1 |
| Security Headers | Helmet | 8.1.0 |
| HTTP Logging | Morgan | 1.10.1 |

---

## 3. Backend Service

### Directory Structure

```
backend/
├── src/
│   ├── server.ts                     # Entry point — binds port, starts cron jobs
│   ├── app.ts                        # Express app setup — middleware, routes
│   │
│   ├── infrastructure/
│   │   ├── db/
│   │   │   └── prisma.ts             # Singleton Prisma client
│   │   ├── email/
│   │   │   ├── email.service.ts      # Email templates (5 types)
│   │   │   └── resend.ts             # Resend client
│   │   └── jobs/
│   │       └── payment-alerts.job.ts # Daily payment alert cron
│   │
│   ├── modules/                      # Feature modules (one folder per domain)
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.schema.ts        # Zod validation schemas
│   │   │   ├── auth.dto.ts
│   │   │   └── auth.mapper.ts
│   │   ├── students/
│   │   ├── trainers/
│   │   ├── plans/
│   │   ├── subscriptions/
│   │   ├── payments/
│   │   ├── exercises/
│   │   ├── routines/
│   │   └── student-portal/
│   │
│   ├── routes/
│   │   └── index.ts                  # Aggregates all module routes under /api
│   │
│   └── shared/
│       ├── errors/
│       │   ├── app-error.ts          # Custom AppError(message, statusCode, details?)
│       │   └── async-handler.ts      # Wraps async controllers, forwards errors
│       ├── middlewares/
│       │   ├── require-auth.ts       # JWT verification → req.user
│       │   ├── require-role.ts       # RBAC enforcement
│       │   ├── require-admin-secret.ts
│       │   ├── validate.ts           # Zod body validation
│       │   ├── error-handler.ts      # Global error handler
│       │   └── not-found.ts          # 404 fallback
│       ├── responses/
│       │   └── api-response.ts       # success() / error() envelope helpers
│       ├── types/
│       │   └── express.d.ts          # Augments Request with req.user
│       └── utils/
│           ├── hash.ts               # bcrypt wrappers
│           ├── jwt.ts                # sign / verify
│           └── token.ts              # Invitation token generation + hashing
│
├── prisma/
│   ├── schema.prisma                 # Source of truth for DB schema
│   └── seed.ts                       # Seed script (muscle groups, equipment, exercises)
│
└── package.json
```

### Module Pattern

Every feature module follows a consistent 4-layer pattern:

```
routes.ts → controller.ts → service.ts → prisma.ts (DB)
```

- **Routes**: Wires HTTP verbs + paths to controller methods, applies middleware
- **Controller**: Parses request, calls service, sends response via `api-response`
- **Service**: Contains all business logic, interacts with Prisma directly
- **Schema** (optional): Zod schemas for this module's input validation

### API Response Envelope

All endpoints return a consistent JSON envelope:

```typescript
// Success
{ ok: true,  message: string, data?: T }

// Error
{ ok: false, message: string, errors?: ZodIssue[] }
```

HTTP status codes are semantic: `200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `500 Internal Server Error`.

### Middleware Stack (per request)

```
morgan (logging)
  → helmet (security headers)
    → cors (origin allowlist)
      → express.json() (body parsing)
        → cookie-parser
          → [route-level: requireAuth → requireRole → validate(schema)]
            → controller
              → [global error handler]
```

---

## 4. Frontend Application

### Directory Structure

```
frontend-app/src/
├── main.tsx                 # React root, QueryClient provider
├── index.css                # Tailwind directives + global styles
│
├── api/                     # One file per backend module
│   ├── client.ts            # Axios instance + auth/401 interceptors
│   ├── auth.api.ts
│   ├── students.api.ts
│   ├── trainers.api.ts
│   ├── plans.api.ts
│   ├── subscriptions.api.ts
│   ├── payments.api.ts
│   ├── exercises.api.ts
│   ├── routines.api.ts
│   ├── student-portal.api.ts
│   └── weekly-plan.api.ts
│
├── store/
│   └── auth.store.ts        # Zustand store (token, user, isAuthenticated)
│
├── hooks/
│   └── use-auth.ts          # useAuth() — reads from auth store
│
├── router/
│   └── index.tsx            # BrowserRouter routes + route guards
│
├── types/
│   └── index.ts             # Shared TypeScript types
│
├── features/                # Pages and feature-specific components
│   ├── auth/
│   │   └── pages/
│   │       ├── LoginPage.tsx
│   │       ├── ActivateAccountPage.tsx
│   │       └── ProfilePage.tsx
│   ├── dashboard/
│   │   └── pages/DashboardPage.tsx
│   ├── students/
│   │   ├── pages/
│   │   │   ├── StudentsPage.tsx
│   │   │   └── PlansPage.tsx
│   │   └── components/
│   │       ├── CreateStudentSheet.tsx
│   │       ├── StudentDetailSheet.tsx
│   │       ├── SubscriptionPanel.tsx
│   │       └── RoutinePanel.tsx
│   ├── exercises/
│   │   ├── pages/
│   │   │   ├── ExercisesPage.tsx
│   │   │   └── ExerciseGroupPage.tsx
│   │   └── components/ExerciseFormDialog.tsx
│   ├── routines/
│   │   └── pages/RoutinesPage.tsx
│   └── student-portal/
│       ├── pages/
│       │   ├── StudentDashboardPage.tsx
│       │   ├── StudentExercisesPage.tsx
│       │   ├── StudentProgressPage.tsx
│       │   └── StudentProfilePage.tsx
│       └── components/
│           ├── ExerciseTutorialDialog.tsx
│           └── WorkoutLogger.tsx
│
├── components/
│   ├── shared/              # Layout components shared across features
│   │   ├── AppLayout/       # Trainer shell (sidebar + header)
│   │   ├── StudentLayout/   # Student shell
│   │   ├── Sidebar/
│   │   ├── PageHeader/
│   │   └── StatusBadge/
│   └── ui/                  # Shadcn UI primitives (Button, Card, Dialog, etc.)
│
└── lib/                     # Utility functions
```

### Routing Architecture

```
/ ──────────────────────────────────────── Redirect → /login

PUBLIC
├── /login                             LoginPage
└── /activate-account                  ActivateAccountPage (token in query param)

TRAINER (requires role === "TRAINER")
└── /app/
    ├── dashboard                      DashboardPage
    ├── profile                        ProfilePage
    ├── students                       StudentsPage
    ├── plans                          PlansPage
    ├── exercises                      ExercisesPage
    ├── exercises/:slug                ExerciseGroupPage
    └── routines                       RoutinesPage

STUDENT (requires role === "STUDENT")
└── /student/
    ├── dashboard                      StudentDashboardPage
    ├── exercises                      StudentExercisesPage
    ├── progress                       StudentProgressPage
    └── profile                        StudentProfilePage

* ──────────────────────────────────────── Redirect → /login
```

Route guards (`TrainerRoute`, `StudentRoute`, `PublicRoute`) redirect if the user lacks the required role or authentication state.

### State Management Strategy

The frontend separates two categories of state:

| State Type | Tool | Storage | Use Case |
|---|---|---|---|
| **Auth (client state)** | Zustand | localStorage | Token, user object, isAuthenticated |
| **Server state** | React Query | In-memory (TTL) | API data: students, exercises, routines, etc. |

**React Query configuration** (`main.tsx`):
```typescript
staleTime: 2 * 60 * 1000      // Data is fresh for 2 minutes
gcTime:    5 * 60 * 1000      // Unused cache retained for 5 minutes
retry: 1                       // Retry failed requests once
refetchOnWindowFocus: false    // Disable aggressive refetching
```

### Axios Client — Interceptors

```
REQUEST interceptor
  └── If token present → adds "Authorization: Bearer {token}"

RESPONSE interceptor
  ├── Success (2xx) → pass through
  ├── 401 Unauthorized → clear Zustand store + redirect to /login
  └── Other errors → reject promise (handled per-component)
```

---

## 5. Database Design

### Schema Overview

The database has **17 models** organized in 5 functional domains:

```
IDENTITY & ACCESS
  User ─── Trainer
       └── Student ─── AccountInvitation

BILLING
  Trainer ─── Plan ─── Subscription ─── Installment
                               └──────── Payment

EXERCISE LIBRARY
  MuscleGroup ─── Exercise ─── Equipment
  Routine ──── RoutineExercise

TRAINING ASSIGNMENT
  Student ─── StudentRoutine ─── WeeklyExerciseOverride
                       └──────── WorkoutLog ─── WorkoutSet
```

### Entity Descriptions

#### Identity & Access

**User**
- Central authentication record. Linked 1:1 to either a Trainer or Student profile.
- Fields: `id`, `email` (unique), `passwordHash`, `role` (TRAINER | STUDENT), `status` (INVITED | ACTIVE | SUSPENDED)

**Trainer**
- Trainer-specific profile, extends User.
- Fields: `id`, `userId` (FK), `firstName`, `lastName`, `phone`
- Owns: students, plans, subscriptions, exercises, routines

**Student**
- Student record owned by a Trainer. May or may not have an active User account.
- Fields: `id`, `trainerId` (FK), `userId` (FK, nullable), `email`, `firstName`, `lastName`, `dni`, `phone`, `status` (INVITED | ACTIVE | PAUSED | INACTIVE)

**AccountInvitation**
- One-time token for account activation or password reset.
- Fields: `id`, `studentId` (FK), `createdByTrainerId` (FK), `email`, `tokenHash`, `expiresAt`, `usedAt`

#### Billing

**Plan**
- Reusable subscription template defined by a trainer.
- Fields: `id`, `trainerId`, `name`, `price`, `duration` (MONTHLY | QUARTERLY | SEMIANNUAL | ANNUAL), `isActive`

**Subscription**
- Active enrollment of a student in a plan.
- Fields: `id`, `studentId`, `planId`, `trainerId`, `startDate`, `endDate`, `status` (ACTIVE | EXPIRED | CANCELLED)
- Auto-generates Installments on creation.

**Installment**
- Individual payment obligation within a subscription.
- Fields: `id`, `subscriptionId`, `trainerId`, `amount`, `dueDate`, `status` (PENDING | PAID | OVERDUE), `paidAt`, `frequency` (BIWEEKLY | MONTHLY)

**Payment**
- Manual payment record attached to a subscription.
- Fields: `id`, `subscriptionId`, `trainerId`, `amount`, `paidAt`, `notes`

#### Exercise Library

**MuscleGroup**
- Exercise category taxonomy. Fields: `id`, `name` (unique), `slug` (unique)

**Equipment**
- Equipment taxonomy. Fields: `id`, `name` (unique)

**Exercise**
- Individual exercise definition. Can be global (shared across all trainers) or trainer-specific.
- Fields: `id`, `muscleGroupId`, `trainerId` (nullable), `equipmentId`, `name`, `description`, `difficulty` (BEGINNER | INTERMEDIATE | ADVANCED), `movementType` (PUSH | PULL | HINGE | SQUAT | CARRY | CORE | CARDIO | OLYMPIC), `mediaType` (GIF | YOUTUBE), `mediaUrl`, `isGlobal`

**Routine**
- A named training program composed of exercises organized by day.
- Fields: `id`, `trainerId` (nullable), `name`, `description`, `isGlobal`

**RoutineExercise**
- A specific exercise within a routine, on a given day of the week, with prescription parameters.
- Fields: `id`, `routineId`, `exerciseId`, `dayOfWeek` (MONDAY–SUNDAY), `sets`, `reps`, `weight`, `rpe`, `restTime`, `notes`, `order`

#### Training Assignment

**StudentRoutine**
- Assignment of a Routine to a Student. Tracks current week and active status.
- Fields: `id`, `studentId`, `routineId`, `isActive`, `startedAt`, `currentWeek`

**WeeklyExerciseOverride**
- Week-specific parameter adjustments (progressive overload) for a student's assigned exercises.
- Fields: `id`, `studentRoutineId`, `routineExerciseId`, `weekNumber`, `sets`, `reps`, `weight`, `rpe` (composite unique on `studentRoutineId + routineExerciseId + weekNumber`)

**WorkoutLog**
- A single training session record.
- Fields: `id`, `studentRoutineId`, `date`, `notes`, `completedAt`

**WorkoutSet**
- Actual set data logged during a workout session.
- Fields: `id`, `workoutLogId`, `routineExerciseId`, `setNumber`, `reps`, `weight`, `rpe`, `notes`

### Key Indexes

- `User.email` — unique index (login lookup)
- `Student.trainerId` — foreign key index (trainer's student list)
- `Subscription.endDate` — index (expiring subscriptions query)
- `Installment.dueDate` — index (payment alerts cron)
- `Exercise.isGlobal` — index (library filtering)
- `RoutineExercise.(routineId, dayOfWeek)` — composite (weekly schedule view)
- `WeeklyExerciseOverride.(studentRoutineId, routineExerciseId, weekNumber)` — unique composite

---

## 6. Authentication & Authorization

### JWT Token Flow

```
Client                          Server
  │                               │
  ├─── POST /api/auth/login ──────►│
  │    { email, password }         │ 1. Lookup User by email
  │                                │ 2. bcrypt.compare(password, hash)
  │                                │ 3. Check User.status === ACTIVE
  │                                │ 4. jwt.sign({ userId, email, role }, secret, { expiresIn: "24h" })
  │◄── 200 { token, user } ────────┤
  │                                │
  ├─── GET /api/... ──────────────►│
  │    Authorization: Bearer {token}│ 1. Extract token from header
  │                                │ 2. jwt.verify(token, secret)
  │                                │ 3. req.user = { userId, email, role }
  │◄── 200 { ok, data } ───────────┤
```

**Token spec**:
- Algorithm: HS256
- Expiry: 24 hours
- Payload: `{ userId: string, email: string, role: "TRAINER" | "STUDENT" }`
- No refresh token (stateless; re-login required after expiry)

### Account Activation Flow

```
Trainer                    Server                     Student
   │                          │                          │
   ├── POST /students ────────►│                          │
   │   { email, ... }          │ 1. Create Student (INVITED)
   │                           │ 2. Create User (INVITED, no password)
   │                           │ 3. Generate token → hash → store in AccountInvitation
   │                           │ 4. Send email with link
   │                           │    {APP_URL}/activate-account?token={raw}
   │◄── 201 ──────────────────┤                          │
   │                           │          ◄──── Click link ┤
   │                           │◄── POST /auth/activate-account
   │                           │    { token, password }   │
   │                           │ 1. Hash token, find invitation
   │                           │ 2. Check !usedAt && expiresAt > now
   │                           │ 3. bcrypt.hash(password)
   │                           │ 4. Update User.passwordHash, status → ACTIVE
   │                           │ 5. Update Student.status → ACTIVE
   │                           │ 6. Mark invitation usedAt
   │                           ├── 200 ──────────────────►│
```

### RBAC Matrix

| Route Group | Middleware | Access |
|---|---|---|
| `POST /auth/login` | none | Public |
| `POST /auth/activate-account` | none | Public (token-gated) |
| `GET /auth/me` | requireAuth | Any authenticated user |
| `GET /trainers/profile` | requireAuth + requireRole(TRAINER) | TRAINER only |
| `* /students/*` | requireAuth + requireRole(TRAINER) | TRAINER only |
| `* /plans/*` | requireAuth + requireRole(TRAINER) | TRAINER only |
| `* /subscriptions/*` | requireAuth + requireRole(TRAINER) | TRAINER only |
| `* /exercises/*` | requireAuth + requireRole(TRAINER) | TRAINER only |
| `* /routines/*` | requireAuth + requireRole(TRAINER) | TRAINER only |
| `* /student/*` | requireAuth + requireRole(STUDENT) | STUDENT only |
| `POST /run-alerts` | requireAdminSecret | CRON_SECRET header |

---

## 7. Email & Notification System

### Provider

**Primary**: Resend API (`@resend/resend`)  
**From address**: `FitPro <noreply@varelab.com>`  
**Domain**: `varelab.com`

### Email Types

| Email | Trigger | Recipient | Content |
|---|---|---|---|
| **Account Invitation** | `POST /students` (new student) | Student | Activation link (24h TTL) |
| **Password Reset** | `POST /students/:id/reset-password` | Student | New activation link (24h TTL) |
| **Installment Due (7 days)** | Daily cron | Student | Payment reminder — 7 days out |
| **Installment Due (1 day)** | Daily cron | Student | Payment reminder — tomorrow |
| **Installment Due (today)** | Daily cron | Student | Payment reminder — due today |
| **Installment Overdue** | Daily cron | Student | Overdue payment notice |
| **Trainer Digest** | Daily cron | Trainer | Summary of overdue + expiring subscriptions |

### Email Link Pattern

Activation and reset emails include a link formatted as:

```
{APP_URL}/activate-account?token={raw_token}
```

The raw token is hashed (SHA-256 or similar) before storage. Verification hashes the incoming token and compares against the stored hash — raw token never persisted.

---

## 8. Scheduled Jobs

### Payment Alerts Job

**File**: `backend/src/infrastructure/jobs/payment-alerts.job.ts`  
**Scheduler**: `node-cron`  
**Startup**: `startPaymentAlertsJob()` called in `server.ts`  
**Manual trigger**: `POST /api/run-alerts` with `x-cron-secret: {CRON_SECRET}`

**Logic per run**:

```
1. Query all Trainers
2. For each Trainer:
   a. Find Installments where:
      - dueDate = today                → send student "due today" email
      - dueDate = today + 1 day       → send student "due tomorrow" email
      - dueDate = today + 7 days      → send student "due in 7 days" email
      - dueDate < today, status=PENDING → send student "overdue" email
   b. Collect all overdue + expiring-soon installments
   c. Send Trainer digest email (summary)
```

**Idempotency**: No deduplication guard — running the job twice on the same day sends duplicate emails. This is a known limitation (see §15).

---

## 9. Deployment & Infrastructure

### Frontend — Vercel

```
Build command : tsc -b && vite build
Output dir    : dist/
Node version  : as configured in Vercel project
```

**`vercel.json`** rewrites all routes to `index.html` to support client-side routing:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Environment variable required: `VITE_API_URL` (Vercel project settings).

### Backend — Node.js Host (Railway / Render / AWS / etc.)

```
Build : tsc → dist/
Start : node dist/server.js
Port  : process.env.PORT (default: 4000)
```

Required environment variables: see §10.

### Database — Supabase PostgreSQL

- **Pooled connection** (pgBouncer): used by the running application (`DATABASE_URL`)
- **Direct connection**: used by `prisma migrate` only (`DIRECT_URL`)
- Region: `aws-1-us-east-1` (us-east-1)

### CORS Configuration

```typescript
ALLOWED_ORIGINS=http://localhost:5173,https://your-production-domain.com
```

Configured in `app.ts` via the `cors` package with an origin allowlist.

---

## 10. Environment Configuration

### Backend `.env`

```bash
# Server
PORT=4000
NODE_ENV=production

# Database (Supabase)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[password]@db.[ref].supabase.co:5432/postgres"

# Auth
JWT_ACCESS_SECRET="<strong-random-secret>"
JWT_REFRESH_SECRET="<strong-random-secret>"

# Application
APP_URL="https://your-frontend-domain.com"
API_URL="https://your-api-domain.com"
ALLOWED_ORIGINS="https://your-frontend-domain.com"

# Email
RESEND_API_KEY="re_..."

# Admin / Cron protection
ADMIN_SECRET="<strong-random-secret>"
CRON_SECRET="<strong-random-secret>"
```

### Frontend `.env`

```bash
VITE_API_URL=https://your-api-domain.com/api
```

---

## 11. API Reference

### Base URL

```
http://localhost:4000/api      (development)
https://{api-domain}/api       (production)
```

### Auth Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/login` | Public | Login with email + password |
| `POST` | `/auth/activate-account` | Public | Activate account via token + set password |
| `GET` | `/auth/me` | Bearer | Get current user profile |
| `POST` | `/auth/change-password` | Bearer | Change own password |

### Trainer Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/trainers/profile` | TRAINER | Get trainer profile |
| `PATCH` | `/trainers/profile` | TRAINER | Update trainer profile |

### Student Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/students` | TRAINER | List students (paginated) |
| `POST` | `/students` | TRAINER | Create student + send invitation |
| `GET` | `/students/:id` | TRAINER | Get student by ID |
| `PATCH` | `/students/:id` | TRAINER | Update student |
| `DELETE` | `/students/:id` | TRAINER | Delete student |
| `POST` | `/students/:id/resend-invitation` | TRAINER | Resend invitation email |
| `POST` | `/students/:id/reset-password` | TRAINER | Send password reset email |
| `GET` | `/students/:id/summary` | TRAINER | Student details + subscription info |
| `POST` | `/students/:id/assign-routine` | TRAINER | Assign a routine to student |
| `GET` | `/students/:id/active-routine` | TRAINER | Get student's active routine |
| `GET` | `/students/:id/workout-history` | TRAINER | Get student's workout logs |

### Plan Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/plans` | TRAINER | List trainer's plans |
| `POST` | `/plans` | TRAINER | Create plan |
| `PATCH` | `/plans/:id` | TRAINER | Update plan |
| `DELETE` | `/plans/:id` | TRAINER | Delete plan |

### Subscription Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/subscriptions/student/:studentId` | TRAINER | Get student's active subscription |
| `GET` | `/subscriptions/expiring` | TRAINER | List expiring subscriptions |
| `POST` | `/subscriptions` | TRAINER | Create subscription (auto-generates installments) |
| `POST` | `/subscriptions/installments/:id/pay` | TRAINER | Mark installment as paid |
| `DELETE` | `/subscriptions/:id` | TRAINER | Cancel subscription |

### Exercise Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/exercises` | TRAINER | List global + trainer's exercises |
| `GET` | `/exercises/by-muscle-group/:slug` | TRAINER | Exercises grouped by muscle |
| `POST` | `/exercises` | TRAINER | Create exercise |
| `PATCH` | `/exercises/:id` | TRAINER | Update exercise |
| `DELETE` | `/exercises/:id` | TRAINER | Delete exercise |

### Routine Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/routines` | TRAINER | List routines |
| `GET` | `/routines/:id` | TRAINER | Get routine with exercises |
| `POST` | `/routines` | TRAINER | Create routine |
| `PATCH` | `/routines/:id` | TRAINER | Update routine |
| `DELETE` | `/routines/:id` | TRAINER | Delete routine |
| `POST` | `/routines/:id/exercises` | TRAINER | Add exercise to routine |
| `PATCH` | `/routines/:id/exercises/:exerciseId` | TRAINER | Update routine exercise |
| `DELETE` | `/routines/:id/exercises/:exerciseId` | TRAINER | Remove exercise from routine |

### Student Portal Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/student/dashboard` | STUDENT | Student dashboard data |
| `GET` | `/student/exercises` | STUDENT | Current week routine exercises |
| `GET` | `/student/progress` | STUDENT | Progress metrics and charts |
| `POST` | `/student/workout/log` | STUDENT | Start a workout log session |
| `POST` | `/student/workout/set` | STUDENT | Log a workout set |

### Admin Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/run-alerts` | `x-cron-secret` | Manually trigger payment alerts job |

---

## 12. Data Flow Diagrams

### Student Invitation & Onboarding

```
Trainer creates student
         │
         ▼
  POST /api/students
         │
         ├── Create Student (INVITED)
         ├── Create User (INVITED)
         ├── Generate random token
         ├── SHA-hash token → AccountInvitation
         └── Send invitation email (Resend)
                  │
                  ▼
         Student receives email
                  │
                  ▼
  GET /activate-account?token=xxx   (Frontend)
                  │
                  ▼
  POST /api/auth/activate-account
    { token: "xxx", password: "..." }
         │
         ├── Hash token → lookup AccountInvitation
         ├── Validate: !usedAt && expiresAt > now
         ├── bcrypt.hash(password) → User.passwordHash
         ├── User.status → ACTIVE
         ├── Student.status → ACTIVE
         └── AccountInvitation.usedAt → now
                  │
                  ▼
         Student logs in normally
```

### Subscription & Payment Lifecycle

```
Trainer creates subscription
         │
         ▼
  POST /api/subscriptions
  { studentId, planId, startDate, endDate, frequency }
         │
         ├── Create Subscription (ACTIVE)
         └── Auto-generate Installments
              MONTHLY: 1 installment per month
              BIWEEKLY: 1 installment per 2 weeks
                  │
                  ▼ (daily cron)
         Payment alert job runs
                  │
                  ├── dueDate = today + 7  → send student warning
                  ├── dueDate = today + 1  → send student reminder
                  ├── dueDate = today      → send student due notice
                  └── dueDate < today      → send student overdue + trainer digest
                  │
                  ▼ (trainer marks payment)
  POST /api/subscriptions/installments/:id/pay
         │
         └── Installment.status → PAID, paidAt → now
```

### Workout Logging Flow

```
Trainer assigns routine to student
  POST /api/students/:id/assign-routine
         │
         └── Create StudentRoutine (isActive: true, currentWeek: 1)

Student views exercises
  GET /api/student/exercises
         │
         └── Fetch StudentRoutine → RoutineExercise[] for current week
             Apply WeeklyExerciseOverride if exists

Student logs workout
  POST /api/student/workout/log      → Create WorkoutLog (date, studentRoutineId)
  POST /api/student/workout/set (×N) → Create WorkoutSet per exercise set
```

---

## 13. Security Model

### Implemented Controls

| Control | Implementation | Scope |
|---|---|---|
| Password hashing | bcrypt (adaptive rounds) | User passwords |
| Token hashing | SHA-based hashing | Invitation/reset tokens |
| JWT signing | HS256, 24h expiry | API authentication |
| CORS | Allowlist-based origin check | API layer |
| Security headers | Helmet.js | HTTP layer |
| Role enforcement | `requireRole` middleware | Every protected route |
| Admin endpoint protection | `x-cron-secret` header | `/run-alerts` |
| Input validation | Zod schemas on all inputs | API layer |
| Data isolation | Trainer-scoped Prisma queries | All data access |

### Data Isolation Model

Every query in the trainer's modules is scoped by `trainerId`. There is no shared data access between trainers. Example:

```typescript
// students.service.ts
prisma.student.findMany({ where: { trainerId: req.user.trainerId } })
```

### Known Security Gaps (Roadmap)

- No refresh token rotation (24h expiry = long window if token is stolen)
- No rate limiting on `/auth/login` (brute-force risk)
- No email rate limiting on `/students/:id/resend-invitation`
- JWT secret rotation requires server restart + user re-login
- No audit log for sensitive mutations (subscription cancellations, payment records)

---

## 14. Performance Considerations

### Database

- **Connection pooling**: pgBouncer via Supabase pooler keeps connection count low under load
- **Selective includes**: Prisma queries use explicit `include`/`select` to avoid N+1 and over-fetching
- **Indexed lookups**: All FK columns and high-cardinality filter fields are indexed
- **Pagination**: `/students` list endpoint supports pagination to bound result set size

### Frontend

- **React Query cache**: 2-minute stale time reduces redundant API calls on navigation
- **Route-level code splitting**: React Router lazy-loads each page bundle, reducing initial load
- **TailwindCSS JIT**: Only CSS used in source is emitted to the final bundle
- **Vite build**: ESBuild + Rollup — sub-second HMR in development, optimized production bundles

### Backend

- **`async-handler` wrapper**: Prevents unhandled promise rejections from crashing the process
- **Global error handler**: Centralized, so error paths are never undefined

---

## 15. Known Limitations & Roadmap

### Current Limitations

| Issue | Impact | Priority |
|---|---|---|
| No refresh token | Users forced to re-login every 24h | High |
| No rate limiting | Brute-force on login endpoint possible | High |
| Cron job not idempotent | Duplicate emails if job runs twice/day | Medium |
| No test suite | Regressions caught manually only | Medium |
| No API documentation (Swagger) | Onboarding friction for new developers | Medium |
| JWT secret not rotatable at runtime | All sessions invalidated on secret change | Medium |
| No soft-delete on Student/User | Data is permanently deleted | Low |
| No audit log | No history of payment/subscription changes | Low |
| No offline workout logging | Student needs connectivity to log sets | Low |

### Suggested Roadmap (Priority Order)

1. **Refresh token rotation** — short-lived access tokens (15min) + long-lived refresh (7d), stored in httpOnly cookie
2. **Rate limiting** — `express-rate-limit` on `/auth/login`, invitation endpoints
3. **Cron idempotency** — Track last-sent timestamp per installment to prevent duplicate alerts
4. **Unit + integration tests** — `vitest` for services, `supertest` for API integration tests
5. **OpenAPI / Swagger** — Auto-generate from Zod schemas using `zod-to-openapi`
6. **Soft delete** — `deletedAt` column on Student, Subscription, User; filter in all queries
7. **Audit log table** — Immutable append-only log for billing mutations
8. **Two-factor authentication** — TOTP for trainer accounts (protect financial data)
9. **WebSocket notifications** — Real-time payment alerts in trainer dashboard
10. **Offline-first student app** — Service Worker + IndexedDB for workout logging without connectivity
