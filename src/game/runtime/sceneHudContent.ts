import { currentNodeType } from '../../engine/sim/world';
import { notebookClueProgress } from '../../engine/sim/notebook';
import { getMaxHealth } from '../../engine/sim/vehicle';
import { MODULE_LABELS } from './runLayout';
import { objectiveShortLabel, runObjectiveProgress } from './runObjectiveUi';
import type { RuntimeState } from './runtimeState';

export interface HudRowContent {
  label: string;
  value: string;
}

export interface RunHudContent {
  title: string;
  meta: string;
  seed: string;
  leftRows: [HudRowContent, HudRowContent, HudRowContent];
  rightRows: [HudRowContent, HudRowContent, HudRowContent];
  moduleLabels: string[];
}

export interface MapHudContent {
  title: string;
  meta: string;
  seed: string;
  leftRows: [HudRowContent, HudRowContent];
  rightHeaderLines: [string, string];
  moduleLabels: string[];
}

function buildModuleLabels(): string[] {
  return MODULE_LABELS.map((label) => label.slice(0, 5));
}

function notebookStatusText(state: RuntimeState): string {
  const progress = notebookClueProgress(state.sim);
  return `NB ${progress.discovered}/${progress.total}${state.sim.notebook.synthesisUnlocked ? ' SYNTH' : ''}`;
}

export function buildRunHudContent(state: RuntimeState): RunHudContent {
  const nodeType = currentNodeType(state.sim);
  const maxHealth = getMaxHealth(state.sim.vehicle);
  const objectiveProgress = runObjectiveProgress(state);

  return {
    title: `${nodeType} ${state.sim.currentNodeId}`,
    meta: `SCRAP ${state.sim.scrap}   SCORE ${state.score}   ${objectiveShortLabel(nodeType)}`,
    seed: `SEED ${state.seed}`,
    leftRows: [
      { label: 'HP', value: `${state.health}/${maxHealth}` },
      { label: 'FUEL', value: `${state.sim.fuel}/${state.sim.fuelCapacity}` },
      { label: 'PACE', value: `${Math.round(Math.abs(state.player.vx))}` }
    ],
    rightRows: [
      { label: 'GOALS', value: `${objectiveProgress.completed}/${objectiveProgress.total}` },
      { label: 'BOOST', value: `${Math.round(state.dashEnergy * 100)}%` },
      { label: 'SYSTEMS', value: '' }
    ],
    moduleLabels: buildModuleLabels()
  };
}

export function buildMapHudContent(state: RuntimeState, completionState: string): MapHudContent {
  return {
    title: `map ${state.sim.currentNodeId}`,
    meta: `DAY ${state.sim.day}   SCRAP ${state.sim.scrap}   ${completionState}   ${notebookStatusText(state)}`,
    seed: `SEED ${state.seed}`,
    leftRows: [
      { label: 'TRIPS', value: `${Math.min(3, state.freeTravelCharges)}` },
      { label: 'FUEL', value: `${state.sim.fuel}/${state.sim.fuelCapacity}` }
    ],
    rightHeaderLines: ['VEHICLE', 'LEVEL / CONDITION'],
    moduleLabels: buildModuleLabels()
  };
}
