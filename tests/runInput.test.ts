import { describe, expect, it } from 'vitest';
import { dashInputState, isDashHeld } from '../src/game/runtime/runInput';

describe('dash input handling', () => {
  it('treats a single shift key as an active dash input', () => {
    expect(dashInputState(true, false)).toBe('active');
    expect(dashInputState(false, true)).toBe('active');
    expect(isDashHeld(dashInputState(true, false))).toBe(true);
  });

  it('rejects simultaneous shift keys as a conflicted dash input', () => {
    const inputState = dashInputState(true, true);

    expect(inputState).toBe('conflict');
    expect(isDashHeld(inputState)).toBe(false);
  });
});
