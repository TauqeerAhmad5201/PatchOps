# PatchOps — Agentic CR Management System

> Production-grade Change Request orchestration platform for Windows infrastructure patching.
> Ingests ServiceNow CRs, runs a 4-agent AI pipeline (Gemini), streams real-time logs, validates server health, and creates incidents on failures.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [File Tree](#file-tree)
4. [Prerequisites](#prerequisites)
5. [Quick Start](#quick-start)
6. [Configuration](#configuration)
7. [Verification Steps](#verification-steps)
8. [Agent Pipeline](#agent-pipeline)
9. [Knowledge Base](#knowledge-base)
10. [API Reference](#api-reference)
11. [Seed Data](#seed-data)
12. [Production Notes](#production-notes)

---

## Architecture Overview

```
ServiceNow PDI
     │  Webhook (CR created / CR approved)
     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PatchOps Platform                            │
│                                                                 │
│  React 18 + TypeScript + Tailwind v4                           │
│        ↕ REST / SSE                                             │
│  FastAPI (Python 3.12)  ←→  PostgreSQL 16                      │
│        ↕ Celery tasks                                           │
│  Redis 7  ←→  Worker (4 AI Agents via Gemini)                  │
│                    ↕ WinRM                                      │
│              Windows Servers                                    │
└─────────────────────────────────────────────────────────────────┘
```

### CR Lifecycle

```
ServiceNow Webhook → Classify (Gemini) → Queue (awaiting_approval)
    → Approval Webhook → pending (waits for change window)
    → Change window opens → Agent 1 (Baseline + Plan)
    → User ACCEPTS plan → Agent 2 (Execution, bucket-parallel)
    → User clicks GO AHEAD → Agent 3 (Validation / Health)
    → Any failures? → Agent 4 (RCA, ServiceNow incident, email)
    → completed / failed
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Tailwind v4, Vite, React Router v6 |
| Backend | FastAPI, Python 3.12, SQLAlchemy 2.x async, Pydantic v2 |
| Database | PostgreSQL 16 (BigSerial cursors, advisory locks) |
| Queue / Broker | Celery 5.x + Redis 7 |
| AI | Google Gemini (Flash-8b classify · Flash agents · Pro RCA) |
| Server Execution | WinRM + PowerShell (MOCK_MODE for demo) |
| Integrations | ServiceNow REST API, SMTP email |
| Containers | Docker Compose (6 services) |

---

## File Tree

```
patchops/
├── .env                                  # All environment variables (edit before running)
├── docker-compose.yml                    # Single-command orchestration
├── README.md
│
├── config/
│   └── settings.yaml                     # App-level config knobs (timeouts, thresholds, etc.)
│
├── scripts/
│   ├── seed.sql                          # Mock data: 5 users, 12 servers, 6 CRs, incidents
│   └── powershell/
│       └── PatchOps-Scripts.ps1          # All PS1 scripts (baseline, reboot, health, pause/resume)
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py                       # FastAPI app, CORS, router registration
│       ├── core/
│       │   ├── config.py                 # Settings from env (pydantic-settings)
│       │   ├── security.py               # JWT auth, password hashing, get_current_user
│       │   └── logging.py                # Structured JSON logging
│       ├── db/
│       │   └── session.py                # AsyncEngine, get_db dep, init_db
│       ├── models/
│       │   ├── user.py                   # User, role enum
│       │   ├── change_request.py         # ChangeRequest, ServerTask, CRStatus enums
│       │   ├── agent_run.py              # AgentRun, AgentLog (BigSerial PK for SSE cursor)
│       │   ├── knowledge.py              # DependencyEdge, ScheduledRebootWindow, ServicePauseConfig
│       │   ├── server.py                 # Server registry
│       │   └── incident.py               # Incident (ServiceNow INC, RCA analysis)
│       ├── api/routes/
│       │   ├── auth.py                   # POST /api/auth/login, /me
│       │   ├── webhooks.py               # POST /api/webhooks/servicenow (create + approve)
│       │   ├── change_requests.py        # CRUD, accept-plan, accept-execution, SSE log stream
│       │   ├── knowledge.py              # Deps, reboot windows, service pauses + AI graph verify
│       │   ├── agents.py                 # Manual agent trigger endpoints
│       │   ├── servers.py                # Server list
│       │   ├── users.py                  # User CRUD (admin only for write)
│       │   └── reports.py                # Incidents list, dashboard stats
│       ├── services/
│       │   ├── gemini_service.py         # Gemini classification, plan gen, RCA (3 models)
│       │   ├── cr_service.py             # CR business logic helpers
│       │   ├── winrm_service.py          # WinRM execution + MOCK_MODE shim
│       │   ├── servicenow_service.py     # Attachment fetch, incident create, comment add
│       │   └── email_service.py          # SMTP failure/health notifications
│       └── worker/
│           ├── celery_app.py             # Celery app + beat schedule (change window monitor)
│           └── tasks.py                  # All 4 agent tasks + change window poller
│
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── postcss.config.js
    ├── index.html
    ├── public/
    │   └── favicon.svg
    └── src/
        ├── main.tsx                      # React entry point
        ├── App.tsx                       # BrowserRouter + all routes
        ├── index.css                     # Design system: CSS vars, fonts, animations
        ├── types/
        │   └── index.ts                  # All TypeScript interfaces
        ├── lib/
        │   ├── api.ts                    # Axios client, all API call functions
        │   ├── auth-context.tsx          # AuthProvider + useAuth hook
        │   └── utils.ts                  # Formatters, cn(), STATUS_LABELS, LOG_LEVEL_COLORS
        ├── hooks/
        │   └── useLogStream.ts           # SSE hook: REST backlog + EventSource live tail
        ├── components/
        │   ├── ui.tsx                    # Full UI library (Badge, Btn, Modal, Input, etc.)
        │   ├── Sidebar.tsx               # Nav with live approval/active badges
        │   ├── Header.tsx                # Breadcrumbs + notification bell
        │   └── Layout.tsx                # Auth guard + sidebar + header wrapper
        └── pages/
            ├── LoginPage.tsx             # Glassmorphism login, demo creds pre-filled
            ├── DashboardPage.tsx         # Stat cards, CR table, search/filter/refresh
            ├── ApprovalsPage.tsx         # Awaiting-approval CR cards
            ├── ActiveRunsPage.tsx        # In-progress CRs with live server stats
            ├── CRDetailPage.tsx          # Full pipeline: plan accept → exec → validation → logs
            ├── HealthReportsPage.tsx     # Completed/failed CRs with server health
            ├── IncidentsPage.tsx         # Incident list + RCA detail modal
            ├── KnowledgeBasePage.tsx     # Admin-only: deps, reboot windows, service pauses
            └── TeamPage.tsx              # Admin-only: user CRUD table
```

---

## Prerequisites

- Docker ≥ 24 and Docker Compose v2
- Ports free: **3000** (frontend), **8000** (backend), **5432** (postgres), **6379** (redis)
- Google Gemini API key (or GCP service account with Vertex AI enabled)
- (Optional) ServiceNow PDI for live webhook testing

---

## Quick Start

### 1. Clone and configure

```bash
git clone <repo-url> && cd patchops
cp .env .env.local   # keep a backup
```

Edit `.env` — **minimum required changes**:

```dotenv
GEMINI_API_KEY=your-actual-key-here
SECRET_KEY=run-openssl-rand-hex-32-and-paste-here
```

Everything else can stay as-is for the demo.

### 2. Launch

```bash
docker compose up --build -d
```

This starts 6 containers: `postgres`, `redis`, `backend`, `worker`, `beat`, `frontend`.

PostgreSQL will auto-run `scripts/seed.sql` on first init, populating all demo data.

### 3. Open

| URL | Service |
|---|---|
| http://localhost:3000 | React UI |
| http://localhost:8000/api/docs | FastAPI Swagger |
| http://localhost:8000/api/health | Health check |

---

## Verification Steps

Run these in order to confirm every layer is healthy.

### Step 1 — Containers running

```bash
docker compose ps
```

Expected: all 6 containers show `Up` / `healthy`.

### Step 2 — Backend health

```bash
curl http://localhost:8000/api/health
# → {"status":"ok","version":"1.0.0"}
```

### Step 3 — Login and get token

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sarah.chen@company.com","password":"secret"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
echo "Token: ${TOKEN:0:40}..."
```

### Step 4 — List CRs (seeded data)

```bash
curl -s http://localhost:8000/api/crs \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -40
```

Expected: array of 6 CRs with statuses: `awaiting_approval`, `pending`, `in_progress`, `completed`, `failed`, `ignored`.

### Step 5 — Dashboard stats

```bash
curl -s http://localhost:8000/api/reports/summary \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

### Step 6 — Knowledge base (admin endpoint)

```bash
curl -s http://localhost:8000/api/knowledge/dependencies \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected: 10 dependency edges between servers.

### Step 7 — SSE log stream

```bash
# Stream logs for the in_progress CR (CHG0011003)
curl -N -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/crs/CHG0011003/logs/stream"
```

Expected: `data: {"id":...}` SSE events, then heartbeats every 15s.

### Step 8 — Simulate ServiceNow webhook

```bash
# Create a new patching CR via webhook
curl -s -X POST http://localhost:8000/api/webhooks/servicenow \
  -H "Content-Type: application/json" \
  -H "X-ServiceNow-Webhook-Secret: your-webhook-secret-token" \
  -d '{
    "event": "cr_created",
    "cr_number": "CHG0099001",
    "title": "Monthly Windows Security Patch - Q2 2025",
    "description": "Apply KB5034441 cumulative security update to all web tier servers",
    "priority": "high",
    "requested_by": "john.doe@company.com",
    "approver_email": "sarah.chen@company.com",
    "change_window_start": "2025-06-15T02:00:00Z",
    "change_window_end": "2025-06-15T06:00:00Z",
    "change_window_timezone": "UTC"
  }' | python3 -m json.tool
```

### Step 9 — Frontend UI

1. Open http://localhost:3000
2. Login: `sarah.chen@company.com` / `secret` (admin)
3. Dashboard should show 6 seeded CRs
4. Click **CHG0011003** (In Progress) → see live log stream
5. Check **Knowledge Base** (visible because you're admin)
6. Check **Incidents & RCA** → click incident to see RCA detail

---

## Agent Pipeline

### Agent 1 — Baseline & Plan (Gemini Flash)

- Fetches server list from ServiceNow attachment
- Captures pre-state of each server (CPU, memory, services, uptime) via WinRM
- Builds execution order using topological sort of dependency graph
- Applies reboot window constraints (checks server timezone at runtime)
- Generates human-readable plan summary + ordered bucket list + reasoning
- **UI gate:** User must click **Accept Plan** or **Reject** before Agent 2 runs

### Agent 2 — Execution (WinRM + PowerShell)

- Reads accepted plan, groups servers into parallel buckets by dependency level
- For each bucket, in parallel (up to `MAX_PARALLEL_REBOOTS=5`):
  - Pauses services via `Pause-Service.ps1` (if configured in KB)
  - Executes `Invoke-ServerReboot.ps1` and waits for reconnection
  - Resumes services via `Resume-Service.ps1`
  - Updates ServerTask status in real-time → streams via SSE
- **UI gate:** User clicks **Go Ahead** after seeing execution summary before Agent 3 runs

### Agent 3 — Validation (WinRM health check)

- Compares post-reboot state against stored pre-state baseline
- Flags any service that exceeds `DEVIATION_THRESHOLD_PERCENT=15`
- Sends health summary email
- Marks CR `completed` or `failed`

### Agent 4 — RCA (Gemini Pro, parallel on failures)

- Triggered automatically for each failed server
- Analyzes full agent_logs for that server + its configuration
- Creates ServiceNow incident (INC number)
- Adds structured comment to incident: root cause, remediation steps
- Sends team email with incident link

---

## Knowledge Base

Only users with `admin` role can modify the Knowledge Base.

### Dependency Graph
- Directed edges: `server_a depends_on server_b` (b must be up before a reboots)
- Topological sort builds execution buckets (Level 0 = no deps → Level N = deepest)
- AI verifier: paste modified graph → Gemini checks for cycles, unreachable nodes, logical issues

### Scheduled Reboot Windows
- Define time windows when specific server types should reboot
- No individual server rows needed — server timezone is detected at runtime via WinRM and matched

### Service Pause Configs
- Per-server rules: which service to stop before reboot, which to resume after
- PowerShell script names are configurable per entry

---

## Configuration

All knobs live in two places:

**`.env`** — secrets and connection strings (never commit to git)
**`config/settings.yaml`** — behavioral knobs (safe to commit)

Key settings in `settings.yaml`:

```yaml
agents:
  max_parallel_reboots: 5          # Max simultaneous server reboots in one bucket
  reboot_timeout_seconds: 300      # Max wait time for server to come back online
  health_check_retries: 3          # Number of health check attempts before marking failed
  health_check_interval_seconds: 30
  deviation_threshold_percent: 15  # CPU/mem deviation before flagging as issue

change_window:
  poll_interval_seconds: 60        # How often beat checks for window-ready CRs
  timezone_default: "UTC"
```

---

## Seed Data

`scripts/seed.sql` populates:

### Users (password: `secret` for all)

| Email | Role | Timezone |
|---|---|---|
| sarah.chen@company.com | admin | America/New_York |
| james.patel@company.com | admin | Asia/Kolkata |
| maria.silva@company.com | user | Europe/London |
| alex.kumar@company.com | user | Asia/Singapore |
| liu.wei@company.com | user | Asia/Shanghai |

### Servers (12 total)
Web tier (4), App tier (4), DB tier (2), Cache (1), Load Balancer (1)

### CRs (6 total — one per status)

| CR Number | Status | Description |
|---|---|---|
| CHG0011001 | awaiting_approval | Awaiting manager sign-off |
| CHG0011002 | pending | Change window starts tonight |
| CHG0011003 | in_progress | Live execution with agent logs |
| CHG0011004 | completed | All 8 servers healthy |
| CHG0011005 | failed | 2 servers failed — RCA attached |
| CHG0011006 | ignored | Non-patching CR, auto-ignored |

---

## API Reference

Full Swagger UI: http://localhost:8000/api/docs

### Key endpoints

```
POST   /api/auth/login                        Login → JWT token
POST   /api/webhooks/servicenow               ServiceNow CR create / approval events

GET    /api/crs                               List CRs (filter by status, priority)
GET    /api/crs/{cr_number}                   CR detail with tasks and latest agent run
POST   /api/crs/{cr_number}/accept-plan       Accept Agent 1 plan → trigger Agent 2
POST   /api/crs/{cr_number}/accept-execution  Go Ahead → trigger Agent 3
GET    /api/crs/{cr_number}/tasks             Server tasks for a CR
GET    /api/crs/{cr_number}/logs/stream       SSE log stream (Authorization header or ?token=)

GET    /api/knowledge/dependencies            Dependency edges
POST   /api/knowledge/dependencies            Add edge (admin)
DELETE /api/knowledge/dependencies/{id}       Remove edge (admin)
POST   /api/knowledge/dependencies/verify     AI cycle/validity check (admin)
GET    /api/knowledge/reboot-windows          Scheduled reboot windows
POST   /api/knowledge/reboot-windows          Add window (admin)
GET    /api/knowledge/service-pauses          Service pause configs
POST   /api/knowledge/service-pauses          Add config (admin)

GET    /api/reports/summary                   Dashboard stats
GET    /api/reports/incidents                 Incident list with RCA

GET    /api/users                             List users (admin)
POST   /api/users                             Create user (admin)
PATCH  /api/users/{id}                        Update user (admin)
DELETE /api/users/{id}                        Delete user (admin)
```

---

## Production Notes

1. **Replace `SECRET_KEY`** with `openssl rand -hex 32` output before deploying
2. **WinRM in production**: set `WINRM_MOCK_MODE=false` and configure actual credentials
3. **ServiceNow webhook secret**: set `WEBHOOK_SECRET` to a strong random value and configure the same in ServiceNow's outbound REST message
4. **GCP credentials**: mount a real service account JSON at the path set in `GOOGLE_APPLICATION_CREDENTIALS`, or use `GEMINI_API_KEY` for API-key-based auth
5. **HTTPS**: Put an nginx/traefik reverse proxy in front — SSE requires HTTP/1.1 keep-alive (works fine with standard nginx `proxy_pass`)
6. **Scaling**: Increase Celery `--concurrency` and `MAX_PARALLEL_REBOOTS` for larger server fleets
7. **Alembic migrations**: for schema changes, run `docker compose exec backend alembic upgrade head`
