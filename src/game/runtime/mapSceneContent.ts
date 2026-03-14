import { asNodeTypeKey, biomeBenefitLabel, biomeRiskLabel, visibleBiomeKnowledge } from '../../engine/sim/exploration';
import { notebookClueProgress, notebookSignalRouteIntel } from '../../engine/sim/notebook';
import { buildSeedBuildShareCode } from '../../engine/sim/shareCode';
import { currentNodeType, findNode } from '../../engine/sim/world';
import { getInstallOffer, hasAnyUpgradeableSubsystem } from '../../engine/sim/vehicle';
import { goalSignalPrimerNote } from './goalSignal';
import { mapNodePalette } from './runLayout';
import type { RuntimeState } from './runtimeState';
import { getObjectiveSummary } from '../../engine/sim/runObjectives';

export interface MapSceneContent {
  completionState: 'COMPLETE' | 'READY' | 'LOCKED';
  shareCode: string;
  routeDetail: string;
  installHint: string;
  scannerHint: string;
  repairHint: string;
  fieldNotes: string[];
}

export interface MapSceneContentOptions {
  canUseMedPatch: boolean;
  medPatchHealAmount: number;
  medPatchScrapCost: number;
  hasAutoLinkScanner: boolean;
  hasCompletedCurrentNode: boolean;
}

export function buildMapSceneContent(
  state: RuntimeState,
  selectedNodeId: string | null,
  selectedDistance: number,
  options: MapSceneContentOptions
): MapSceneContent {
  const selectedNode = selectedNodeId ? findNode(state.sim, selectedNodeId) : null;
  const installOffer = getInstallOffer(state.sim, currentNodeType(state.sim));
  const selectedNodeType = asNodeTypeKey(selectedNode?.type ?? 'town');
  const signalIntel = notebookSignalRouteIntel(state.sim, state.expeditionGoalNodeId, selectedNodeId);
  const goalPrimerNote = goalSignalPrimerNote(selectedNodeId, state);
  const selectedKnowledge = visibleBiomeKnowledge(state.sim, selectedNodeType);
  const selectedRouteKnowledge = {
    benefitKnown: selectedKnowledge.benefitKnown || signalIntel.revealsBenefit,
    objectiveKnown: selectedKnowledge.objectiveKnown || signalIntel.revealsObjective,
    riskKnown: selectedKnowledge.riskKnown || signalIntel.revealsRisk
  };

  const routeDetail =
    selectedNode && selectedNodeId
      ? [
          `${selectedNode.id}  ${mapNodePalette(selectedNode.type).label}${selectedNode.id === state.expeditionGoalNodeId ? '  SIGNAL' : ''}`,
          `dist ${selectedDistance}  fuel ${selectedDistance}`,
          `${selectedRouteKnowledge.benefitKnown ? biomeBenefitLabel(selectedNodeType).replace(' on arrival', '') : 'benefit ?'} / ${
            selectedRouteKnowledge.riskKnown ? biomeRiskLabel(selectedNodeType).replace('Hazards strain ', '') : 'risk ?'
          }`,
          selectedRouteKnowledge.objectiveKnown ? getObjectiveSummary(selectedNode.type) : 'Objective pattern ?',
          signalIntel.routeHint ?? 'Signal triangulation offline.',
          goalPrimerNote,
          !state.expeditionComplete && state.legacyCarryOverType
            ? `Legacy echo armed: ${state.legacyCarryOverNote ?? 'carry-over route hook ready'}`
            : null,
          state.expeditionComplete && (state.postGoalRouteHookCharges ?? 0) > 0
            ? `Afterglow ${state.postGoalRouteHookCharges}x: ${state.postGoalRouteHookNote ?? 'follow-on route hook active'}`
            : null
        ].filter((line): line is string => Boolean(line)).join('\n')
      : 'Select a connected route.';

  const installHint = installOffer
    ? `Site: +${installOffer.subsystem} lv${installOffer.nextLevel}  cost ${installOffer.scrapCost}`
    : hasAnyUpgradeableSubsystem(state.sim)
      ? 'Site: no install here. Try another biome.'
      : 'Vehicle: fully maxed.';

  const scannerHint = options.hasAutoLinkScanner
    ? `Scanner lv.${state.sim.vehicle.scanner}: route preview, objective scan, phase-lock, and auto-link online.`
    : state.sim.vehicle.scanner >= 2
      ? `Scanner lv.${state.sim.vehicle.scanner}: route preview online${state.sim.vehicle.scanner >= 3 ? ', objective scan online' : ', objective scan at lv.3'}; phase-lock online${state.sim.vehicle.scanner >= 4 ? ', hazard preview online.' : ', hazard preview at lv.4.'}`
      : `Scanner lv.${state.sim.vehicle.scanner}: route preview + phase-lock at lv.2, objective scan + auto-link at lv.3.`;

  const repairHint = options.canUseMedPatch
    ? `B: +${options.medPatchHealAmount} HP for ${options.medPatchScrapCost} scrap.`
    : 'B: repair modules, then patch HP.';

  const notebookProgress = notebookClueProgress(state.sim);
  const fieldNotes = ['KNOWN BIOMES'];
  fieldNotes.push(signalIntel.fieldNote);
  fieldNotes.push('');
  for (const type of ['town', 'ruin', 'nature', 'anomaly'] as const) {
    const knowledge = state.sim.exploration.biomeKnowledge[type];
    const visibleKnowledge = visibleBiomeKnowledge(state.sim, type);
    const name = mapNodePalette(type).label.padEnd(6, ' ');
    const benefit = visibleKnowledge.benefitKnown ? biomeBenefitLabel(type).replace(' on arrival', '') : '+?';
    const objective = visibleKnowledge.objectiveKnown ? getObjectiveSummary(type) : 'pattern ?';
    const risk = visibleKnowledge.riskKnown ? biomeRiskLabel(type).replace('Hazards strain ', '') : '?';
    fieldNotes.push(`${name} ${knowledge.visits}x  ${benefit}  /  ${objective}  /  ${risk}`);
  }
  fieldNotes.push('');
  fieldNotes.push(`NOTEBOOK ${notebookProgress.discovered}/${notebookProgress.total}${state.sim.notebook.synthesisUnlocked ? '  SYNTH' : ''}`);
  if (state.sim.notebook.entries.length === 0) {
    fieldNotes.push('Complete ruin, nature, and anomaly runs to log signal clues.');
  } else {
    for (const entry of state.sim.notebook.entries.slice(-3)) {
      fieldNotes.push(entry.title.toUpperCase());
      fieldNotes.push(entry.body);
    }
  }
  if (state.expeditionComplete && (state.postGoalRouteHookCharges ?? 0) > 0) {
    fieldNotes.push('');
    fieldNotes.push(`AFTERGLOW ${state.postGoalRouteHookCharges}x`);
    fieldNotes.push(state.postGoalRouteHookNote ?? 'Decoded source aftermath remains active.');
  } else if (state.legacyCarryOverType) {
    fieldNotes.push('');
    fieldNotes.push('LEGACY ECHO READY');
    fieldNotes.push(state.legacyCarryOverNote ?? 'Decoded source aftermath is queued for the next route.');
  }

  return {
    completionState: state.expeditionComplete ? 'COMPLETE' : options.hasCompletedCurrentNode ? 'READY' : 'LOCKED',
    shareCode: buildSeedBuildShareCode(state.sim),
    routeDetail,
    installHint,
    scannerHint,
    repairHint,
    fieldNotes
  };
}
