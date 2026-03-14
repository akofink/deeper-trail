import { describe, expect, it, vi } from 'vitest';

import {
  attachDebugWindowHooks,
  type BrowserShellWindow,
  createRunSeed,
  initialSeedFromSearch,
  initialSeedFromWindow
} from '../src/game/runtime/browserShell';

describe('browserShell helpers', () => {
  it('prefers crypto UUID seeds when available', () => {
    expect(
      createRunSeed({
        randomUUID: () => '12345678-9abc-def0-1234-56789abcdef0'
      })
    ).toBe('12345678');
  });

  it('falls back to time and random when crypto UUID is unavailable', () => {
    expect(createRunSeed(null, () => 46655, () => 0.5)).toBe('zzz-i000');
  });

  it('reads and trims the seed query parameter', () => {
    expect(initialSeedFromSearch('?seed=%20expedition-42%20')).toBe('expedition-42');
    expect(initialSeedFromSearch('?other=value')).toBeUndefined();
    expect(initialSeedFromSearch('?seed=%20%20')).toBeUndefined();
  });

  it('reads the initial seed from a browser-style window object', () => {
    expect(initialSeedFromWindow({ location: { search: '?seed=route-a' } })).toBe('route-a');
  });

  it('attaches deterministic debug hooks to the browser window', () => {
    const shellWindow: BrowserShellWindow = { location: { search: '' } };
    const advanceTime = vi.fn<(ms: number) => void>();

    attachDebugWindowHooks(shellWindow, {
      renderGameToText: () => 'snapshot',
      advanceTime
    });

    expect(shellWindow.render_game_to_text?.()).toBe('snapshot');

    shellWindow.advanceTime?.(250);
    expect(advanceTime).toHaveBeenCalledWith(250);
  });
});
