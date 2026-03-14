import { describe, expect, it } from 'vitest';
import { dashEntryEnergyCost, shouldContinueDash, shouldStartDash } from '../src/game/runtime/runDash';

describe('run dash gating', () => {
  it('starts a dash only on a fresh press with enough energy', () => {
    expect(shouldStartDash(true, false, 0.2)).toBe(true);
    expect(shouldStartDash(true, true, 0.2)).toBe(false);
    expect(shouldStartDash(true, false, 0.05)).toBe(false);
  });

  it('continues an active dash while energy remains above the drain floor', () => {
    expect(shouldContinueDash(true, 0.6, 0.2)).toBe(true);
    expect(shouldContinueDash(true, 0, 0.2)).toBe(false);
    expect(shouldContinueDash(true, 0.4, 0.01)).toBe(false);
  });

  it('does not auto-restart dash from a held key after depletion', () => {
    const heldAfterDepletion = shouldStartDash(true, true, 0.08);
    const continuingAfterDepletion = shouldContinueDash(true, 0, 0.08);

    expect(heldAfterDepletion).toBe(false);
    expect(continuingAfterDepletion).toBe(false);
  });

  it('charges more dash energy up front when already moving at speed', () => {
    expect(dashEntryEnergyCost(0, 235)).toBeCloseTo(0.04);
    expect(dashEntryEnergyCost(235, 235)).toBeCloseTo(0.14);
    expect(dashEntryEnergyCost(120, 235)).toBeGreaterThan(dashEntryEnergyCost(0, 235));
  });
});
