# Cold Call Companion — DeepThought FDE

[![Python 3.9](https://img.shields.io/badge/backend-Python%203.9%20%7C%20FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/frontend-React%2018%20%7C%20TypeScript%205%20%7C%20Vite%205-61DAFB.svg)](https://vitejs.dev/)
[![Database](https://img.shields.io/badge/database-Supabase%20PostgreSQL-3ECF8E.svg)](https://supabase.com/)
[![Backend Tests](https://img.shields.io/badge/pytest-31%20passed%20%7C%201%20skipped-emerald.svg)](backend/tests/)
[![Frontend Tests](https://img.shields.io/badge/vitest-21%20passed%20(100%25)-emerald.svg)](frontend/src/test/)

**Cold Call Companion** is an executive live-call companion application engineered for B2B sales professionals. Designed to sit beside an active phone conversation, it guides callers through the **8 official cold-call stages**, records quick-tap stage outcomes, captures verbatim prospect words, tracks an append-only visit history during stage revisits, preserves all **10 distinct call outcomes**, and provides post-call summaries via Google Gemini.

Developed for the **DeepThought Forward Deployed Engineer (FDE) Assignment**.

---

## Live Demo & Verified Endpoints

The application is deployed across cloud environments and verified operational:

| Resource | Live URL | Verified Status |
|---|---|---|
| **Live Web Application** | [cold-call-companion-three.vercel.app](https://cold-call-companion-three.vercel.app) | **Online** (Deployed on Vercel, connected to backend) |
| **Backend Health Check** | [cold-call-companion-backend.onrender.com/health](https://cold-call-companion-backend.onrender.com/health) | **HTTP 200 OK** (`"status": "ok"`, `"database": "connected"`) |
| **Interactive API Docs** | [cold-call-companion-backend.onrender.com/docs](https://cold-call-companion-backend.onrender.com/docs) | **Online** (Swagger UI on Render) |
| **Public Repository** | [github.com/ArjunReddyVelma/cold-call-companion](https://github.com/ArjunReddyVelma/cold-call-companion) | **Public** (`main` branch + active fix branches) |

> **Deployment & Verification Status:**
> Frontend and backend are deployed. Core call-management functionality has passed the documented local tests (52 passed, 1 skipped). Live cloud endpoints (`/health` returning HTTP 200 with database connectivity, `/docs` Swagger UI, and the Vercel frontend) have been verified operational. While intermediate application bug fixes (UUID serialization, Gemini model and 30s timeout configuration, truncation detection, and structured section parsing) have been integrated into `main`, live AI-summary reliability under cloud execution and external provider quotas remains under active observation until verified against the deployed environment.

---

## 1. Project Overview

During high-stakes B2B cold outreach, sales reps face major operational challenges:
- **Cognitive Overload:** Balancing conversation flow while remembering stage goals, objection handles, and follow-up commitments.
- **Lost Context from Non-Linear Conversations:** Prospects frequently interrupt or loop back to previous topics (e.g., asking what a company does after hearing an objection). Overwriting earlier notes destroys call context.
- **Outcome Misclassification:** Transcripts show sales reps frequently misclassify outcomes—confusing polite dismissals with genuine interest, or leaving substantive conversations as `not_logged`.
- **Loss of Prospect Terminology:** Follow-ups fail when callers rephrase prospect statements rather than capturing exact pain points in the prospect's own words.

**Cold Call Companion** solves these problems by providing:
1. An active-call screen with live call timer, 8-stage progress tracker, and transcript-grounded guidance.
2. Quick-tap stage outcome buttons and verbatim note capture at every stage.
3. An append-only visit history engine where revisiting a stage assigns an incremented visit number without overwriting previous notes.
4. An always-accessible **End Call** modal supporting all 10 distinct outcomes and scheduled callbacks.
5. A **Past Calls** audit log with search, outcome filtering, and complete inspection of individual stage visits.
6. Server-side post-call summary generation using Google Gemini, designed with defensive fallbacks that never block call completion.

---

## 2. Architecture & Technology Stack

```
                                      +------------------------------------+
                                      |         Vercel (Frontend)          |
                                      |  React 18 + TypeScript + Vite      |
                                      |  Tailwind CSS + Lucide Icons       |
                                      +-----------------+------------------+
                                                        |
                                                        | HTTPS REST (CORS)
                                                        v
                                      +-----------------+------------------+
                                      |          Render (Backend)          |
                                      |    FastAPI (Python 3.9) + Uvicorn  |
                                      |  SQLAlchemy 2.0 ORM + Pydantic v2  |
                                      +--------+------------------+--------+
                                               |                  |
                       Configurable 30s Timeout|                  | Connection Pooler
                                               v                  v
                        +----------------------+---+   +----------+-------------+
                        |  Google Gemini API       |   | Supabase PostgreSQL    |
                        |  gemini-3.8-flash        |   | (schema.sql + triggers)|
                        |  Backend-only (summaries)|   | SQLite for local dev   |
                        +--------------------------+   +------------------------+
```

### Technology Breakdown

- **Frontend:**
  - **Framework:** React 18 with TypeScript 5
  - **Tooling:** Vite 5 bundler
  - **Styling & UI:** Tailwind CSS, Lucide React icons
  - **Testing:** Vitest + React Testing Library (21 passed tests)
  - **Hosting:** Vercel (SPA rewrites configured via `frontend/vercel.json`)
- **Backend:**
  - **Framework:** FastAPI (Python 3.9) with Uvicorn ASGI server
  - **Data Layer:** SQLAlchemy 2.0 ORM with Pydantic v2 validation schemas
  - **Testing:** Pytest with HTTPX test client (31 passed, 1 skipped)
  - **Hosting:** Render (`render.yaml` Blueprint, auto-deployed)
- **Database:**
  - **Production:** Supabase PostgreSQL with pooled connections, UUID primary keys, and timestamp triggers ([`supabase/schema.sql`](supabase/schema.sql))
  - **Local Development:** Automatic zero-config SQLite fallback (`coldcall.db`)
- **LLM Integration:**
  - **Provider:** Google Gemini API (`gemini-3.8-flash`)
  - **Location:** Executed **strictly on the backend** during call closure. The `GEMINI_API_KEY` is never exposed to the client or frontend bundles.
  - **Resilience:** Configurable request timeout (`GEMINI_TIMEOUT_SECONDS`, default 30s), token truncation detection (`finishReason=MAX_TOKENS`), automatic concise retry, and graceful fallback (`"Summary unavailable..."`). Call closure and outcome persistence never fail if the LLM is unreachable or rate-limited.

---

## 3. The 8 Official Cold-Call Stages

The 8 stages directly implement the conversational flow synthesized from **100 B2B cold-call transcripts** (see [`docs/transcript-analysis.md`](docs/transcript-analysis.md)):

| # | Stage Name | Stage Purpose | Common Prospect Response Examples | Recommended Quick-Tap Outcomes |
|---|---|---|---|---|
| **1** | **Opening** | Reach the right person and say who you are. The prospect decides in the first 10s if this call is worth a minute. | *“Speaking. Who is this, and where are you calling from?”* (`T046`, `T088`) | `Reached intended person`<br>`Reception / gatekeeper`<br>`Busy / unavailable`<br>`Wrong person / moved company` |
| **2** | **Purpose** | Say in one or two sentences why you called, in words the prospect can repeat to a colleague. | *“What do you guys actually do? Are you a consulting firm or an agency?”* (`T063`, `T084`) | `Asked what we do`<br>`Asked where number was obtained`<br>`Challenged as sales pitch / cost`<br>`Understood / allowed to continue` |
| **3** | **Permission** | Find out whether they are willing to talk now. A clear yes, no, or callback time are all valid. | *“I am in the middle of something. Can you call me back tomorrow around 11?”* (`T002`, `T014`) | `Agreed to talk now`<br>`Callback time requested`<br>`Send info first (WhatsApp/Email)`<br>`Declined / not now` |
| **4** | **Their business** | Ask about their company and work before pitching. People talk about what they do. | *“We are a manufacturing unit. We make outdoor lighting housings.”* (`T082`, `T084`) | `Shared business context`<br>`Corrected company / role assumption`<br>`Asked caller to explain first`<br>`Guarded / declined to share details` |
| **5** | **Their need, in their words** | Hear what they are trying to do or struggling with, in their own words. Caller writes down exactly what was said. | *“Our challenge is applying software and scientific execution to a factory floor.”* (`T084`) | `Named specific growth/operational need`<br>`No current need / operations stable`<br>`Questioned applicability to their sector`<br>`No clear need articulated` |
| **6** | **Objection** | Hear the reason for a no and understand it. A reason understood can be answered. | *“Honestly, we already engaged a consultant last month for this exact work.”* (`T077`, `T092`) | `Existing consultant / in-house team`<br>`Corporate / Head Office decision`<br>`Mismatch / no requirement`<br>`Brush-off (send email to dismiss)` |
| **7** | **Next step** | Agree one concrete thing: document on WhatsApp/email, call at named time, or meeting. | *“Send the report on WhatsApp to my direct number, and I will review it.”* (`T046`, `T082`) | `Agreed to report via WhatsApp`<br>`Agreed to report via Email`<br>`Scheduled follow-up call / meeting`<br>`Referral / alternate contact given` |
| **8** | **Close** | End the call clearly and log the outcome, next step, and prospect's exact words. | *“All right, send it over WhatsApp and we will talk next Thursday at 10:30.”* (`T046`, `T082`) | `Confirmed concrete next step`<br>`Polite brush-off / no commitment`<br>`Abrupt disconnect / dropped line`<br>`Caller logged mismatch noted` |

---

## 4. Features & Implemented Capabilities

### Core Implemented Functionality
- **Call Session Management:** Start a call with optional prospect name, company name, and role. Preset buttons allow loading demo personas (such as Anand Verma from Transcript `T082`).
- **Live Guidance:** Active call duration timer, 8-stage breadcrumb tracker, stage purpose reminder, and transcript-grounded prospect response examples.
- **Quick-Tap Outcomes & Verbatim Notes:** Single-click outcome logging paired with a dedicated text area for verbatim prospect words.
- **Append-Only Stage History:** Revisit any stage at any time during an active call. The backend automatically increments `visit_number` (`uq_call_stage_visit` unique constraint), keeping earlier visit notes untouched.
- **10 Distinct Call Outcomes:** Preserves all 10 standard outcomes without collapsing:
  `agreed_to_receive_report`, `next_step_agreed`, `interested`, `follow_up`, `call_again`, `not_interested`, `do_not_call`, `wrong_person`, `moved_company`, and `not_logged`.
- **Scheduled Follow-ups:** Record explicit next steps and date/time for scheduled callbacks.
- **Past Calls & Detail Inspection:** Search calls by prospect or company, filter by outcome, and view full call details including every stage visit with timestamps, selections, and verbatim quotes.
- **AI-Generated Summary:** Backend prompt synthesizes 5 concise sections (`Conversation Recap`, `Prospect Needs & Interests`, `Objections or Concerns`, `Agreed Outcome`, `Recorded Next Steps`) grounded exclusively in recorded call data. UI renders structured headings with formatted text and clean fallback banners.

### Known Limitations
- **External LLM Quota & Latency:** Google Gemini summary generation depends on external API availability and response quotas. If the API times out or truncates, the app displays a safe fallback notice (`Summary unavailable...`) rather than breaking the UI.
- **No Telephony / Audio Ingestion:** The companion is an executive desktop tool designed to sit beside an active phone conversation; it does not record audio or integrate with SIP/PSTN carriers.
- **Single-Tenant Operational Model:** Designed as a streamlined single-caller companion without multi-tenant authentication or team permission tiers.

---

## 5. Database Schema & API Reference

### Database Schema (Supabase PostgreSQL)
The reproducible schema is located at [`supabase/schema.sql`](supabase/schema.sql):

- **`calls` Table:**
  - `id`: UUID primary key (`gen_random_uuid()`)
  - `prospect_name`, `company_name`, `prospect_role`: Text fields (optional)
  - `started_at`, `ended_at`: Timestamps with time zone
  - `last_stage_reached`: Smallint (1–8)
  - `final_outcome`: Text with CHECK constraint preserving all 10 distinct outcomes
  - `next_step`, `next_step_at`: Scheduled action text and timestamp
  - `summary`: Persisted post-call AI summary text
  - `is_closed`: Boolean flag (prevents writes after call is closed)
  - `created_at`, `updated_at`: Automated trigger-maintained timestamps
- **`call_stage_results` Table:**
  - `id`: UUID primary key
  - `call_id`: UUID foreign key (`REFERENCES calls(id) ON DELETE CASCADE`)
  - `stage_number`: Smallint (CHECK 1–8)
  - `visit_number`: Integer (CHECK >= 1)
  - `selected_result`: Text
  - `prospect_words`: Text (verbatim quotes)
  - `CONSTRAINT uq_call_stage_visit UNIQUE (call_id, stage_number, visit_number)`
- **Triggers:** `trigger_set_timestamp()` automatically updates `updated_at` on row modification.

**Database Initialization:**
- **Production (Supabase):** Open the Supabase dashboard → **SQL Editor** → Paste and execute [`supabase/schema.sql`](supabase/schema.sql).
- **Local (SQLite):** Handled automatically by SQLAlchemy in `backend/app/database.py` on startup if `DATABASE_URL` is omitted.

### Backend REST API Endpoints

All endpoints are served with CORS support and OpenAPI documentation:

| Method | Endpoint | Description | Request Body | Response |
|---|---|---|---|---|
| `GET` | `/health` | Health check & DB probe | *None* | `{"status": "ok", "service": "...", "database": "connected", "timestamp": "..."}` |
| `GET` | `/v1/stages` | Catalog of 8 stages | *None* | Array of 8 stage definition objects |
| `POST` | `/v1/calls` | Start new call session | `{"prospect_name"?: str, "company_name"?: str, "prospect_role"?: str}` | `CallResponse` with UUID string `id` (HTTP 201) |
| `POST` | `/v1/calls/{id}/stages` | Record stage visit result | `{"stage_number": int, "selected_result": str, "prospect_words"?: str}` | `CallStageResultResponse` (HTTP 201) |
| `POST` | `/v1/calls/{id}/close` | Close call & record outcome | `{"final_outcome": str, "next_step"?: str, "next_step_at"?: str}` | `CallResponse` (HTTP 200) |
| `GET` | `/v1/calls` | List past calls (paginated) | Query: `?limit=50&offset=0` | `{"items": [CallResponse], "total": int}` |
| `GET` | `/v1/calls/{id}` | Full call detail & visits | *None* | `CallResponse` including full `stage_results` array |

---

## 6. Local Setup & Verification

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+ and pip
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/ArjunReddyVelma/cold-call-companion.git
cd cold-call-companion
```

### 2. Backend Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Create .env from template (defaults to local SQLite coldcall.db)
cp .env.example .env

# Start FastAPI server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- Interactive Swagger docs: `http://127.0.0.1:8000/docs`
- Health check endpoint: `http://127.0.0.1:8000/health`

### 3. Frontend Setup
```bash
cd ../frontend
npm install

# Create .env from template
cp .env.example .env

# Start Vite development server
npm run dev
```
- Web Application: `http://127.0.0.1:5173`

### 4. Environment Variables Reference

Use `.env.example` as the configuration guide. **Never commit real credentials.**

| Variable | Location | Description | Example / Default |
|---|---|---|---|
| `PORT` | Backend | Server port | `8000` |
| `ENVIRONMENT` | Backend | Environment mode | `development` / `production` |
| `FRONTEND_ORIGIN` | Backend | CORS allowed origins | `http://localhost:5173` |
| `DATABASE_URL` | Backend | Database connection string | `sqlite:///./coldcall.db` (local) or Supabase pooler URL |
| `GEMINI_API_KEY` | Backend | Google AI Studio API key | *(Optional server-side key)* |
| `GEMINI_MODEL` | Backend | Gemini model identifier | `gemini-3.8-flash` |
| `GEMINI_TIMEOUT_SECONDS` | Backend | LLM request timeout | `30.0` |
| `VITE_API_BASE_URL` | Frontend | Target backend API base URL | `http://localhost:8000` |

---

## 7. Automated Testing Suite

The repository includes comprehensive automated test suites for both backend and frontend:

```bash
# 1. Backend Pytest Suite (31 passed, 1 skipped)
cd backend
.venv/bin/pytest -v

# 2. Frontend Vitest Suite (21 passed)
cd ../frontend
npm run test -- --run

# 3. TypeScript Static Typecheck (0 errors)
npm run typecheck

# 4. Frontend Production Build
npm run build
```

### Verified Test Results Summary
- **Backend (`pytest`):** **31 passed, 1 skipped** in 0.69s.
  - Tests verify call creation, string UUID serialization, stage validation, append-only visit increments, write-rejection on closed calls, all 10 distinct outcomes, pagination, database health checks, Gemini model configuration, 30s timeout enforcement, prompt-injection defense, response truncation detection, and safe fallback.
  - 1 test (`test_postgresql_full_lifecycle`) is skipped when running in local development mode without a live PostgreSQL instance.
- **Frontend (`vitest`):** **21 passed** across 7 test suites.
  - Tests verify stage metadata, start call modal, live call screen, verbatim note capture, close call modal with 10 outcomes, past calls search and filtering, clean structured AI summary rendering without raw asterisks, and fallback notice boxes.
- **Total Automated Tests:** **52 passed, 1 skipped** (53 tests collected total; 1 skipped due to external PostgreSQL dependency in local dev).
- **TypeScript:** Strict typecheck passing cleanly with **0 errors**.
- **Production Build:** Vite bundle builds cleanly in **~1.08s**.

---

## 8. Deployment Configuration

### 1. Database: Supabase PostgreSQL
1. Create a project at [supabase.com](https://supabase.com).
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the **SQL Editor**.
3. Obtain the connection string from **Project Settings** → **Database** (Connection Pooling mode: Session or Transaction on port 5432 / 6543).

### 2. Backend: Render
- Configured via [`render.yaml`](render.yaml) Blueprint:
  - Runtime: Python 3.9
  - Build command: `pip install -r requirements.txt`
  - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
  - Health check path: `/health`
  - Required Environment Variables:
    - `DATABASE_URL`: Supabase PostgreSQL connection string
    - `FRONTEND_ORIGIN`: Deployed Vercel URL (`https://cold-call-companion-three.vercel.app`)
    - `GEMINI_API_KEY`: Google Gemini API key (server-side only)
    - `GEMINI_MODEL`: `gemini-3.8-flash`
    - `GEMINI_TIMEOUT_SECONDS`: `30.0`
    - `ENVIRONMENT`: `production`

### 3. Frontend: Vercel
- Root directory: `frontend`
- Framework Preset: **Vite**
- Build command: `npm run build` (output directory: `dist`)
- SPA rewrites: Handled by [`frontend/vercel.json`](frontend/vercel.json)
- Required Environment Variable:
  - `VITE_API_BASE_URL`: Deployed backend URL (`https://cold-call-companion-backend.onrender.com`)

---

## 9. Transcript Analysis & Key Product Decisions

The design of Cold Call Companion is grounded in a quantitative and qualitative analysis of **100 B2B cold-call transcripts** (`T001`–`T100`) conducted by Meridian Growth Partners (fictional) with Indian executive decision-makers. Full findings are documented in [`docs/transcript-analysis.md`](docs/transcript-analysis.md).

### Four Product Decisions Influenced by the Transcripts

1. **Preserving All 10 Distinct Outcomes (Preventing Unlogged & Collapsed Calls):**
   - *Evidence:* In transcripts like `T046`, `T082`, and `T094`, callers had substantive conversations (160–340s) where prospects agreed to receive reports on WhatsApp or review materials, yet the callers recorded `not_logged`. Additionally, callers often mistook polite brush-offs (*“Theek hai, aap bhejiye”*) for genuine interest.
   - *Product Decision:* The UI forces an explicit outcome selection from 10 non-collapsing categories. `do_not_call` is kept strictly distinct from `not_interested` to protect legal compliance, while `agreed_to_receive_report` is distinguished from general `interested`.

2. **Append-Only Stage Visits for Non-Linear Conversations:**
   - *Evidence:* Conversations in the transcripts do not proceed in a straight line. For instance, in Transcript `T082`, the prospect progressed through Stage 1, heard the Stage 2 purpose, discussed his business in Stage 4, and then interrupted to ask what the caller actually meant by a "growth diagnostic" (returning to Stage 2).
   - *Product Decision:* The backend assigns `visit_number = (max_visit or 0) + 1` via the compound unique constraint `uq_call_stage_visit`. Returning to Stage 2 creates a new visit entry without overwriting the Visit 1 notes.

3. **Verbatim Prospect Words at Stage 5 ("Their Need"):**
   - *Evidence:* Transcripts show that follow-up calls succeed when callers use the prospect's exact vocabulary (e.g., *“software thinking on a physical factory floor”* in `T084` or *“die-cast aluminum outdoor lighting housings”* in `T082`). Sales reps who rephrased these needs into generic consultant jargon lost prospect trust.
   - *Product Decision:* Stage 5 features an explicit verbatim input field emphasized in the UI, and AI summaries are strictly constrained to incorporate these verbatim notes without hallucinated expansions.

4. **Transcript-Grounded Stage Guidance & Quick-Taps:**
   - *Evidence:* Callers freeze or ramble when prospects challenge their authority or demand to know where their number was obtained (e.g., `T063`, `T081`).
   - *Product Decision:* Each stage provides glanceable quick-tap outcome buttons and 3 literal prospect quote examples directly extracted from recurring patterns in the dataset.

*(Note: Raw call transcripts are intentionally excluded from the public repository to respect privacy and data confidentiality.)*

---

## 10. Demonstration Walkthrough

Follow this step-by-step journey to evaluate the application either locally or on the [Live Demo](https://cold-call-companion-three.vercel.app):

1. **Open the Application:** Navigate to the live frontend or `http://localhost:5173`. Check that the status indicator in the top header reads **"Backend Connected"**.
2. **Start a New Call:** Click **"Start Call"**. In the modal, select the pre-filled demo prospect (*Anand Verma, Founder at Modern Lighting Solutions* — based on Transcript `T082`) and click **"Begin Call"**.
3. **Stage 1 (Opening):** Observe the active timer and stage purpose. Select quick-tap outcome `"Reached intended person"`. Enter verbatim notes: *“Yes, Anand speaking. What is this regarding?”* Click **"Save & Continue"**.
4. **Stage 2 (Purpose, Visit 1):** Select `"Understood / allowed to continue"`. Enter verbatim notes: *“Understood. What kind of manufacturing assessments do you run?”* Click **"Save & Continue"**.
5. **Stage 4 (Their business):** Jump forward to Stage 4. Select `"Shared business context"`. Enter notes: *“We manufacture die-cast aluminum outdoor lighting housings in Vasai.”*
6. **Revisit Stage 2 (Non-linear Revisit):** Click back to Stage 2 on the progress bar. Notice the badge updates to **Visit 2**. Select `"Asked what we do"`. Enter notes: *“Can you clarify whether your diagnostic report covers shop floor defect reduction?”* Click **"Save & Continue"**.
7. **Stage 7 (Next step):** Advance to Stage 7. Select `"Agreed to report via WhatsApp"`. Enter notes: *“Send sample comparison report to my direct WhatsApp, I will review on weekend.”*
8. **End Call:** Click the red **"End Call"** button. In the modal:
   - Select Outcome: **Agreed to receive report** (`agreed_to_receive_report`).
   - Next Step: `Send sample comparison report via WhatsApp`.
   - Click **"Confirm & End Call"**.
9. **Inspect Past Calls:** Open the **"Past Calls"** tab. Locate the newly closed call card. Click to open the **Call Detail Modal**:
   - Inspect the complete audit trail showing all stage visits (including Stage 2 Visit 1 and Stage 2 Visit 2 preserved independently).
   - Inspect the verbatim quotes and the post-call AI summary.
10. **Verify API & Health:** Open [Backend Health Check](https://cold-call-companion-backend.onrender.com/health) (`GET /health`) and verify JSON response with database connectivity. Open [Swagger Docs](https://cold-call-companion-backend.onrender.com/docs) to inspect API schemas.

---

## 11. Repository Structure

```
cold-call-companion/
├── render.yaml                    # Render Blueprint configuration for backend deployment
├── .env.example                   # Root environment configuration template
├── supabase/
│   └── schema.sql                 # Complete reproducible PostgreSQL schema & triggers
├── docs/
│   ├── architecture.md            # Technical architecture & API contracts
│   ├── deployment.md              # Cloud deployment guide for Vercel, Render & Supabase
│   └── transcript-analysis.md     # 100-transcript analysis & evidence mapping
├── backend/
│   ├── requirements.txt           # Python dependencies (FastAPI, SQLAlchemy, Pydantic, etc.)
│   ├── .env.example               # Backend environment template
│   ├── app/
│   │   ├── config.py              # Settings management (Pydantic BaseSettings)
│   │   ├── database.py            # Dual PostgreSQL/SQLite engine & session factory
│   │   ├── main.py                # FastAPI app entrypoint, CORS & error handling
│   │   ├── models/
│   │   │   ├── models.py          # SQLAlchemy ORM models (Call, CallStageResult)
│   │   │   ├── schemas.py         # Pydantic v2 validation models
│   │   │   └── stages_data.py     # Versioned 8-stage catalog & quick-tap definitions
│   │   ├── routes/
│   │   │   ├── health.py          # GET /health with database connectivity check
│   │   │   ├── calls.py           # REST endpoints for starting, recording, closing calls
│   │   │   └── stages.py          # GET /v1/stages endpoint
│   │   └── services/
│   │       ├── call_service.py    # Append-only visit logic & call lifecycle management
│   │       └── llm_service.py     # Gemini client, retry logic & safe fallback handling
│   └── tests/
│       ├── test_calls_api.py      # Call lifecycle & visit number increment tests
│       ├── test_health.py         # Health check and DB failure regression tests
│       ├── test_llm_service.py    # LLM timeout, truncation, retry & fallback tests
│       ├── test_postgres_lifecycle.py # Full PostgreSQL schema lifecycle test
│       └── verify_t082_journey.py # Automated end-to-end integration verification script
└── frontend/
    ├── package.json               # Frontend dependencies & scripts
    ├── vercel.json                # Vercel SPA routing rewrite configuration
    ├── vite.config.ts             # Vite build & development proxy setup
    ├── .env.example               # Frontend environment template
    ├── src/
    │   ├── main.tsx               # React application entrypoint
    │   ├── App.tsx                # Main screen router (Live Call vs Past Calls)
    │   ├── types/
    │   │   └── call.ts            # TypeScript interfaces for calls and stage results
    │   ├── constants/
    │   │   ├── stages.ts          # 8 stage definitions, quick-taps & response examples
    │   │   └── outcomes.ts        # 10 distinct call outcome definitions & badge colors
    │   ├── services/
    │   │   └── api.ts             # Typed REST API client
    │   ├── components/
    │   │   ├── Header.tsx         # Navigation header & live backend status indicator
    │   │   ├── LiveCallScreen.tsx # 8-stage progress bar, timer, quick-taps & verbatim notes
    │   │   ├── PastCallsScreen.tsx# Past calls listing, search & outcome filter
    │   │   ├── StartCallModal.tsx # Modal to initialize call with prospect metadata
    │   │   ├── CloseCallModal.tsx # 10-outcome selection modal & callback scheduler
    │   │   └── CallDetailModal.tsx# Full audit trail inspector & AI summary viewer
    │   └── test/
    │       ├── setup.ts           # Vitest and RTL setup
    │       ├── stages.test.ts     # Stage metadata tests
    │       ├── Header.test.tsx    # Header & connection indicator tests
    │       ├── StartCallModal.test.tsx
    │       ├── LiveCallScreen.test.tsx
    │       ├── CloseCallModal.test.tsx
    │       ├── PastCallsScreen.test.tsx
    │       └── CallDetailModal.test.tsx # Modal inspection & summary formatting tests
```

---

## Author & Assignment Details

- **Author:** Forward Deployed Engineer Candidate (`ArjunReddyVelma`)
- **Institution:** DeepThought (Hyderabad)
- **Assignment:** Cold Call Companion — FDE Technical Challenge
- **Audit Date:** October 2026
