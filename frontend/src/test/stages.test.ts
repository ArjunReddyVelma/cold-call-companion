import { describe, it, expect } from 'vitest';
import { DEFAULT_STAGES, OUTCOME_META } from '../constants/stages';
import { CallOutcome } from '../types/call';

describe('Official Stage and Outcome Definitions', () => {
  it('should contain all eight official stages in order', () => {
    expect(DEFAULT_STAGES).toHaveLength(8);
    DEFAULT_STAGES.forEach((stage, idx) => {
      expect(stage.stage_number).toBe(idx + 1);
      expect(stage.name).toBeDefined();
      expect(stage.purpose).toBeDefined();
      // Must contain exactly three transcript-grounded examples
      expect(stage.likely_responses).toHaveLength(3);
      // Must contain at least four quick-tap options
      expect(stage.quick_tap_options.length).toBeGreaterThanOrEqual(4);
    });
  });

  it('should support all ten distinct call outcomes without merging', () => {
    const requiredOutcomes: CallOutcome[] = [
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
    ];

    expect(Object.keys(OUTCOME_META)).toHaveLength(10);
    requiredOutcomes.forEach((outcome) => {
      expect(OUTCOME_META[outcome]).toBeDefined();
      expect(OUTCOME_META[outcome].label).toBeDefined();
      expect(OUTCOME_META[outcome].description).toBeDefined();
    });

    // Ensure do_not_call and not_interested are strictly distinct
    expect(OUTCOME_META['do_not_call'].label).not.toEqual(OUTCOME_META['not_interested'].label);
    expect(OUTCOME_META['wrong_person'].label).not.toEqual(OUTCOME_META['moved_company'].label);
  });
});
