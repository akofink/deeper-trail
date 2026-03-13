import { noteBiomeHazard } from '../../engine/sim/exploration';
import { currentNodeType } from '../../engine/sim/world';
import { damageSubsystemForNodeType } from '../../engine/sim/vehicle';
import { attemptBeaconActivation, hasBeaconAutoLink } from './beaconActivation';
import { pullCollectibleTowardTarget } from './collectibleMagnetism';
import { applyCanopyLiftAssist, isInsideCanopyLift } from './canopyLifts';
import { decayDamageFeedback, triggerDamageFeedback } from './damageFeedback';
import { completeCurrentNodeRun } from './expeditionFlow';
import { goalSignalProfile } from './goalSignal';
import { buildExitLockedMessage, buildRunCompletionMessage } from './runCompletion';
import { dashEntryEnergyCost, shouldContinueDash, shouldStartDash } from './runDash';
import { dashInputState, isDashHeld } from './runInput';
import { advanceHorizontalVelocity } from './runMotion';
import { runObjectiveProgress, runObjectivePrompt, updateStickyRunPrompt } from './runObjectiveUi';
import { updateRunObjectives } from './runObjectiveUpdates';
import {
  COYOTE_TIME,
  JUMP_BUFFER_TIME,
  START_X,
  type RuntimeState
} from './runtimeState';
import { tryConsumeShieldCharge } from './shieldCharge';
import {
  collectibleMagnetRadius,
  collectibleMagnetSpeed,
  dashSpeedForState,
  hazardInvulnerabilitySeconds,
  jumpSpeedForState,
  runSpeedForState,
  scrapGainPerCollectible
} from './vehicleDerivedStats';
import { advanceWheelRotation } from './vehiclePresentation';

const GRAVITY = 1050;
const DASH_ENERGY_DRAIN_PER_SECOND = 2.6;
const DASH_ENERGY_RECOVER_PER_SECOND = 0.48;
const DASH_BOOST_RAMP_PER_SECOND = 8;
const DASH_BOOST_DECAY_PER_SECOND = 9;
const DASH_START_BOOST = 0.3;
const DASH_MIN_SPEED_RATIO = 0.62;
const JUMP_CUT_SPEED = 140;
const JUMP_CUT_MULTIPLIER = 0.52;
const FALL_GRAVITY_MULTIPLIER = 1.18;
const HANG_GRAVITY_MULTIPLIER = 0.88;

export interface RunStepInput {
  readonly dt: number;
  readonly screenWidth: number;
  readonly leftPressed: boolean;
  readonly rightPressed: boolean;
  readonly jumpPressed: boolean;
  readonly dashLeftPressed: boolean;
  readonly dashRightPressed: boolean;
  readonly previousJumpPressed: boolean;
  readonly previousDashPressed: boolean;
}

export interface RunStepResult {
  readonly previousJumpPressed: boolean;
  readonly previousDashPressed: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function intersects(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function distanceSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function updateHazardState(state: RuntimeState): void {
  for (const hazard of state.hazards) {
    const wave = Math.sin(state.elapsedSeconds * hazard.speed + hazard.phase);
    hazard.x = hazard.baseX + wave * hazard.amplitudeX;
    hazard.y = hazard.baseY - Math.max(0, wave) * hazard.amplitudeY;
    hazard.w = hazard.baseW + (hazard.kind === 'pulsing' ? Math.max(0, wave) * hazard.pulse : 0);
    hazard.h = hazard.baseH + (hazard.kind === 'pulsing' ? Math.max(0, -wave) * hazard.pulse * 0.55 : 0);
  }
}

export function stepRunState(state: RuntimeState, input: RunStepInput): RunStepResult {
  if (state.mode !== 'playing') {
    return {
      previousJumpPressed: input.jumpPressed,
      previousDashPressed: input.previousDashPressed
    };
  }

  state.elapsedSeconds += input.dt;
  if (state.mapMessageTimer > 0) {
    state.mapMessageTimer = Math.max(0, state.mapMessageTimer - input.dt);
  }
  decayDamageFeedback(state, input.dt);

  const player = state.player;
  const wasOnGround = player.onGround;
  const dashState = dashInputState(input.dashLeftPressed, input.dashRightPressed);
  const dashPressed = isDashHeld(dashState);
  const dashStart = shouldStartDash(dashPressed, input.previousDashPressed, state.dashEnergy);
  if (dashStart) {
    const facing = player.vx === 0 ? player.facing : Math.sign(player.vx);
    const entryCost = dashEntryEnergyCost(player.vx, runSpeedForState(state));
    state.dashDirection = facing < 0 ? -1 : 1;
    state.dashBoost = Math.max(state.dashBoost, DASH_START_BOOST);
    state.dashEnergy = Math.max(0, state.dashEnergy - entryCost);
  }

  let move = 0;
  if (input.leftPressed) move -= 1;
  if (input.rightPressed) move += 1;
  if (move !== 0) {
    player.facing = move < 0 ? -1 : 1;
  }

  if (input.jumpPressed && !input.previousJumpPressed) {
    player.jumpBufferTime = JUMP_BUFFER_TIME;
  }
  if (!input.jumpPressed && input.previousJumpPressed && player.vy < -JUMP_CUT_SPEED) {
    player.vy *= JUMP_CUT_MULTIPLIER;
  }

  player.jumpBufferTime = Math.max(0, player.jumpBufferTime - input.dt);
  player.coyoteTime = player.onGround ? COYOTE_TIME : Math.max(0, player.coyoteTime - input.dt);

  const targetSpeed = move * runSpeedForState(state);
  player.vx = advanceHorizontalVelocity(player.vx, targetSpeed, input.dt, player.onGround);

  const dashActive = dashStart || shouldContinueDash(dashPressed, state.dashBoost, state.dashEnergy);
  if (dashActive) {
    state.dashBoost = Math.min(1, state.dashBoost + DASH_BOOST_RAMP_PER_SECOND * input.dt);
    state.dashEnergy = Math.max(0, state.dashEnergy - DASH_ENERGY_DRAIN_PER_SECOND * input.dt);
    player.invuln = Math.max(player.invuln, 0.08);
    player.vx =
      state.dashDirection *
      dashSpeedForState(state) *
      (DASH_MIN_SPEED_RATIO + state.dashBoost * (1 - DASH_MIN_SPEED_RATIO));
  } else {
    state.dashBoost = Math.max(0, state.dashBoost - DASH_BOOST_DECAY_PER_SECOND * input.dt);
    state.dashEnergy = Math.min(1, state.dashEnergy + DASH_ENERGY_RECOVER_PER_SECOND * input.dt);
  }

  const wheelRadius = 8 + Math.max(0, state.sim.vehicle.suspension - 1);
  state.wheelRotation = advanceWheelRotation(state.wheelRotation, player.vx, input.dt, wheelRadius);

  if (player.jumpBufferTime > 0 && (player.onGround || player.coyoteTime > 0)) {
    player.vy = -jumpSpeedForState(state);
    player.onGround = false;
    player.coyoteTime = 0;
    player.jumpBufferTime = 0;
  }

  const preMoveBounds = {
    x: player.x,
    y: player.y,
    w: player.w,
    h: player.h
  };
  for (const lift of state.canopyLifts) {
    if (lift.charted || player.onGround || !isInsideCanopyLift(lift, preMoveBounds)) continue;
    player.vy = applyCanopyLiftAssist(player.vy, input.dt);
    break;
  }

  const gravityMultiplier =
    player.vy > 0 ? FALL_GRAVITY_MULTIPLIER : Math.abs(player.vy) < 90 && input.jumpPressed ? HANG_GRAVITY_MULTIPLIER : 1;
  const downwardSpeedBeforeGravity = player.vy;
  player.vy += GRAVITY * gravityMultiplier * input.dt;
  player.x += player.vx * input.dt;
  player.y += player.vy * input.dt;

  if (player.y + player.h >= state.groundY) {
    player.y = state.groundY - player.h;
    player.vy = 0;
    player.onGround = true;
    player.coyoteTime = COYOTE_TIME;
  } else {
    player.onGround = false;
  }

  player.x = clamp(player.x, 0, state.goalX + 120);

  if (player.invuln > 0) {
    player.invuln = Math.max(0, player.invuln - input.dt);
  }

  updateHazardState(state);

  const playerHitbox = { x: player.x + 2, y: player.y + 2, w: player.w - 4, h: player.h - 4 };
  const landedThisFrame = !wasOnGround && player.onGround;
  const landingSpeed = Math.max(downwardSpeedBeforeGravity, player.vy);

  for (const hazard of state.hazards) {
    if (!intersects(playerHitbox, hazard) || player.invuln > 0) continue;
    const nodeType = currentNodeType(state.sim);
    const damagedSubsystem = damageSubsystemForNodeType(state.sim, nodeType);
    noteBiomeHazard(state.sim, nodeType);
    player.invuln = hazardInvulnerabilitySeconds(state);
    player.x = Math.max(START_X, hazard.x - 80);
    player.y = state.groundY - player.h;
    player.vx = 0;
    player.vy = 0;
    player.onGround = true;
    player.coyoteTime = COYOTE_TIME;
    const shieldAbsorbed = tryConsumeShieldCharge(state);
    if (!shieldAbsorbed) {
      state.health -= 1;
      state.tookDamageThisRun = true;
    }
    triggerDamageFeedback(
      state,
      shieldAbsorbed ? 'shield' : 'health',
      hazard.x + hazard.w * 0.5,
      hazard.y + hazard.h * 0.4,
      player.x < hazard.x ? -1 : 1
    );
    state.mapMessage = shieldAbsorbed
      ? `Shield charge burned. ${damagedSubsystem} subsystem took field damage.`
      : `${damagedSubsystem} subsystem took field damage.`;
    state.mapMessageTimer = 2;
    if (state.health <= 0) state.mode = 'lost';
    break;
  }

  const px = player.x + player.w * 0.5;
  const py = player.y + player.h * 0.5;
  if (hasBeaconAutoLink(state)) {
    attemptBeaconActivation(state, 'auto');
  }
  const magnetRadius = collectibleMagnetRadius(state);
  const magnetSpeed = collectibleMagnetSpeed(state);
  for (const item of state.collectibles) {
    if (item.collected) continue;
    pullCollectibleTowardTarget(item, px, py, input.dt, magnetRadius, magnetSpeed);
    const rr = (item.r + 16) * (item.r + 16);
    if (distanceSq(px, py, item.x, item.y) <= rr) {
      item.collected = true;
      state.score += 10;
      state.sim.scrap += scrapGainPerCollectible(state);
    }
  }

  const objectiveUpdate = updateRunObjectives(state, {
    dt: input.dt,
    landedThisFrame,
    landingSpeed
  });
  if (objectiveUpdate.message) {
    state.mapMessage = objectiveUpdate.message;
    state.mapMessageTimer = objectiveUpdate.durationSeconds;
  }

  const objectiveProgress = runObjectiveProgress(state);
  const exitReady = objectiveProgress.completed >= objectiveProgress.total;
  if (player.x + player.w >= state.goalX && !exitReady) {
    player.x = state.goalX - 64;
    state.mapMessage = buildExitLockedMessage(objectiveProgress);
    state.mapMessageTimer = 2.5;
  } else if (player.x + player.w >= state.goalX) {
    const completion = completeCurrentNodeRun(state);
    const ending = completion.expeditionCompleted ? goalSignalProfile(state) : null;
    state.mapMessage = buildRunCompletionMessage({
      expeditionCompleted: completion.expeditionCompleted,
      expeditionEndingTitle: ending?.endingTitle,
      expeditionEndingDiscoveryNote: ending?.endingDiscoveryNote,
      expeditionEndingCompletionNote: ending?.endingCompletionNote,
      expeditionEndingEpilogueNote: ending?.endingEpilogueNote,
      flawlessRecovery: completion.flawlessRecovery,
      latestNotebookEntryTitle: completion.notebookUpdate.newEntries[completion.notebookUpdate.newEntries.length - 1]?.title
    });
    state.mapMessageTimer = 4;
  }

  const stickyPrompt = updateStickyRunPrompt(
    runObjectivePrompt(state),
    state.runPromptText,
    state.runPromptTimer,
    input.dt
  );
  state.runPromptText = stickyPrompt.text;
  state.runPromptTimer = stickyPrompt.timer;

  const maxCamera = Math.max(0, state.goalX - input.screenWidth * 0.5);
  state.cameraX = clamp(player.x - input.screenWidth * 0.35, 0, maxCamera);

  return {
    previousJumpPressed: input.jumpPressed,
    previousDashPressed: dashPressed
  };
}
