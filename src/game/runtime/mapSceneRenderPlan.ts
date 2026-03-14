import { connectedNeighbors } from '../../engine/sim/world';
import { goalSignalCelebrationDetail } from './goalSignal';
import { buildMapActionChips, buildMapBoardView, type MapBoardView } from './mapBoardView';
import { buildMapSceneCardPlan, buildMapSceneCopy, type MapSceneCardPlan } from './mapSceneCards';
import { buildMapSceneContent, type MapSceneContent } from './mapSceneContent';
import { buildMapScannerFlags } from './mapSceneFlow';
import { buildMapSceneHudViewModel, type MapSceneHudViewModel } from './mapSceneHudView';
import { buildMapSceneTextAssembly, type MapSceneTextAssembly } from './mapSceneTextAssembly';
import {
  MEDPATCH_HEAL_AMOUNT,
  MEDPATCH_SCRAP_COST,
  canUseMedPatch,
  type RuntimeState
} from './runtimeState';
import type { SceneActionChip } from './sceneActionChips';
import type { SceneTextCardSpec } from './sceneTextCards';
import type { MeasuredTextSize, SceneTextView } from './sceneTextView';

export interface MapSceneRenderPlan {
  boardView: MapBoardView;
  chips: SceneActionChip[];
  content: MapSceneContent;
  hudView: MapSceneHudViewModel;
  textAssembly: MapSceneTextAssembly;
  cards: MapSceneCardPlan;
}

export interface BuildMapSceneRenderPlanInput {
  state: RuntimeState;
  screenWidth: number;
  screenHeight: number;
  boardMargin: number;
  moduleLabelCount: number;
  measureCard: (card: SceneTextCardSpec) => MeasuredTextSize;
  measureText: (view: SceneTextView) => MeasuredTextSize;
}

export function buildMapSceneRenderPlan({
  state,
  screenWidth,
  screenHeight,
  boardMargin,
  moduleLabelCount,
  measureCard,
  measureText
}: BuildMapSceneRenderPlanInput): MapSceneRenderPlan {
  const options = connectedNeighbors(state.sim);
  const selectedOption = options[state.mapSelectionIndex] ?? null;

  const content = buildMapSceneContent(state, selectedOption?.nodeId ?? null, selectedOption?.distance ?? 0, {
    canUseMedPatch: canUseMedPatch(state),
    medPatchHealAmount: MEDPATCH_HEAL_AMOUNT,
    medPatchScrapCost: MEDPATCH_SCRAP_COST,
    ...buildMapScannerFlags(state)
  });

  const copy = buildMapSceneCopy({
    celebrationDetail: state.expeditionComplete ? goalSignalCelebrationDetail(state) : null,
    expeditionComplete: state.expeditionComplete,
    installHint: content.installHint,
    mapMessage: state.mapMessage,
    mapMessageTimer: state.mapMessageTimer,
    repairHint: content.repairHint,
    routeDetail: content.routeDetail,
    scannerHint: content.scannerHint,
    score: state.score,
    seed: state.seed,
    shareCode: content.shareCode
  });

  const cards = buildMapSceneCardPlan({
    celebrationText: copy.celebrationText,
    fieldNotesText: content.fieldNotes.join('\n'),
    measureCard,
    routeText: copy.routeText,
    screenHeight,
    screenWidth,
    showRouteCard: copy.showRouteCard
  });

  const hudView = buildMapSceneHudViewModel(state, screenWidth, content.completionState, moduleLabelCount);
  const chips = buildMapActionChips(
    screenWidth,
    cards.layout.chipY,
    cards.layout.chipHeight,
    state.expeditionComplete
  );
  const textAssembly = buildMapSceneTextAssembly({ chips, hud: hudView, measureText });

  return {
    boardView: buildMapBoardView(state, screenWidth, screenHeight, boardMargin),
    cards,
    chips,
    content,
    hudView,
    textAssembly
  };
}
