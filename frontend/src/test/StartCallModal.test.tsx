import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StartCallModal } from '../components/StartCallModal';

describe('StartCallModal Component', () => {
  it('starts call immediately with preset metadata when clicking T082 demo button', () => {
    const handleStart = vi.fn().mockResolvedValue(true);
    const handleClose = vi.fn();

    render(<StartCallModal isOpen={true} onClose={handleClose} onStartCall={handleStart} loading={false} />);

    // Click T082 preset
    const presetBtn = screen.getByRole('button', { name: /T082 · Modern Lighting/i });
    fireEvent.click(presetBtn);

    expect(handleStart).toHaveBeenCalledWith({
      prospect_name: 'Anand Verma',
      company_name: 'Modern Lighting Solutions',
      prospect_role: 'Founder / Managing Director'
    });
  });

  it('submits prospect metadata on form submission', async () => {
    const handleStart = vi.fn().mockResolvedValue(true);
    const handleClose = vi.fn();

    render(<StartCallModal isOpen={true} onClose={handleClose} onStartCall={handleStart} loading={false} />);

    const nameInput = screen.getByPlaceholderText(/e\.g\. Senthil Kumar/i);
    const companyInput = screen.getByPlaceholderText(/e\.g\. Kalyx Enterprises/i);

    fireEvent.change(nameInput, { target: { value: 'Siddharth Roy' } });
    fireEvent.change(companyInput, { target: { value: 'Roy Tech Labs' } });

    const submitBtn = screen.getByRole('button', { name: /Start Call Guide/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleStart).toHaveBeenCalledWith({
        prospect_name: 'Siddharth Roy',
        company_name: 'Roy Tech Labs',
        prospect_role: undefined
      });
    });
  });
});
