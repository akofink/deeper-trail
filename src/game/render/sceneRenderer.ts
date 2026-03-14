import type { Graphics, Text } from 'pixi.js';
import { biomeByNodeType } from '../runtime/runLayout';
import type { RuntimeState } from '../runtime/runtimeState';
import { buildMapSceneRenderPlan, type MapSceneRenderPlan } from '../runtime/mapSceneRenderPlan';
import { buildRunSceneRenderPlan, type RunSceneRenderPlan } from '../runtime/runSceneRenderPlan';
import type { SceneTextNodes } from './sceneTextBootstrap';
import { drawMapBoard } from './mapBoardRenderer';
import { measureTextView } from './pixiText';
import { measureTextCard } from './pixiPrimitives';
import {
  drawMapBackdrop,
  drawVehicleAvatar,
  renderRunSceneWorld
} from './runSceneRenderer';
import { beginSceneFrame } from './sceneFrame';
import {
  applyOptionalTextCard,
  renderMapSceneCards,
  renderMapSceneHud,
  renderRunSceneHud,
  renderSceneActionChips
} from './sceneHudRenderer';

interface SceneRendererViewport {
  readonly screenHeight: () => number;
  readonly screenWidth: () => number;
}

interface SceneRendererSurfaces {
  readonly graphics: Graphics;
  readonly playerGraphics: Graphics;
}

export interface SceneRendererContext extends SceneRendererViewport, SceneRendererSurfaces {
  readonly labels: SceneTextNodes;
}

export interface SceneRendererDependencies {
  readonly beginSceneFrame: typeof beginSceneFrame;
  readonly biomeByNodeType: typeof biomeByNodeType;
  readonly buildMapSceneRenderPlan: typeof buildMapSceneRenderPlan;
  readonly buildRunSceneRenderPlan: typeof buildRunSceneRenderPlan;
  readonly drawMapBackdrop: typeof drawMapBackdrop;
  readonly drawMapBoard: typeof drawMapBoard;
  readonly drawVehicleAvatar: typeof drawVehicleAvatar;
  readonly renderMapSceneCards: typeof renderMapSceneCards;
  readonly renderMapSceneHud: typeof renderMapSceneHud;
  readonly renderRunSceneHud: typeof renderRunSceneHud;
  readonly renderRunSceneWorld: typeof renderRunSceneWorld;
  readonly applyOptionalTextCard: typeof applyOptionalTextCard;
  readonly renderSceneActionChips: typeof renderSceneActionChips;
}

const defaultDependencies: SceneRendererDependencies = {
  beginSceneFrame,
  biomeByNodeType,
  buildMapSceneRenderPlan,
  buildRunSceneRenderPlan,
  drawMapBackdrop,
  drawMapBoard,
  drawVehicleAvatar,
  renderMapSceneCards,
  renderMapSceneHud,
  renderRunSceneHud,
  renderRunSceneWorld,
  applyOptionalTextCard,
  renderSceneActionChips
};

function runSceneOverlayResetLabels(labels: SceneTextNodes): Text[] {
  return [labels.panelSeed, labels.celebrationOverlay, labels.fieldNotesText];
}

function mapSceneOverlayResetLabels(labels: SceneTextNodes): Text[] {
  return [labels.panelSeed, labels.fieldNotesText];
}

function buildRunPlan(
  state: RuntimeState,
  context: SceneRendererContext,
  dependencies: SceneRendererDependencies
): RunSceneRenderPlan {
  const width = context.screenWidth();
  const height = context.screenHeight();

  return dependencies.buildRunSceneRenderPlan({
    cameraX: state.cameraX,
    measureText: (view) => measureTextView(context.labels.beaconLabels[0] ?? context.labels.hud, view),
    moduleLabelCount: context.labels.moduleLabels.length,
    screenHeight: height,
    screenWidth: width,
    state
  });
}

function buildMapPlan(
  state: RuntimeState,
  context: SceneRendererContext,
  dependencies: SceneRendererDependencies
): MapSceneRenderPlan {
  const width = context.screenWidth();
  const height = context.screenHeight();

  return dependencies.buildMapSceneRenderPlan({
    state,
    screenWidth: width,
    screenHeight: height,
    boardMargin: 110,
    moduleLabelCount: context.labels.moduleLabels.length,
    measureCard: (card) => measureTextCard(card.fill === '#0f172a' ? context.labels.fieldNotesText : context.labels.overlay, card),
    measureText: (view) => measureTextView(context.labels.mapLeftRowLabels[0] ?? context.labels.hud, view)
  });
}

export function drawRunScene(
  state: RuntimeState,
  context: SceneRendererContext,
  dependencies: SceneRendererDependencies = defaultDependencies
): void {
  const width = context.screenWidth();
  const height = context.screenHeight();
  const plan = buildRunPlan(state, context, dependencies);
  const colors = dependencies.biomeByNodeType(plan.nodeType);

  dependencies.beginSceneFrame(
    context.graphics,
    context.playerGraphics,
    runSceneOverlayResetLabels(context.labels),
    context.labels.sharedSceneTextGroups
  );
  dependencies.renderRunSceneWorld(
    context.graphics,
    state,
    plan.nodeType,
    colors,
    plan.objectiveVisuals,
    state.cameraX,
    width,
    height,
    plan.exitReady
  );
  dependencies.drawVehicleAvatar(context.playerGraphics, state, state.cameraX);
  dependencies.renderRunSceneHud(
    context.graphics,
    {
      beaconLabels: context.labels.beaconLabels,
      hud: context.labels.hud,
      leftRowLabels: context.labels.runLeftRowLabels,
      leftRowValues: context.labels.runLeftRowValues,
      moduleLabels: context.labels.moduleLabels,
      panelMeta: context.labels.panelMeta,
      panelSeed: context.labels.panelSeed,
      rightRowLabels: context.labels.runRightRowLabels,
      rightRowValues: context.labels.runRightRowValues
    },
    plan.hudView,
    plan.textAssembly
  );
  dependencies.applyOptionalTextCard(context.graphics, context.labels.overlay, plan.overlayCard);
  dependencies.renderSceneActionChips(
    context.graphics,
    context.labels.chipLabels,
    plan.chips,
    plan.textAssembly.chipLabels
  );
}

export function drawMapScene(
  state: RuntimeState,
  context: SceneRendererContext,
  dependencies: SceneRendererDependencies = defaultDependencies
): void {
  const plan = buildMapPlan(state, context, dependencies);

  dependencies.beginSceneFrame(
    context.graphics,
    context.playerGraphics,
    mapSceneOverlayResetLabels(context.labels),
    context.labels.sharedSceneTextGroups
  );
  dependencies.drawMapBackdrop(context.graphics, context.screenWidth(), context.screenHeight());
  dependencies.drawMapBoard(context.graphics, plan.boardView);
  dependencies.renderMapSceneHud(
    context.graphics,
    {
      hud: context.labels.hud,
      leftRowLabels: context.labels.mapLeftRowLabels,
      leftRowValues: context.labels.mapLeftRowValues,
      moduleLabels: context.labels.moduleLabels,
      panelMeta: context.labels.panelMeta,
      panelSeed: context.labels.panelSeed,
      rightHeaderLines: context.labels.mapRightHeaderLines
    },
    plan.hudView,
    plan.textAssembly
  );
  dependencies.renderMapSceneCards(
    context.graphics,
    {
      celebrationOverlay: context.labels.celebrationOverlay,
      fieldNotesText: context.labels.fieldNotesText,
      overlay: context.labels.overlay
    },
    plan.cards.views,
    plan.cards.layout.celebrationAccents
  );
  dependencies.renderSceneActionChips(
    context.graphics,
    context.labels.chipLabels,
    plan.chips,
    plan.textAssembly.chipLabels
  );
}
