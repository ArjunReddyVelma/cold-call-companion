-- =============================================================================
-- DeepThought Cold Call Companion — Supabase PostgreSQL Schema
-- Version: 1.0.0
-- Description: Reproducible schema for live-call tracking, append-only stage
-- results with visit history, and closed call summaries.
-- =============================================================================

-- Ensure UUID generation functions are available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Table: calls
-- Tracks live and closed phone call sessions.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prospect_name TEXT,
    company_name TEXT,
    prospect_role TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    last_stage_reached SMALLINT NOT NULL DEFAULT 1 CHECK (last_stage_reached BETWEEN 1 AND 8),
    final_outcome TEXT CHECK (
        final_outcome IS NULL OR final_outcome IN (
            'agreed_to_receive_report',
            'next_step_agreed',
            'interested',
            'follow_up',
            'call_again',
            'not_interested',
            'do_not_call',
            'wrong_person',
            'moved_company',
            'not_logged'
        )
    ),
    next_step TEXT,
    next_step_at TIMESTAMPTZ,
    summary TEXT,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Table: call_stage_results
-- Append-only log of what happened at each stage visit.
-- Revisiting a stage increments visit_number and creates a new row,
-- ensuring previous notes and selections are never overwritten.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS call_stage_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    stage_number SMALLINT NOT NULL CHECK (stage_number BETWEEN 1 AND 8),
    visit_number INTEGER NOT NULL DEFAULT 1 CHECK (visit_number >= 1),
    selected_result TEXT NOT NULL,
    prospect_words TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_call_stage_visit UNIQUE (call_id, stage_number, visit_number)
);

-- -----------------------------------------------------------------------------
-- Performance Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_calls_started_at ON calls(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_is_closed ON calls(is_closed);
CREATE INDEX IF NOT EXISTS idx_call_stage_results_call_id ON call_stage_results(call_id);
CREATE INDEX IF NOT EXISTS idx_call_stage_results_stage ON call_stage_results(call_id, stage_number, visit_number);
CREATE INDEX IF NOT EXISTS idx_call_stage_results_created ON call_stage_results(call_id, created_at ASC);

-- -----------------------------------------------------------------------------
-- Trigger to maintain updated_at timestamps
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_calls ON calls;
CREATE TRIGGER set_timestamp_calls
BEFORE UPDATE ON calls
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_stage_results ON call_stage_results;
CREATE TRIGGER set_timestamp_stage_results
BEFORE UPDATE ON call_stage_results
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
