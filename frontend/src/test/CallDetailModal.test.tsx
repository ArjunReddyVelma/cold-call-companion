import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CallDetailModal } from '../components/CallDetailModal';
import { Call } from '../types/call';

describe('CallDetailModal Component', () => {
  const mockCallWithRevisit: Call = {
    id: 'call-t082',
    prospect_name: 'Anand Verma',
    company_name: 'Modern Lighting Solutions',
    prospect_role: 'Founder',
    started_at: '2026-10-17T10:00:00Z',
    ended_at: '2026-10-17T10:04:12Z',
    last_stage_reached: 7,
    final_outcome: 'agreed_to_receive_report',
    next_step: 'Send sample comparison report via WhatsApp',
    next_step_at: null,
    summary: 'Prospect agreed to review sample comparison report sent to direct WhatsApp.',
    is_closed: true,
    created_at: '2026-10-17T10:00:00Z',
    updated_at: '2026-10-17T10:04:12Z',
    stage_results: [
      {
        id: 'sr-1',
        call_id: 'call-t082',
        stage_number: 1,
        visit_number: 1,
        selected_result: 'Reached intended person',
        prospect_words: 'Yes, Anand here.',
        created_at: '2026-10-17T10:00:15Z',
        updated_at: '2026-10-17T10:00:15Z'
      },
      {
        id: 'sr-2',
        call_id: 'call-t082',
        stage_number: 2,
        visit_number: 1,
        selected_result: 'Allowed opening hook',
        prospect_words: 'We manufacture die-cast aluminum fixtures.',
        created_at: '2026-10-17T10:01:00Z',
        updated_at: '2026-10-17T10:01:00Z'
      },
      {
        id: 'sr-3',
        call_id: 'call-t082',
        stage_number: 4,
        visit_number: 1,
        selected_result: 'Identified manufacturing workflow',
        prospect_words: 'Surface finish consistency is our main rejection cause.',
        created_at: '2026-10-17T10:02:10Z',
        updated_at: '2026-10-17T10:02:10Z'
      },
      {
        id: 'sr-4',
        call_id: 'call-t082',
        stage_number: 2,
        visit_number: 2,
        selected_result: 'Allowed opening hook',
        prospect_words: 'Clarified fixture batch size of 2000 units/mo.',
        created_at: '2026-10-17T10:03:00Z',
        updated_at: '2026-10-17T10:03:00Z'
      }
    ]
  };

  it('renders prospect header, outcome badge, and AI summary', () => {
    const handleClose = vi.fn();
    render(<CallDetailModal call={mockCallWithRevisit} onClose={handleClose} />);

    expect(screen.getByText('Anand Verma')).toBeInTheDocument();
    expect(screen.getByText(/Modern Lighting Solutions/)).toBeInTheDocument();
    expect(screen.getByText('Agreed to receive report')).toBeInTheDocument();
    expect(
      screen.getByText('Prospect agreed to review sample comparison report sent to direct WhatsApp.')
    ).toBeInTheDocument();
  });

  it('renders immutable visit history including revisits and exact prospect words', () => {
    const handleClose = vi.fn();
    render(<CallDetailModal call={mockCallWithRevisit} onClose={handleClose} />);

    // Visit numbers (Stage 1 Visit 1, Stage 2 Visit 1, Stage 4 Visit 1, Stage 2 Visit 2)
    expect(screen.getAllByText('Visit 1').length).toBe(3);
    expect(screen.getByText('Visit 2')).toBeInTheDocument();

    // Verbatim prospect words
    expect(screen.getByText(/Yes, Anand here\./)).toBeInTheDocument();
    expect(screen.getByText(/Surface finish consistency is our main rejection cause\./)).toBeInTheDocument();
    expect(screen.getByText(/Clarified fixture batch size of 2000 units\/mo\./)).toBeInTheDocument();
  });

  it('renders structured multi-section AI summary text without replacing it with prospect metadata', () => {
    const handleClose = vi.fn();
    const structuredSummary =
      "- Conversation Recap: Contacted prospect.\n" +
      "- Prospect Needs & Interests: Aluminum fixture fabrication.\n" +
      "- Objections or Concerns: None recorded.\n" +
      "- Agreed Outcome: Agreed to receive report.\n" +
      "- Recorded Next Steps: Send report on WhatsApp.";

    const callWithStructuredSummary: Call = {
      ...mockCallWithRevisit,
      prospect_name: 'Arjun Reddy',
      prospect_role: 'founder',
      summary: structuredSummary
    };

    render(<CallDetailModal call={callWithStructuredSummary} onClose={handleClose} />);

    // Header displays prospect name and role
    expect(screen.getByText('Arjun Reddy')).toBeInTheDocument();
    expect(screen.getByText(/founder,/)).toBeInTheDocument();

    // Summary section renders full conversation insights rather than only prospect metadata
    expect(screen.getByText(/Conversation Recap: Contacted prospect\./)).toBeInTheDocument();
    expect(screen.getByText(/Prospect Needs & Interests: Aluminum fixture fabrication\./)).toBeInTheDocument();
    expect(screen.getByText(/Recorded Next Steps: Send report on WhatsApp\./)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(<CallDetailModal call={mockCallWithRevisit} onClose={handleClose} />);

    const closeBtn = screen.getByLabelText('Close');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
