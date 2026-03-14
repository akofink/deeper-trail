import { asNodeTypeKey, biomeBenefitLabel, biomeRiskLabel, visibleBiomeKnowledge } from '../../engine/sim/exploration';
import { notebookClueProgress, notebookSignalRouteIntel } from '../../engine/sim/notebook';
import { buildSeedBuildShareCode } from '../../engine/sim/shareCode';
import { currentNodeType, findNode } from '../../engine/sim/world';
import {
  getInstallOffer,
  getInstallOffers,
  hasAnyUpgradeableSubsystem,
  missingVehicleConditionPoints,
  WORKSHOP_REPAIR_COST_PER_POINT
} from '../../engine/sim/vehicle';
import { describeGoalRouteHookEffect, goalSignalPrimerNote } from './goalSignal';
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
  const activeNodeType = currentNodeType(state.sim);
  const installOffers = getInstallOffers(state.sim, currentNodeType(state.sim));
  const selectedInstallIndex = Math.max(0, Math.min(state.mapInstallSelectionIndex ?? 0, Math.max(0, installOffers.length - 1)));
  const installOffer = getInstallOffer(state.sim, activeNodeType, selectedInstallIndex);
  const selectedNodeType = asNodeTypeKey(selectedNode?.type ?? 'town');
  const signalIntel = notebookSignalRouteIntel(state.sim, state.expeditionGoalNodeId, selectedNodeId);
  const goalPrimerNote = goalSignalPrimerNote(selectedNodeId, state);
  const selectedKnowledge = visibleBiomeKnowledge(state.sim, selectedNodeType);
  const selectedRouteKnowledge = {
    benefitKnown: selectedKnowledge.benefitKnown || signalIntel.revealsBenefit,
    objectiveKnown: selectedKnowledge.objectiveKnown || signalIntel.revealsObjective,
    riskKnown: selectedKnowledge.riskKnown || signalIntel.revealsRisk
  };

  const legacyCarryOvers = state.legacyCarryOvers;
  const legacyCarryOverSummary =
    legacyCarryOvers.length > 0 ? legacyCarryOvers.map((carryOver) => carryOver.note || 'carry-over route hook ready').join(' / ') : null;
  const legacyCarryOverPreview =
    legacyCarryOvers.length > 0
      ? legacyCarryOvers
          .map((carryOver) => `${carryOver.sourceTitle}: ${describeGoalRouteHookEffect(carryOver.type)}`)
          .join(' / ')
      : null;
  const activeAfterglowPreview =
    state.expeditionComplete && (state.postGoalRouteHookCharges ?? 0) > 0 && state.postGoalRouteHookType
      ? describeGoalRouteHookEffect(state.postGoalRouteHookType)
      : null;

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
          signalIntel.bestLeadArrivalRewardHint,
          goalPrimerNote,
          legacyCarryOverPreview ? `Legacy route payout: ${legacyCarryOverPreview}` : null,
          !state.expeditionComplete && legacyCarryOverSummary
            ? `Legacy echoes armed (${legacyCarryOvers.length}): ${legacyCarryOverSummary}`
            : null,
          activeAfterglowPreview
            ? `Next route afterglow (${state.postGoalRouteHookCharges}x): ${activeAfterglowPreview}`
            : null,
          state.expeditionComplete && (state.postGoalRouteHookCharges ?? 0) > 0
            ? `Afterglow ${state.postGoalRouteHookCharges}x: ${state.postGoalRouteHookNote ?? 'follow-on route hook active'}`
            : null
        ].filter((line): line is string => Boolean(line)).join('\n')
      : 'Select a connected route.';

  const installHint = installOffer
    ? [
        `Site ${selectedInstallIndex + 1}/${installOffers.length}: +${installOffer.subsystem} lv${installOffer.nextLevel}  cost ${installOffer.scrapCost}`,
        installOffers.length > 1
          ? `Alt ${installOffer.subsystem === installOffers[0]?.subsystem ? installOffers[1]?.subsystem : installOffers[0]?.subsystem} available. Left/Right cycles the rack.`
          : 'Only one site module remains here.'
      ].join('\n')
    : hasAnyUpgradeableSubsystem(state.sim)
      ? 'Site: no install here. Try another biome.'
      : 'Vehicle: fully maxed.';

  const scannerHint = options.hasAutoLinkScanner
    ? `Scanner lv.${state.sim.vehicle.scanner}: route preview, objective scan, phase-lock, and auto-link online.`
    : state.sim.vehicle.scanner >= 2
      ? `Scanner lv.${state.sim.vehicle.scanner}: route preview online${state.sim.vehicle.scanner >= 3 ? ', objective scan online' : ', objective scan at lv.3'}; phase-lock online${state.sim.vehicle.scanner >= 4 ? ', hazard preview online.' : ', hazard preview at lv.4.'}`
      : `Scanner lv.${state.sim.vehicle.scanner}: route preview + phase-lock at lv.2, objective scan + auto-link at lv.3.`;

  const workshopRepairCost = missingVehicleConditionPoints(state.sim.vehicleCondition) * WORKSHOP_REPAIR_COST_PER_POINT;
  const repairHint =
    activeNodeType === 'town'
      ? workshopRepairCost > 0
        ? `B: town workshop restores all module integrity for ${workshopRepairCost} scrap.`
        : options.canUseMedPatch
          ? `B: +${options.medPatchHealAmount} HP med patch for ${options.medPatchScrapCost} scrap.`
          : 'B: workshop is idle; hull patch only when damaged.'
      : options.canUseMedPatch
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
    if (activeAfterglowPreview) {
      fieldNotes.push(`NEXT ROUTE ${activeAfterglowPreview}`);
    }
    fieldNotes.push(state.postGoalRouteHookNote ?? 'Decoded source aftermath remains active.');
  } else if (legacyCarryOvers.length > 0) {
    fieldNotes.push('');
    fieldNotes.push(`LEGACY ECHOES ${legacyCarryOvers.length}x`);
    legacyCarryOvers.forEach((carryOver) => {
      fieldNotes.push(carryOver.sourceTitle.toUpperCase());
      fieldNotes.push(`NEXT ROUTE ${describeGoalRouteHookEffect(carryOver.type)}`);
      fieldNotes.push(carryOver.note || 'Decoded source aftermath is queued for the next route.');
    });
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
