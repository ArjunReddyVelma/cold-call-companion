# Cold Call Companion — DeepThought FDE

[![CI Backend & Frontend Tests](https://img.shields.io/badge/tests-35%20passed%20(100%25)-emerald.svg)](https://github.com/ArjunReddyVelma/cold-call-companion)
[![FastAPI](https://img.shields.io/badge/backend-FastAPI%20%7C%20Python%203.9-009688.svg)](https://fastapi.tiangolo.com/)
[![React + Vite](https://img.shields.io/badge/frontend-React%2018%20%7C%20Vite%205%20%7C%20TS%205-61DAFB.svg)](https://vitejs.dev/)
[![Database](https://img.shields.io/badge/database-Supabase%20PostgreSQL-3ECF8E.svg)](https://supabase.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Cold Call Companion** is an executive live-call desktop web companion engineered for B2B sales professionals. Designed to sit beside an active phone conversation, it guides callers through the **8 official cold-call stages**, records quick-tap stage outcomes, captures verbatim prospect words, tracks append-only visit history during stage revisits, preserves all **10 distinct call outcomes**, and generates factual post-call summaries via Google Gemini.

Developed for the **DeepThought Forward Deployed Engineer (FDE) Assignment**.

---

## Architecture Overview

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

### Key Technical Characteristics
1. **Frontend:** React 18, TypeScript 5, Vite 5, Tailwind CSS. Sub-second build (`1.01s`), strict type checking (`0 errors`), and full unit/component test coverage (18 Vitest tests).
2. **Backend:** Python 3.9, FastAPI, SQLAlchemy 2.0. Clean tiered architecture (`app/routes`, `app/services`, `app/models`). 17 automated tests (100% pass rate).
3. **Database:** Supabase-hosted PostgreSQL with complete reproducible schema ([`supabase/schema.sql`](supabase/schema.sql)). Includes compound unique constraints (`uq_call_stage_visit`), CHECK constraints for stages (1–8) and 10 call outcomes, and automated timestamp triggers. Dual-mode support enables seamless local development via SQLite.
4. **LLM Integration:** Google Gemini API (`gemini-3.8-flash`), called exclusively from the backend with configurable 30-second timeout (`GEMINI_TIMEOUT_SECONDS`) and graceful fallback if unconfigured or unreachable. Prospect notes are treated as untrusted user data with prompt-injection defenses.
5. **Data Integrity:**
   - **10 Distinct Outcomes:** `agreed_to_receive_report`, `next_step_agreed`, `interested`, `follow_up`, `call_again`, `not_interested`, `do_not_call`, `wrong_person`, `moved_company`, and `not_logged` are strictly preserved without collapsing.
   - **Append-Only Stage Visits:** Revisiting a stage assigns `visit_number = (max_visit or 0) + 1` without overwriting earlier notes.
   - **Verbatim Prospect Words:** Prospect words are preserved with exact character fidelity without AI rewriting.

---

## The 8 Official Cold-Call Stages

Grounded in synthesis of **100 real cold-call transcripts** (see [`docs/transcript-analysis.md`](docs/transcript-analysis.md)):

| # | Stage Name | Stage Purpose | Common Prospect Response Examples |
|---|---|---|---|
| **1** | **Opening** | Reach the right person and say who you are. The prospect decides in 10s if this call is worth a minute. | *“Speaking. Who is this, and where are you calling from?”* (T046, T088) |
| **2** | **Purpose** | Say in one or two sentences why you called, in words the prospect can repeat to a colleague. | *“What do you guys actually do? Are you a consulting firm or an agency?”* (T063, T084) |
| **3** | **Permission** | Find out whether they are willing to talk now. A clear yes, no, or callback time are all valid. | *“I am in the middle of something. Can you call me back tomorrow around 11?”* (T002, T014) |
| **4** | **Their business** | Ask about their company and work before pitching. People talk about what they do. | *“We are a manufacturing unit. We make outdoor lighting housings.”* (T082, T084) |
| **5** | **Their need** | Hear what they are trying to do or struggling with, in their own words. | *“Thankfully we are on the right track. We have robust internal processes.”* (T058, T082) |
| **6** | **Objection** | Hear the reason for a no and understand it. A reason understood can be answered. | *“Honestly, we already engaged a consultant last month for this exact work.”* (T077, T092) |
| **7** | **Next step** | Agree one concrete thing: document on WhatsApp/email, call at named time, or meeting. | *“Send the report on WhatsApp to my direct number, and I will review it.”* (T046, T082) |
| **8** | **Close** | End the call clearly and log the outcome, next step, and prospect's exact words. | *“All right, send it over WhatsApp and we will talk next Thursday at 10:30.”* (T046, T082) |

---

## Quickstart & Local Development

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+ and pip
- Git

### 1. Backend Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Start backend server (defaults to local SQLite coldcall.db)
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- Interactive Swagger API docs: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

### 2. Frontend Setup
```bash
cd frontend
npm install

# Start Vite dev server
npm run dev
```
- Web Application: `http://127.0.0.1:5173`

### 3. Automated Test Execution

Run the complete test suite across backend and frontend:

```bash
# Frontend Unit & Component Tests (18 tests)
cd frontend
npm run test
npm run typecheck
npm run build

# Backend Pytest Suite (17 tests)
cd backend
.venv/bin/pytest -v

# Full End-to-End T082 Integration Journey (against live backend)
.venv/bin/python3 tests/verify_t082_journey.py
```

---

## Production Deployment Guide

Detailed step-by-step instructions are available in [`docs/deployment.md`](docs/deployment.md).

### 1. Database: Supabase PostgreSQL
1. Create a Supabase project at [supabase.com](https://supabase.com).
2. In the **SQL Editor**, run the complete reproducible schema from [`supabase/schema.sql`](supabase/schema.sql).
3. Copy the pooled connection string from **Project Settings** → **Database** (`postgresql://postgres.[ref]:[pwd]@aws-0-[region].pooler.supabase.com:6543/postgres`).

### 2. Backend: Render
1. In Render, select **New +** → **Blueprint** and connect this repository.
2. Render reads [`render.yaml`](render.yaml) automatically.
3. Configure environment variables in the Render dashboard:
   - `DATABASE_URL`: Your Supabase connection string.
   - `FRONTEND_ORIGIN`: Your deployed Vercel frontend URL.
   - `GEMINI_API_KEY`: Google AI Studio API key (optional; defaults to graceful fallback).

### 3. Frontend: Vercel
1. In Vercel, import this repository with root directory set to `frontend`.
2. Framework preset: **Vite**.
3. Add environment variable:
   - `VITE_API_BASE_URL`: Your deployed Render backend URL (`https://<service-name>.onrender.com`).
4. Click **Deploy**. SPA rewrites are managed by [`frontend/vercel.json`](frontend/vercel.json).

---

## Demonstration Journey: Transcript T082 Walkthrough

The application includes sample presets to immediately test the canonical **Transcript T082** flow:

1. **Prospect Profile:** Anand Verma, Founder / Managing Director at *Modern Lighting Solutions*.
2. **Stage 1 (Opening):** Quick tap: `"Reached intended person"`. Verbatim note: *“Yes, Anand speaking. What is this regarding?”*
3. **Stage 2 (Purpose, Visit 1):** Quick tap: `"Understood / allowed to continue"`. Verbatim note: *“Understood. What kind of manufacturing assessments do you run?”*
4. **Stage 4 (Their Business, Visit 1):** Quick tap: `"Shared business context"`. Verbatim note: *“We manufacture die-cast aluminum outdoor lighting housings in Vasai.”*
5. **Stage 2 (Purpose, Visit 2 — Non-linear Revisit):** Quick tap: `"Asked what we do"`. Verbatim note: *“Can you clarify whether your diagnostic report covers plant floor defect reduction or only sales?”*
   - *Verification:* Backend auto-assigns `visit_number = 2`. The original Visit 1 record remains completely untouched.
6. **Stage 7 (Next Step, Visit 1):** Quick tap: `"Agreed to report via WhatsApp"`. Verbatim note: *“Send sample comparison report to my direct WhatsApp, I will review on weekend.”*
7. **End Call:** Select outcome `agreed_to_receive_report`, enter next step: *“Send sample comparison report via WhatsApp”*.
8. **Inspection:** Open **Past Calls**, click the call card, and inspect the complete audit trail showing all 5 visits, timestamps, verbatim quotes, and post-call summary.

---

## Repository Structure

```
cold-call-companion/
├── render.yaml                    # Render Blueprint IaC configuration
├── supabase/
│   └── schema.sql                 # Reproducible PostgreSQL schema & triggers
├── docs/
│   ├── architecture.md            # Technical architecture & endpoint contracts
│   ├── deployment.md              # Production deployment step-by-step guide
│   └── transcript-analysis.md     # 100-transcript analysis & evidence mapping
├── backend/
│   ├── requirements.txt           # Python backend dependencies
│   ├── app/
│   │   ├── config.py              # Environment configuration & URL normalization
│   │   ├── database.py            # Dual PostgreSQL/SQLite engine & pooling
│   │   ├── main.py                # FastAPI entrypoint, CORS, lifespan handler
│   │   ├── models/                # SQLAlchemy entities & Pydantic schemas
│   │   ├── routes/                # Health, stages, and calls endpoints
│   │   └── services/              # Append-only visit engine & Gemini LLM service
│   └── tests/                     # 17 Pytest automated integration & unit tests
└── frontend/
    ├── package.json               # Frontend dependencies & scripts
    ├── vercel.json                # Vercel SPA routing rewrites
    ├── vite.config.ts             # Vite bundler & proxy configuration
    ├── src/
    │   ├── components/            # LiveCallScreen, PastCallsScreen, Modals, Header
    │   ├── constants/             # 8 Stages & 10 Outcomes metadata
    │   ├── services/api.ts        # Typed REST API client
    │   └── test/                  # 18 Vitest unit & component test suites
```

---

## Author & Verification

- **Author:** Forward Deployed Engineer Candidate (`ArjunReddyVelma`)
- **Institution:** DeepThought (Hyderabad)
- **Status:** Production Verified · Local End-to-End Verified · Cloud Deployment Ready
