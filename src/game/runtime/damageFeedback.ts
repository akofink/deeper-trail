import type { DamageFeedback, RuntimeState } from './runtimeState';

const HEALTH_FEEDBACK_DURATION = 0.34;
const SHIELD_FEEDBACK_DURATION = 0.26;

export interface DamageFeedbackView {
  avatarFlashAlpha: number;
  avatarFlashColor: string;
  impactX: number;
  impactY: number;
  overlayAlpha: number;
  overlayColor: string;
  ringAlpha: number;
  ringColor: string;
  ringRadius: number;
  sparks: Array<{
    alpha: number;
    color: string;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    width: number;
  }>;
}

function feedbackDuration(kind: DamageFeedback['kind']): number {
  return kind === 'health' ? HEALTH_FEEDBACK_DURATION : SHIELD_FEEDBACK_DURATION;
}

export function triggerDamageFeedback(
  state: RuntimeState,
  kind: DamageFeedback['kind'],
  worldX: number,
  worldY: number,
  direction: -1 | 1
): void {
  state.damageFeedback = {
    kind,
    timer: feedbackDuration(kind),
    duration: feedbackDuration(kind),
    worldX,
    worldY,
    direction
  };
}

export function decayDamageFeedback(state: RuntimeState, dt: number): void {
  if (!state.damageFeedback) return;

  state.damageFeedback.timer = Math.max(0, state.damageFeedback.timer - dt);
  if (state.damageFeedback.timer === 0) {
    state.damageFeedback = undefined;
  }
}

export function buildDamageFeedbackView(state: RuntimeState, cameraX: number): DamageFeedbackView | null {
  const feedback = state.damageFeedback;
  if (!feedback || feedback.duration <= 0 || feedback.timer <= 0) {
    return null;
  }

  const ratio = feedback.timer / feedback.duration;
  const progress = 1 - ratio;
  const healthHit = feedback.kind === 'health';
  const overlayColor = healthHit ? '#fb7185' : '#c084fc';
  const ringColor = healthHit ? '#fdba74' : '#e9d5ff';
  const avatarFlashColor = healthHit ? '#fff1f2' : '#f5f3ff';
  const impactX = feedback.worldX - cameraX;
  const impactY = feedback.worldY;
  const swing = state.elapsedSeconds * 22;
  const baseAngle = feedback.direction === 1 ? 0 : Math.PI;
  const sparkCount = 5;
  const sparks = Array.from({ length: sparkCount }, (_, index) => {
    const arc = (-0.9 + index * 0.45) * Math.PI * 0.35;
    const angle = baseAngle + arc + Math.sin(swing + index * 0.7) * 0.08;
    const length = 18 + progress * 24 + index * 2;
    const inner = 8 + progress * 4;
    return {
      alpha: (healthHit ? 0.8 : 0.58) * ratio,
      color: healthHit ? '#fde68a' : '#ddd6fe',
      fromX: impactX + Math.cos(angle) * inner,
      fromY: impactY + Math.sin(angle) * inner * 0.8,
      toX: impactX + Math.cos(angle) * (inner + length),
      toY: impactY + Math.sin(angle) * (inner + length) * 0.8,
      width: healthHit ? 2.8 : 2.2
    };
  });

  return {
    avatarFlashAlpha: (healthHit ? 0.52 : 0.34) * ratio,
    avatarFlashColor,
    impactX,
    impactY,
    overlayAlpha: (healthHit ? 0.18 : 0.12) * ratio,
    overlayColor,
    ringAlpha: (healthHit ? 0.42 : 0.3) * ratio,
    ringColor,
    ringRadius: 20 + progress * 34,
    sparks
  };
}
