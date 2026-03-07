export type DashInputState = 'inactive' | 'active' | 'conflict';

export function dashInputState(leftShiftDown: boolean, rightShiftDown: boolean): DashInputState {
  if (leftShiftDown && rightShiftDown) {
    return 'conflict';
  }

  if (leftShiftDown || rightShiftDown) {
    return 'active';
  }

  return 'inactive';
}

export function isDashHeld(inputState: DashInputState): boolean {
  return inputState === 'active';
}
