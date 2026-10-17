import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LiveCallScreen } from '../components/LiveCallScreen';
import { DEFAULT_STAGES } from '../constants/stages';
import { Call } from '../types/call';

describe('LiveCallScreen Component', () => {
  const mockCall: Call = {
    id: 'call-123',
    prospect_name: 'Senthil Kumar',
    company_name: 'Kalyx Enterprises',
    prospect_role: 'Director',
    started_at: new Date().toISOString(),
    ended_at: null,
    last_stage_reached: 1,
    final_outcome: null,
    next_step: null,
    next_step_at: null,
    summary: null,
    is_closed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    stage_results: []
  };

  it('renders prospect details, timer, and stage 1 content', () => {
    const handleSelectStage = vi.fn();
    const handleSaveStage = vi.fn().mockResolvedValue(true);
    const handleOpenEndCall = vi.fn();

    render(
      <LiveCallScreen
        call={mockCall}
        stages={DEFAULT_STAGES}
        currentStageNumber={1}
        onSelectStage={handleSelectStage}
        onSaveStageResult={handleSaveStage}
        onOpenEndCall={handleOpenEndCall}
        saveLoading={false}
        saveError={null}
      />
    );

    // Prospect name & role
    expect(screen.getByText('Senthil Kumar')).toBeInTheDocument();
    expect(screen.getByText(/Kalyx Enterprises/)).toBeInTheDocument();

    // Stage 1 title and purpose
    expect(screen.getByText('Stage 1 of 8')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Opening' })).toBeInTheDocument();
    expect(screen.getByText(/Reach the right person/)).toBeInTheDocument();

    // "They may say" transcript quotes are present
    expect(screen.getByText(/Speaking. Who is this/)).toBeInTheDocument();

    // Quick-tap options for Stage 1
    expect(screen.getByText('Reached intended person')).toBeInTheDocument();
    expect(screen.getByText('Reception / gatekeeper')).toBeInTheDocument();

    // End call button available from Stage 1
    const endCallBtn = screen.getByRole('button', { name: /end call/i });
    expect(endCallBtn).toBeInTheDocument();
    fireEvent.click(endCallBtn);
    expect(handleOpenEndCall).toHaveBeenCalledTimes(1);
  });

  it('allows recording prospect words and triggers save on next stage click', async () => {
    const handleSelectStage = vi.fn();
    const handleSaveStage = vi.fn().mockResolvedValue(true);
    const handleOpenEndCall = vi.fn();

    render(
      <LiveCallScreen
        call={mockCall}
        stages={DEFAULT_STAGES}
        currentStageNumber={1}
        onSelectStage={handleSelectStage}
        onSaveStageResult={handleSaveStage}
        onOpenEndCall={handleOpenEndCall}
        saveLoading={false}
        saveError={null}
      />
    );

    // Select a quick tap
    const tapBtn = screen.getByText('Reception / gatekeeper');
    fireEvent.click(tapBtn);

    // Type prospect's exact words in textarea
    const textarea = screen.getByPlaceholderText(/Record verbatim phrasing/i);
    fireEvent.change(textarea, { target: { value: 'Director is in a plant meeting until 3 PM' } });

    // Click Next: Purpose
    const nextBtn = screen.getByRole('button', { name: /Next: Purpose/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(handleSaveStage).toHaveBeenCalledWith(
        1,
        'Reception / gatekeeper',
        'Director is in a plant meeting until 3 PM'
      );
    });
  });
});
