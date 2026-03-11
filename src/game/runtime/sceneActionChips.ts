export interface SceneActionChip {
  color: string;
  height: number;
  label: string;
  labelFill: string;
  w: number;
  x: number;
  y: number;
}

export interface SceneActionChipSpec {
  color: string;
  label: string;
  labelFill: string;
  minWidth?: number;
  width: number;
}

export interface BuildSceneActionChipRowOptions {
  align?: 'center' | 'left';
  gap?: number;
  leftInset?: number;
  minGap?: number;
  rightInset?: number;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function buildSceneActionChipRow(
  screenWidth: number,
  chipY: number,
  chipHeight: number,
  specs: SceneActionChipSpec[],
  options: BuildSceneActionChipRowOptions = {}
): SceneActionChip[] {
  const align = options.align ?? 'center';
  const preferredGap = options.gap ?? 8;
  const minGap = Math.min(preferredGap, options.minGap ?? preferredGap);
  const leftInset = options.leftInset ?? 0;
  const rightInset = options.rightInset ?? leftInset;
  const availableWidth = Math.max(0, screenWidth - leftInset - rightInset);
  const widths = specs.map((spec) => spec.width);

  let gap = preferredGap;
  let rowWidth = sum(widths) + gap * Math.max(0, specs.length - 1);
  if (rowWidth > availableWidth && specs.length > 1) {
    gap = Math.max(minGap, preferredGap - Math.ceil((rowWidth - availableWidth) / (specs.length - 1)));
    rowWidth = sum(widths) + gap * (specs.length - 1);
  }

  if (rowWidth > availableWidth) {
    const minWidths = specs.map((spec) => spec.minWidth ?? spec.width);
    const shrinkCaps = widths.map((width, index) => Math.max(0, width - minWidths[index]!));
    let overflow = rowWidth - availableWidth;
    const shrinkable = sum(shrinkCaps);

    if (overflow > 0 && shrinkable > 0) {
      const reducedWidths = widths.map((width, index) => {
        const cap = shrinkCaps[index] ?? 0;
        if (cap <= 0) return width;
        const reduction = Math.min(cap, Math.floor((overflow * cap) / shrinkable));
        return width - reduction;
      });

      overflow = sum(reducedWidths) + gap * Math.max(0, specs.length - 1) - availableWidth;
      if (overflow > 0) {
        const shrinkOrder = reducedWidths
          .map((width, index) => ({ index, spare: width - (minWidths[index] ?? width) }))
          .sort((a, b) => b.spare - a.spare);

        for (const item of shrinkOrder) {
          if (overflow <= 0) break;
          const maxReduction = Math.min(item.spare, overflow);
          if (maxReduction <= 0) continue;
          reducedWidths[item.index] -= maxReduction;
          overflow -= maxReduction;
        }
      }

      widths.splice(0, widths.length, ...reducedWidths);
      rowWidth = sum(widths) + gap * Math.max(0, specs.length - 1);
    }
  }

  const baseX =
    align === 'left'
      ? leftInset
      : leftInset + Math.max(0, Math.round((availableWidth - rowWidth) * 0.5));

  let x = baseX;
  return specs.map((spec, index) => {
    const chip = {
      color: spec.color,
      height: chipHeight,
      label: spec.label,
      labelFill: spec.labelFill,
      w: widths[index] ?? spec.width,
      x,
      y: chipY
    };
    x += chip.w + gap;
    return chip;
  });
}
