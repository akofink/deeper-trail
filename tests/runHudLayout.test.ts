import { describe, expect, it } from 'vitest';
import { buildRunHudLayout } from '../src/game/runtime/runHudLayout';

describe('buildRunHudLayout', () => {
  it('keeps both HUD panels anchored with room between them on wide screens', () => {
    const layout = buildRunHudLayout(1180);

    expect(layout.leftPanelX).toBe(12);
    expect(layout.rightPanelX + layout.rightPanelWidth).toBe(1168);
    expect(layout.rightPanelX).toBeGreaterThan(layout.leftPanelX + layout.leftPanelWidth);
    expect(layout.rowValueX).toBeGreaterThan(layout.rowLabelX);
    expect(layout.rightRowValueX).toBeGreaterThan(layout.rightRowLabelX);
  });

  it('falls back to full-width stacked panels on narrow screens', () => {
    const layout = buildRunHudLayout(540);

    expect(layout.leftPanelWidth).toBe(516);
    expect(layout.rightPanelWidth).toBe(516);
    expect(layout.leftPanelX).toBe(12);
    expect(layout.rightPanelX).toBe(12);
    expect(layout.leftGaugeWidth).toBeGreaterThanOrEqual(96);
    expect(layout.rightGaugeWidth).toBeGreaterThanOrEqual(86);
  });
});
