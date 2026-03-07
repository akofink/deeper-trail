import { generateWorldGraph } from '../../engine/gen/worldGraph';

export const VEHICLE_SUBSYSTEM_KEYS = ['frame', 'engine', 'scanner', 'suspension', 'storage', 'shielding'] as const;
export const NODE_TYPE_KEYS = ['town', 'ruin', 'nature', 'anomaly'] as const;
export type VehicleSubsystemKey = (typeof VEHICLE_SUBSYSTEM_KEYS)[number];
export type NodeTypeKey = (typeof NODE_TYPE_KEYS)[number];
export type CoreNotebookClueKey = 'ruin' | 'nature' | 'anomaly';
export type NotebookClueKey = 'ruin' | 'nature' | 'anomaly' | 'synthesis';

export interface VehicleSubsystems {
  frame: number;
  engine: number;
  scanner: number;
  suspension: number;
  storage: number;
  shielding: number;
}

export type VehicleCondition = Record<VehicleSubsystemKey, number>;

export interface BiomeKnowledge {
  visits: number;
  benefitKnown: boolean;
  objectiveKnown: boolean;
  riskKnown: boolean;
}

export interface ExplorationState {
  visitedNodeIds: string[];
  biomeKnowledge: Record<NodeTypeKey, BiomeKnowledge>;
}

export interface NotebookEntry {
  id: string;
  clueKey: NotebookClueKey;
  sourceNodeType: NodeTypeKey | 'meta';
  sourceNodeId: string | null;
  dayDiscovered: number;
  title: string;
  body: string;
}

export interface NotebookState {
  entries: NotebookEntry[];
  discoveredClues: Record<CoreNotebookClueKey, boolean>;
  synthesisUnlocked: boolean;
}

export interface GameState {
  seed: string;
  day: number;
  currentNodeId: string;
  fuel: number;
  fuelCapacity: number;
  scrap: number;
  vehicle: VehicleSubsystems;
  vehicleCondition: VehicleCondition;
  exploration: ExplorationState;
  notebook: NotebookState;
  world: ReturnType<typeof generateWorldGraph>;
}

export function createInitialGameState(seed: string): GameState {
  const world = generateWorldGraph(seed);
  const startNode = world.nodes[0];

  if (!startNode) {
    throw new Error('Generated world has no nodes');
  }

  return {
    seed,
    day: 0,
    currentNodeId: startNode.id,
    fuel: 40,
    fuelCapacity: 40,
    scrap: 0,
    vehicle: {
      frame: 1,
      engine: 1,
      scanner: 1,
      suspension: 1,
      storage: 1,
      shielding: 1
    },
    vehicleCondition: {
      frame: 3,
      engine: 3,
      scanner: 3,
      suspension: 3,
      storage: 3,
      shielding: 3
    },
    exploration: {
      visitedNodeIds: [startNode.id],
      biomeKnowledge: {
        town: { visits: 0, benefitKnown: false, objectiveKnown: false, riskKnown: false },
        ruin: { visits: 0, benefitKnown: false, objectiveKnown: false, riskKnown: false },
        nature: { visits: 0, benefitKnown: false, objectiveKnown: false, riskKnown: false },
        anomaly: { visits: 0, benefitKnown: false, objectiveKnown: false, riskKnown: false }
      }
    },
    notebook: {
      entries: [],
      discoveredClues: {
        ruin: false,
        nature: false,
        anomaly: false
      },
      synthesisUnlocked: false
    },
    world
  };
}
