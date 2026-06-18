# HANDOFF — PatchOps Agentic CR Management System

**Session end:** Phase 13 (packaging) complete. MVP is feature-complete and demo-ready.

---

## What was built (complete)

Full-stack production-grade application. All 13 phases delivered:

- **Phase 1–4:** DB schema, models, seed SQL, Docker Compose
- **Phase 5–6:** Celery worker, all 4 agent tasks, WinRM mock, Gemini integration
- **Phase 7:** SSE log streaming (StreamingResponse + manual encoder, BigSerial cursor)
- **Phase 8–11:** Full React frontend (all pages, components, hooks, design system)
- **Phase 12:** Tests deferred (explicitly out of scope for MVP)
- **Phase 13:** README, HANDOFF, zip packaging

---

## Current state

**All files present and complete. No stubs or TODOs in critical paths.**

Backend services are mocked where real infra isn't available:
- `WINRM_MOCK_MODE=true` in `.env` — WinRM returns simulated results
- ServiceNow webhook tested via curl (no live PDI required)
- Email sends are logged if SMTP not configured

---

## Architecture decisions to remember

### SSE Streaming (Phase 7 hard-won)
- Uses `StreamingResponse` + manual `_sse_encode()` async generator — NOT `sse-starlette` (3.4.4 drops connections silently)
- Does NOT call `request.is_disconnected()` inside the generator (ASGI receive unavailable in this pattern)
- Long-polls PostgreSQL `agent_logs` table using BigSerial `id` as cursor
- Frontend: `useLogStream` hook does 2-phase: REST backlog fetch first, then EventSource subscription
- One SSE connection per CR, client-side filtering by agent/level

### SQLAlchemy async + rollback
- Always materialize ORM attributes into Pydantic/dataclass objects BEFORE calling `session.rollback()` in async contexts
- Reason: rollback expires loaded objects; subsequent attribute access triggers synchronous lazy-load → `MissingGreenlet` error

### Celery worker pattern
- `celery_app.py` defines beat schedule (change window monitor every 60s)
- All 4 agents are Celery tasks chained in `tasks.py`
- Agent tasks use `asyncio.run()` internally to call async DB/service code
- Abort is cooperative: each agent phase checks `cr.abort_requested` between major steps

### Advisory locks
- CR-level: salt `1001` — prevents duplicate concurrent execution of same CR
- Task-level: salt `2002` — prevents duplicate server task execution

### RBAC
- Two roles: `user` (all read + execute flows) and `admin` (+ Knowledge Base write, Team management)
- JWT-based: `get_current_user` dep in FastAPI, role check via `require_admin` dep
- In UI: Knowledge Base and Team pages only show in sidebar for admin users
- UI never uses the word "RBAC" — admin-gated features are just called "admin access"

### Knowledge Base design
- Dependency graph: directed edges, no full adjacency matrix stored — edges only
- Scheduled reboot windows: timezone + time range + reason — NO individual server rows; server TZ detected at runtime via WinRM `Get-TimeZone`
- Service pause configs: per-server, per-service, with PS1 script name
- AI verifier: sends entire edge list to Gemini, gets back cycle detection + reasoning

---

## Pending / known gaps

1. **Tests (Phase 12)** — explicitly deferred. If adding: pytest-asyncio for FastAPI, Vitest + React Testing Library for frontend
2. **Alembic migrations** — seed.sql uses raw DDL; for production add `alembic init` and generate initial migration from models
3. **ServiceNow attachment download** — `servicenow_service.py` has the API call structure; needs real PDI credentials to test end-to-end
4. **WinRM SSL** — `WINRM_USE_SSL=false` currently; production should use HTTPS/WinRM over port 5986
5. **Frontend VITE_API_BASE_URL** — set correctly in `.env` for non-localhost deployments

---

## Seed users (password: `secret` for all)

| Email | Role |
|---|---|
| sarah.chen@company.com | admin |
| james.patel@company.com | admin |
| maria.silva@company.com | user |
| alex.kumar@company.com | user |
| liu.wei@company.com | user |

---

## If starting a new session

1. Unzip `patchops.zip` → `cd patchops`
2. Read this HANDOFF.md
3. Read README.md for full architecture context
4. Check `scripts/seed.sql` for the data model
5. The most complex files are:
   - `backend/app/worker/tasks.py` (828 lines, all 4 agents)
   - `frontend/src/pages/CRDetailPage.tsx` (590 lines, full pipeline UI)
   - `frontend/src/pages/KnowledgeBasePage.tsx` (545 lines, 3-tab KB)
   - `backend/app/api/routes/change_requests.py` (393 lines, SSE + all CR endpoints)

---

## If deploying to Azure VM

```bash
# On the Azure VM (Windows Server with Docker Desktop or Linux VM)
scp patchops.zip azureuser@<vm-ip>:~/
ssh azureuser@<vm-ip>
unzip patchops.zip && cd patchops
# Edit .env with real keys
docker compose up --build -d
# Open ports 3000 and 8000 in NSG inbound rules
```

For WinRM against real servers:
1. Set `WINRM_MOCK_MODE=false` in `.env`
2. Set `WINRM_USERNAME`, `WINRM_PASSWORD`
3. Ensure target servers have WinRM enabled: `Enable-PSRemoting -Force`
4. Add target server IPs to Windows Firewall exceptions for WinRM (port 5985/5986)
