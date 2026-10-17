# Cold Call Companion — Production Deployment Guide

This guide details the deployment of **Cold Call Companion** across the approved architecture:
- **Database:** Supabase-hosted PostgreSQL
- **Backend:** Render Web Service (FastAPI, Python 3.9, Uvicorn)
- **Frontend:** Vercel (React 18, TypeScript, Vite)
- **LLM:** Google Gemini API (Backend-only integration)

---

## 1. Production Database: Supabase PostgreSQL

### Setup & Schema Initialization
1. Create a new project in the [Supabase Dashboard](https://supabase.com).
2. Navigate to **SQL Editor** in the Supabase Dashboard.
3. Open [`supabase/schema.sql`](../supabase/schema.sql) from this repository, copy its entire contents, paste it into the SQL Editor, and click **Run**.
4. Verify table creation in the **Table Editor**:
   - `calls` (with 10-outcome CHECK constraint and trigger)
   - `call_stage_results` (with `uq_call_stage_visit` unique constraint on `(call_id, stage_number, visit_number)`)
5. Obtain the PostgreSQL Connection String:
   - Go to **Project Settings** → **Database** → **Connection String** → **URI**.
   - Use the **Session Pooler** (port 5432) or **Transaction Pooler** (port 6543) connection string:
     ```text
     postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
     ```
   - *Note:* If the string starts with `postgres://`, the backend automatically normalizes it to `postgresql://` at runtime.

---

## 2. Backend Deployment: Render

The repository includes a ready-to-use Blueprint at [`render.yaml`](../render.yaml).

### Option A: Deploy via Blueprint (Recommended)
1. In the [Render Dashboard](https://dashboard.render.com), click **New +** → **Blueprint**.
2. Connect your public GitHub repository (`cold-call-companion`).
3. Render reads `render.yaml` and configures the `cold-call-companion-backend` web service.
4. Fill in the required environment variables:
   - `DATABASE_URL`: Your Supabase connection string.
   - `FRONTEND_ORIGIN`: Your Vercel frontend URL (e.g. `https://cold-call-companion.vercel.app`).
   - `GEMINI_API_KEY`: Google AI Studio API key (optional; if omitted, backend gracefully returns `"Summary unavailable"`).
5. Click **Apply**.

### Option B: Deploy Manually as Web Service
- **Name:** `cold-call-companion-backend`
- **Runtime:** `Python 3`
- **Root Directory:** `backend`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Health Check Path:** `/health`
- **Plan:** `Free`

### Backend Environment Variables Table
| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `ENVIRONMENT` | Runtime environment mode | `production` |
| `PORT` | Listening port injected by Render | `10000` (auto-set) |
| `DATABASE_URL` | Supabase PostgreSQL URI | `postgresql://postgres:[PWD]@...` |
| `FRONTEND_ORIGIN` | Allowed CORS origin(s) | `https://your-app.vercel.app` |
| `GEMINI_API_KEY` | Gemini API key for post-call summaries | Secret key from Google AI Studio |

---

## 3. Frontend Deployment: Vercel

The frontend is configured with [`frontend/vercel.json`](../frontend/vercel.json) to handle SPA routing seamlessly.

### Deployment Steps
1. In the [Vercel Dashboard](https://vercel.com/dashboard), click **Add New...** → **Project**.
2. Import the GitHub repository (`cold-call-companion`).
3. Configure the Project Settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add Environment Variable:
   - `VITE_API_BASE_URL`: The deployed Render backend URL (e.g. `https://cold-call-companion-backend.onrender.com`).
5. Click **Deploy**.

---

## 4. Post-Deployment Verification Checklist

Once both services are deployed, perform these verification checks:

1. **Backend Health Probe:**
   ```bash
   curl -i https://<render-service-url>/health
   ```
   - Must return HTTP `200 OK` with `"status": "ok"` and `"database": "connected"`.
2. **Frontend Availability:**
   - Open `https://<vercel-project-url>/` in a web browser.
   - Verify the top-right health badge shows **"API OK"** in green.
3. **End-to-End T082 Verification:**
   - Click **New Call** → Select **T082 · Modern Lighting** preset.
   - Record Stage 1, Stage 2, Stage 4, revisit Stage 2 (creating Visit 2), and advance to Stage 7.
   - End call with outcome `agreed_to_receive_report`.
   - Open **Past Calls** tab, click the call card, and inspect that all 5 visits (including both Stage 2 visits) are displayed accurately.
4. **CORS Verification:**
   - Open the browser developer console (F12) on the Vercel site.
   - Verify that all API requests to the Render backend succeed without CORS origin rejections.
