# FoodNet Standalone Backend Migration Guidelines (Phase-Wise)

AI agents working in this workspace must proceed strictly phase-by-phase. Before implementing any task, the agent must check the current phase status, verify the requirements of previous phases, and checkpoint the work before proceeding to subsequent phases.

---

## 🚦 Phase Status Tracker

- `[x]` **Phase 1: Project Setup & Initialization** (Complete)
- `[x]` **Phase 2: Database Layer & Prisma Migration** (Complete)
- `[x]` **Phase 3: OCR, Normalizer, and AI Services** (Complete)
- `[x]` **Phase 4: Express Server & Security Middleware** (Complete)
- `[x]` **Phase 5: MQ & Worker Integration** (Complete)
- `[x]` **Phase 6: Frontend Integration & Polling Fix** (Complete)
- `[x]` **Phase 7: Docker Containerization** (Complete)
- `[/]` **Phase 8: End-to-End Verification** (CURRENT ACTIVE PHASE)

---

## 📦 General Agent Constraints

### TypeScript Module Resolution (NodeNext)
- The backend utilizes `"moduleResolution": "NodeNext"` in [tsconfig.json](file:///Users/shraddha/projects/FoodNet/backend/tsconfig.json).
- **CRITICAL:** All relative and absolute imports in backend TypeScript files (`.ts` or `.tsx`) must specify the compiled JavaScript file extension (`.js`).
  - **Correct:** `import { getImageSignedUrl } from '../services/storage.service.js';`
  - **Incorrect:** `import { getImageSignedUrl } from '../services/storage.service';`

### Service Access & Ports
- **REST API:** Express server listens on host port `4000`.
- **Database:** Neon Serverless PostgreSQL connectivity.
- **Cache/MQ:** Redis listening on host port `6379` (mapped from Docker container).

---

## 🗺️ Migration Phases Details

### Phase 1: Project Setup & Initialization
*   **Goal:** Initialize backend workspace.
*   **Status:** `Completed`. Verified basic typescript Express health server starts.

### Phase 2: Database Layer & Prisma Migration
*   **Goal:** Migrate database configurations, schemas, and seeding.
*   **Status:** `Completed`. Backend schema generates client code, pooler configured, seed script tested.

### Phase 3: OCR, Normalizer, and AI Services
*   **Goal:** Port core business logic (text extraction, ingredient normalization, and Ollama/OpenAI AI evaluation).
*   **Status:** `Completed`. `ocr.service.ts`, `normalizer.service.ts`, `analyzer.service.ts`, and `ai.service.ts` are ready.

### Phase 4: Express Server & Security Middleware
*   **Goal:** Create REST API routes and apply CORS, Helmet, and Redis-backed rate limiting.
*   **Status:** `Completed`. Endpoints verified locally on port `4000`.

### Phase 5: MQ & Worker Integration
*   **Goal:** Integrate Redis queue, BullMQ, and background worker daemon.
*   **Status:** `Completed`. Local Redis docker container configured with port forwarding (`6379:6379`) and started. BullMQ background worker daemon runs to process `analyze` queue.

### Phase 6: Frontend Integration & Polling Fix (CURRENT PHASE)
*   **Goal:** Connect the Next.js frontend to the standalone Express backend.
*   **Tasks:**
    1.  Update frontend fetch calls targeting backend to use `NEXT_PUBLIC_API_URL` (typically `http://localhost:4000` for backend).
    2.  Fix redirect behavior in the frontend: poll `/api/v1/analyze/status/:id` and only redirect to the report page `/scan/[id]` once the job status is `'completed'`.
*   **Checkpoint & Verification:** Start both backend Express and frontend Next.js dev servers, perform full scan flow, and ensure no errors are thrown during redirect.

### Phase 7: Docker Containerization
*   **Goal:** Orchestrate frontend, backend, worker, redis, and ollama containers.
*   **Tasks:**
    1.  Maintain and optimize Express API server and worker Dockerfiles.
    2.  Validate Docker Compose networking and dependencies setup.

### Phase 8: End-to-End Verification
*   **Goal:** Perform final functional verification and resilience checks.
*   **Tasks:**
    1.  Test sync routes (text pasting) and async routes (image uploads).
    2.  Perform worker crash recovery test and verify cleanup script runs correctly.

---

## 🛠️ Verification Protocols
Before moving from the current phase to the next, run the following:
- Backend check: `npx tsc --noEmit` inside [backend](file:///Users/shraddha/projects/FoodNet/backend)
- Frontend check: `npm run build` or `npx tsc --noEmit` inside [frontend](file:///Users/shraddha/projects/FoodNet/frontend)
