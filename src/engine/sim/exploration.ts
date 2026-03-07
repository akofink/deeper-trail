import { type GameState, type NodeTypeKey, NODE_TYPE_KEYS } from '../../game/state/gameState';
import { getDamageSubsystemForNodeType } from './vehicle';

export interface VisibleBiomeKnowledge {
  benefitKnown: boolean;
  objectiveKnown: boolean;
  riskKnown: boolean;
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
}

export function noteBiomeHazard(state: GameState, nodeType: string): void {
  const key = asNodeTypeKey(nodeType);
  state.exploration.biomeKnowledge[key].riskKnown = true;
}

export function visibleBiomeKnowledge(state: GameState, nodeType: string): VisibleBiomeKnowledge {
  const key = asNodeTypeKey(nodeType);
  const learned = state.exploration.biomeKnowledge[key];
  const scannerLevel = state.vehicle.scanner;

  return {
    benefitKnown: learned.benefitKnown || scannerLevel >= 2,
    objectiveKnown: learned.visits > 0 || scannerLevel >= 3,
    riskKnown: learned.riskKnown || scannerLevel >= 4
  };
}
