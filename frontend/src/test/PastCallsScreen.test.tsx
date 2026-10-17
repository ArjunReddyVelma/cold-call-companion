import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PastCallsScreen } from '../components/PastCallsScreen';
import { Call } from '../types/call';

describe('PastCallsScreen Component', () => {
  const mockCalls: Call[] = [
    {
      id: 'call-1',
      prospect_name: 'Dr. Rao',
      company_name: 'Sunrise Dental',
      prospect_role: 'Founder',
      started_at: '2026-10-17T10:00:00Z',
      ended_at: '2026-10-17T10:02:15Z',
      last_stage_reached: 7,
      final_outcome: 'next_step_agreed',
      next_step: 'Call Thursday 4pm',
      next_step_at: null,
      summary: 'Agreed to a review call on Thursday afternoon.',
      is_closed: true,
      created_at: '2026-10-17T10:00:00Z',
      updated_at: '2026-10-17T10:02:15Z'
    },
    {
      id: 'call-2',
      prospect_name: 'Reception',
      company_name: 'Lotus Skin Clinic',
      prospect_role: 'Gatekeeper',
      started_at: '2026-10-17T11:00:00Z',
      ended_at: '2026-10-17T11:00:45Z',
      last_stage_reached: 1,
      final_outcome: 'follow_up',
      next_step: 'Doctor not in, call after 2',
      next_step_at: null,
      summary: 'Doctor is unavailable until afternoon.',
      is_closed: true,
      created_at: '2026-10-17T11:00:00Z',
      updated_at: '2026-10-17T11:00:45Z'
    }
  ];

  it('renders call cards with prospect name, company, outcome badge, and stage reached', () => {
    const handleSelect = vi.fn();
    const handleStart = vi.fn();
    const handleRefresh = vi.fn();

    render(
      <PastCallsScreen
        calls={mockCalls}
        loading={false}
        error={null}
        onSelectCall={handleSelect}
        onOpenStartCall={handleStart}
        onRefresh={handleRefresh}
      />
    );

    expect(screen.getByText('Dr. Rao')).toBeInTheDocument();
    expect(screen.getByText(/Sunrise Dental/)).toBeInTheDocument();
    expect(screen.getAllByText('Next step agreed').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Stage 7/)).toBeInTheDocument();

    expect(screen.getByText('Reception')).toBeInTheDocument();
    expect(screen.getByText(/Lotus Skin Clinic/)).toBeInTheDocument();
    expect(screen.getAllByText('Follow up needed').length).toBeGreaterThanOrEqual(1);
  });

  it('filters calls by search term', () => {
    const handleSelect = vi.fn();
    const handleStart = vi.fn();
    const handleRefresh = vi.fn();

    render(
      <PastCallsScreen
        calls={mockCalls}
        loading={false}
        error={null}
        onSelectCall={handleSelect}
        onOpenStartCall={handleStart}
        onRefresh={handleRefresh}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search by prospect name/i);
    fireEvent.change(searchInput, { target: { value: 'Sunrise' } });

    expect(screen.getByText('Dr. Rao')).toBeInTheDocument();
    expect(screen.queryByText('Lotus Skin Clinic')).not.toBeInTheDocument();
  });

  it('triggers onSelectCall when clicking a call card', () => {
    const handleSelect = vi.fn();
    const handleStart = vi.fn();
    const handleRefresh = vi.fn();

    render(
      <PastCallsScreen
        calls={mockCalls}
        loading={false}
        error={null}
        onSelectCall={handleSelect}
        onOpenStartCall={handleStart}
        onRefresh={handleRefresh}
      />
    );

    const card = screen.getByText('Dr. Rao');
    fireEvent.click(card);

    expect(handleSelect).toHaveBeenCalledWith(mockCalls[0]);
  });
});
