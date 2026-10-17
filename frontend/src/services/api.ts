import {
  Call,
  CallCreateRequest,
  CallStageResult,
  CallStageResultCreate,
  CallCloseRequest,
  CallListResponse,
  StageDefinition
} from '../types/call';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(`API Error ${status}: ${detail}`);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Request failed with status ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson && errJson.detail) {
        detail = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // ignore json parse error on non-json error responses
    }
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  async checkHealth(): Promise<{ status: string; service: string; database: string }> {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse<{ status: string; service: string; database: string }>(res);
  },

  async getStages(): Promise<StageDefinition[]> {
    const res = await fetch(`${API_BASE}/v1/stages`);
    return handleResponse<StageDefinition[]>(res);
  },

  async createCall(payload: CallCreateRequest): Promise<Call> {
    const res = await fetch(`${API_BASE}/v1/calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse<Call>(res);
  },

  async recordStageResult(callId: string, payload: CallStageResultCreate): Promise<CallStageResult> {
    const res = await fetch(`${API_BASE}/v1/calls/${callId}/stages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse<CallStageResult>(res);
  },

  async closeCall(callId: string, payload: CallCloseRequest): Promise<Call> {
    const res = await fetch(`${API_BASE}/v1/calls/${callId}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse<Call>(res);
  },

  async getCalls(limit: number = 50, offset: number = 0): Promise<CallListResponse> {
    const res = await fetch(`${API_BASE}/v1/calls?limit=${limit}&offset=${offset}`);
    return handleResponse<CallListResponse>(res);
  },

  async getCallDetail(callId: string): Promise<Call> {
    const res = await fetch(`${API_BASE}/v1/calls/${callId}`);
    return handleResponse<Call>(res);
  }
};
