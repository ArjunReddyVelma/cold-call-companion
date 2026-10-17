import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Header } from '../components/Header';
import { Call } from '../types/call';

describe('Header Component', () => {
  const mockCall: Call = {
    id: 'call-1',
    prospect_name: 'Anand Verma',
    company_name: 'Modern Lighting Solutions',
    prospect_role: 'Founder',
    started_at: '2026-10-17T10:00:00Z',
    ended_at: null,
    last_stage_reached: 1,
    final_outcome: null,
    next_step: null,
    next_step_at: null,
    summary: null,
    is_closed: false,
    created_at: '2026-10-17T10:00:00Z',
    updated_at: '2026-10-17T10:00:00Z',
    stage_results: []
  };

  it('displays API OK when backendHealthy is true', () => {
    render(
      <Header
        activeTab="live"
        onSelectTab={vi.fn()}
        activeCall={null}
        onOpenStartCall={vi.fn()}
        backendHealthy={true}
      />
    );
    expect(screen.getByText('API OK')).toBeInTheDocument();
  });

  it('displays API Offline when backendHealthy is false', () => {
    render(
      <Header
        activeTab="live"
        onSelectTab={vi.fn()}
        activeCall={null}
        onOpenStartCall={vi.fn()}
        backendHealthy={false}
      />
    );
    expect(screen.getByText('API Offline')).toBeInTheDocument();
  });

  it('displays Checking... when backendHealthy is null', () => {
    render(
      <Header
        activeTab="live"
        onSelectTab={vi.fn()}
        activeCall={null}
        onOpenStartCall={vi.fn()}
        backendHealthy={null}
      />
    );
    expect(screen.getByText('Checking...')).toBeInTheDocument();
  });

  it('handles tab switching between live call and history', () => {
    const handleSelectTab = vi.fn();
    render(
      <Header
        activeTab="live"
        onSelectTab={handleSelectTab}
        activeCall={mockCall}
        onOpenStartCall={vi.fn()}
        backendHealthy={true}
      />
    );

    const historyTab = screen.getByRole('button', { name: /Past Calls/i });
    fireEvent.click(historyTab);
    expect(handleSelectTab).toHaveBeenCalledWith('history');
  });
});
