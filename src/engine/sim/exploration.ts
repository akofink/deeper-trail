import { type GameState, type NodeTypeKey, NODE_TYPE_KEYS, type VehicleSubsystemKey } from '../../game/state/gameState';
import { getDamageSubsystemForNodeType } from './vehicle';

export interface VisibleBiomeKnowledge {
  benefitKnown: boolean;
  objectiveKnown: boolean;
  riskKnown: boolean;
}

export interface RouteSignalIntelKnowledge {
  revealsBenefit: boolean;
  revealsObjective: boolean;
  revealsRisk: boolean;
}

export interface BiomeRiskDescriptor {
  markerColor: string;
  preview: string;
  shortLabel: string;
  subsystem: VehicleSubsystemKey;
}

export function biomeBenefitLabel(nodeType: NodeTypeKey): string {
  if (nodeType === 'town') return 'Fuel cache: +8 fuel on arrival';
  if (nodeType === 'ruin') return 'Salvage site: +2 scrap on arrival';
  if (nodeType === 'nature') return 'Shelter grove: +1 HP on arrival';
  return 'Scan pulse: scanner +1 on arrival';
}

export function biomeRiskLabel(nodeType: NodeTypeKey): string {
  return `Hazards strain ${getDamageSubsystemForNodeType(nodeType)}`;
}

export function biomeRiskDescriptor(nodeType: NodeTypeKey): BiomeRiskDescriptor {
  const subsystem = getDamageSubsystemForNodeType(nodeType);

  if (nodeType === 'town') {
    return {
      markerColor: '#fb923c',
      preview: 'Hazard preview: road grind and service-bay clipping strain engine.',
      shortLabel: 'engine strain',
      subsystem
    };
  }
  if (nodeType === 'ruin') {
    return {
      markerColor: '#f87171',
      preview: 'Hazard preview: excavation slabs and hard landings strain frame.',
      shortLabel: 'frame strain',
      subsystem
    };
  }
  if (nodeType === 'nature') {
    return {
      markerColor: '#4ade80',
      preview: 'Hazard preview: gust shear and uneven canopies strain suspension.',
      shortLabel: 'suspension strain',
      subsystem
    };
  }

  return {
    markerColor: '#a78bfa',
    preview: 'Hazard preview: sync fields and pulse shards strain shielding.',
    shortLabel: 'shielding strain',
    subsystem
  };
}

export function asNodeTypeKey(nodeType: string): NodeTypeKey {
  return (NODE_TYPE_KEYS as readonly string[]).includes(nodeType) ? (nodeType as NodeTypeKey) : 'town';
}

export function markNodeVisited(state: GameState, nodeId: string): void {
  if (!state.exploration.visitedNodeIds.includes(nodeId)) {
    state.exploration.visitedNodeIds.push(nodeId);
  }
}

export function noteBiomeArrival(state: GameState, nodeType: string): void {
  const key = asNodeTypeKey(nodeType);
  const knowledge = state.exploration.biomeKnowledge[key];
  knowledge.visits += 1;
  knowledge.benefitKnown = true;
  knowledge.objectiveKnown = true;
}

export function noteBiomeHazard(state: GameState, nodeType: string): void {
  const key = asNodeTypeKey(nodeType);
  state.exploration.biomeKnowledge[key].riskKnown = true;
}

export function revealBiomeIntel(state: GameState, nodeType: string): void {
  const key = asNodeTypeKey(nodeType);
  const knowledge = state.exploration.biomeKnowledge[key];
  knowledge.benefitKnown = true;
  knowledge.objectiveKnown = true;
  knowledge.riskKnown = true;
}

export function visibleBiomeKnowledge(state: GameState, nodeType: string): VisibleBiomeKnowledge {
  const key = asNodeTypeKey(nodeType);
  const learned = state.exploration.biomeKnowledge[key];
  const scannerLevel = state.vehicle.scanner;

  return {
    benefitKnown: learned.benefitKnown || scannerLevel >= 2,
    objectiveKnown: learned.objectiveKnown || scannerLevel >= 3,
    riskKnown: learned.riskKnown || scannerLevel >= 4
  };
}

export function visibleBiomeKnowledgeWithSignalIntel(
  state: GameState,
  nodeType: string,
  signalIntel: RouteSignalIntelKnowledge
): VisibleBiomeKnowledge {
  const learned = visibleBiomeKnowledge(state, nodeType);

  return {
    benefitKnown: learned.benefitKnown || signalIntel.revealsBenefit,
    objectiveKnown: learned.objectiveKnown || signalIntel.revealsObjective,
    riskKnown: learned.riskKnown || signalIntel.revealsRisk
  };
}
