import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CloseCallModal } from '../components/CloseCallModal';
import { OUTCOME_META } from '../constants/stages';

describe('CloseCallModal Component', () => {
  it('renders all 10 distinct call outcome options', () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <CloseCallModal
        isOpen={true}
        onClose={handleClose}
        onConfirmClose={handleConfirm}
        currentStage={4}
        loading={false}
        errorMessage={null}
      />
    );

    // Verify all 10 outcomes are rendered by label
    Object.values(OUTCOME_META).forEach((meta) => {
      expect(screen.getByText(meta.label)).toBeInTheDocument();
    });

    // Check header states stage number
    expect(screen.getByText(/Closing from Stage 4 of 8/i)).toBeInTheDocument();
  });

  it('submits selected outcome and next step details', async () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <CloseCallModal
        isOpen={true}
        onClose={handleClose}
        onConfirmClose={handleConfirm}
        currentStage={7}
        loading={false}
        errorMessage={null}
      />
    );

    // Select "Agreed to receive report"
    const reportOption = screen.getByText('Agreed to receive report');
    fireEvent.click(reportOption);

    // Enter next step
    const nextStepInput = screen.getByPlaceholderText(/Send research profile on WhatsApp/i);
    fireEvent.change(nextStepInput, { target: { value: 'Send 1-pager on WhatsApp to +91-9876543210' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /End & Close Call/i });
    fireEvent.click(submitBtn);

    expect(handleConfirm).toHaveBeenCalledWith({
      final_outcome: 'agreed_to_receive_report',
      next_step: 'Send 1-pager on WhatsApp to +91-9876543210',
      next_step_at: undefined,
      last_stage_reached: 7
    });
  });
});
