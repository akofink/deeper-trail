import { describe, expect, it } from 'vitest';
import { buildSceneActionChipRow } from '../src/game/runtime/sceneActionChips';

describe('sceneActionChips', () => {
  it('preserves the preferred centered row when there is enough width', () => {
    const chips = buildSceneActionChipRow(
      600,
      662,
      34,
      [
        { width: 90, minWidth: 70, color: '#000', label: 'A', labelFill: '#fff' },
        { width: 80, minWidth: 64, color: '#111', label: 'B', labelFill: '#fff' },
        { width: 70, minWidth: 60, color: '#222', label: 'C', labelFill: '#fff' }
      ],
      { align: 'center', gap: 10, leftInset: 20, rightInset: 20, minGap: 6 }
    );

    expect(chips.map((chip) => chip.w)).toEqual([90, 80, 70]);
    expect(chips[0]?.x).toBe(170);
    expect(chips[1]?.x).toBe(270);
    expect(chips[2]?.x).toBe(360);
  });

  it('shrinks widths and gaps to respect insets on tighter screens', () => {
    const chips = buildSceneActionChipRow(
      260,
      662,
      34,
      [
        { width: 90, minWidth: 70, color: '#000', label: 'A', labelFill: '#fff' },
        { width: 80, minWidth: 64, color: '#111', label: 'B', labelFill: '#fff' },
        { width: 70, minWidth: 60, color: '#222', label: 'C', labelFill: '#fff' }
      ],
      { align: 'left', gap: 10, leftInset: 20, rightInset: 20, minGap: 6 }
    );

    expect(chips.map((chip) => chip.w)).toEqual([75, 69, 64]);
    expect(chips[0]?.x).toBe(20);
    expect(chips[1]?.x).toBe(101);
    expect(chips[2]?.x).toBe(176);
    expect(chips.at(-1)!.x + chips.at(-1)!.w).toBe(240);
  });
});
