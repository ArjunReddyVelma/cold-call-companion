export type CallOutcome =
  | 'agreed_to_receive_report'
  | 'next_step_agreed'
  | 'interested'
  | 'follow_up'
  | 'call_again'
  | 'not_interested'
  | 'do_not_call'
  | 'wrong_person'
  | 'moved_company'
  | 'not_logged';

export interface StageDefinition {
  stage_number: number;
  name: string;
  purpose: string;
  likely_responses: string[];
  quick_tap_options: string[];
}

export interface CallStageResult {
  id: string;
  call_id: string;
  stage_number: number;
  visit_number: number;
  selected_result: string;
  prospect_words: string | null;
  created_at: string;
  updated_at: string;
}

export interface Call {
  id: string;
  prospect_name: string | null;
  company_name: string | null;
  prospect_role: string | null;
  started_at: string;
  ended_at: string | null;
  last_stage_reached: number;
  final_outcome: CallOutcome | null;
  next_step: string | null;
  next_step_at: string | null;
  summary: string | null;
  is_closed: boolean;
  created_at: string;
  updated_at: string;
  stage_results?: CallStageResult[];
}

export interface CallCreateRequest {
  prospect_name?: string;
  company_name?: string;
  prospect_role?: string;
}

export interface CallStageResultCreate {
  stage_number: number;
  selected_result: string;
  prospect_words?: string;
}

export interface CallCloseRequest {
  final_outcome: CallOutcome;
  next_step?: string;
  next_step_at?: string;
  last_stage_reached?: number;
}

export interface CallListResponse {
  items: Call[];
  total: number;
}
