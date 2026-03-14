import { describe, expect, it, vi } from 'vitest';

describe('browserShell module imports', () => {
  it('loads helper exports without browser globals', async () => {
    vi.resetModules();
    vi.stubGlobal('navigator', undefined);

    const module = await import('../src/game/runtime/browserShell');

    expect(module.initialSeedFromSearch('?seed=stable-run')).toBe('stable-run');
  });
});
