import { currentNodeType } from '../../engine/sim/world';
import { buildRunObjectiveVisualState, type RunObjectiveVisualState } from './runObjectiveVisuals';
import { runObjectiveProgress } from './runObjectiveUi';
import { buildRunSceneHudViewModel, type RunSceneHudViewModel } from './runSceneHudView';
import { buildBeaconLabelViews } from './runSceneObjectiveView';
import { buildRunSceneTextAssembly, type RunSceneTextAssembly } from './runSceneTextAssembly';
import { buildRunActionChips, buildRunSceneOverlayCard, type RunSceneOverlayCard } from './runSceneView';
import type { RuntimeState } from './runtimeState';
import type { SceneActionChip } from './sceneActionChips';
import type { MeasuredTextSize, SceneTextView } from './sceneTextView';

export interface RunSceneRenderPlan {
  chips: SceneActionChip[];
  exitReady: boolean;
  hudView: RunSceneHudViewModel;
  nodeType: string;
  objectiveVisuals: RunObjectiveVisualState;
  overlayCard: RunSceneOverlayCard | null;
  textAssembly: RunSceneTextAssembly;
}

export interface BuildRunSceneRenderPlanInput {
  cameraX: number;
  measureText: (view: SceneTextView) => MeasuredTextSize;
  moduleLabelCount: number;
  screenHeight: number;
  screenWidth: number;
  state: RuntimeState;
}

export function buildRunSceneRenderPlan({
  cameraX,
  measureText,
  moduleLabelCount,
  screenHeight,
  screenWidth,
  state
}: BuildRunSceneRenderPlanInput): RunSceneRenderPlan {
  const objectiveVisuals = buildRunObjectiveVisualState(state);
  const objectiveProgress = runObjectiveProgress(state);
  const exitReady = objectiveProgress.completed >= objectiveProgress.total;
  const hudView = buildRunSceneHudViewModel(state, screenWidth, moduleLabelCount);
  const chips = buildRunActionChips(state, screenWidth, screenHeight);
  const textAssembly = buildRunSceneTextAssembly({
    beaconLabels: buildBeaconLabelViews(objectiveVisuals, cameraX),
    chips,
    hud: hudView,
    measureText
  });

  return {
    chips,
    exitReady,
    hudView,
    nodeType: currentNodeType(state.sim),
    objectiveVisuals,
    overlayCard: buildRunSceneOverlayCard(state, screenWidth),
    textAssembly
  };
}
