import { createSeededRng } from '../rng/seededRng';
import type { CoreNotebookClueKey, GameState, NodeTypeKey, NotebookEntry } from '../../game/state/gameState';
import { connectedNeighbors, shortestLegCountBetweenNodes } from './world';

const NOTEBOOK_CLUE_ORDER: CoreNotebookClueKey[] = ['ruin', 'nature', 'anomaly'];

const CLUE_TEMPLATES: Record<
  CoreNotebookClueKey,
  {
    titles: string[];
    bodies: string[];
  }
> = {
  ruin: {
    titles: ['Relay Masonry', 'Broken Alignment', 'Surveyed Ruin'],
    bodies: [
      'The old relay stones were not memorials. Their faces are shaved toward the same distant bearing, as if they once calibrated a larger signal frame.',
      'Ruin pylons carry matching wear on one edge only. Whatever crossed them moved in formation, pointed toward a receiver beyond the settled routes.',
      'The collapsed ruin arches still preserve a clean directional bias. They look less like walls and more like aiming fixtures for a long-range pulse.'
    ]
  },
  nature: {
    titles: ['Field Drift', 'Shelter Bloom', 'Wind Pattern'],
    bodies: [
      'Plants near the relay trail are bent by a repeating pulse, not weather. The distortion strengthens away from town roads and toward stranger ground.',
      'The grove was calm until the beacon synced. Then the pollen stream leaned the same direction as the ruin marks, as if the land is still answering a broadcast.',
      'Natural cover here forms a channel instead of a barrier. The terrain seems trained to funnel motion toward the deeper signal line.'
    ]
  },
  anomaly: {
    titles: ['Pulse Phase', 'Signal Echo', 'Coherence Spike'],
    bodies: [
      'Anomaly bursts are not random. Their phase snaps into place when the relays are boosted in sequence, implying one source is driving every shard.',
      'The unstable field briefly resolved into a clean carrier tone. It matches the relay timing from earlier sites and points to a single upstream emitter.',
      'Boost-linked relays forced the anomaly haze into a readable pattern. The noise is coordinated, which means the expedition goal is a transmitter, not just a landmark.'
    ]
  }
};

export interface NotebookUnlockResult {
  newEntries: NotebookEntry[];
}

export interface NotebookSignalRouteIntel {
  clueCount: number;
  fieldNote: string;
  routeHint: string | null;
}

function makeEntry(seed: string, clueKey: CoreNotebookClueKey, nodeId: string, day: number): NotebookEntry {
  const templates = CLUE_TEMPLATES[clueKey];
  const rng = createSeededRng(`${seed}:notebook:${clueKey}`);
  const title = templates.titles[rng.nextInt(templates.titles.length)] ?? clueKey;
  const body = templates.bodies[rng.nextInt(templates.bodies.length)] ?? '';

  return {
    id: `clue-${clueKey}`,
    clueKey,
    sourceNodeType: clueKey,
    sourceNodeId: nodeId,
    dayDiscovered: day,
    title,
    body
  };
}

function makeSynthesisEntry(seed: string, day: number): NotebookEntry {
  const variants = [
    {
      title: 'Route Hypothesis',
      body: 'The relay ruins, the drifted groves, and the anomaly pulses all describe one machine-scale path. The source ahead is likely coordinating the whole corridor.'
    },
    {
      title: 'Signal Theory',
      body: 'Each clue family agrees on the same conclusion: the distant source is shaping terrain, ruins, and unstable fields into one guided route.'
    },
    {
      title: 'Notebook Synthesis',
      body: 'The expedition no longer reads like scattered salvage sites. It reads like one old network still pointing travelers toward a single active signal heart.'
    }
  ];
  const rng = createSeededRng(`${seed}:notebook:synthesis`);
  const variant = variants[rng.nextInt(variants.length)] ?? variants[0];

  return {
    id: 'clue-synthesis',
    clueKey: 'synthesis',
    sourceNodeType: 'meta',
    sourceNodeId: null,
    dayDiscovered: day,
    title: variant.title,
    body: variant.body
  };
}

export function notebookClueProgress(state: GameState): { discovered: number; total: number } {
  return {
    discovered: NOTEBOOK_CLUE_ORDER.filter((key) => state.notebook.discoveredClues[key]).length,
    total: NOTEBOOK_CLUE_ORDER.length
  };
}

export function latestNotebookEntry(state: GameState): NotebookEntry | null {
  return state.notebook.entries[state.notebook.entries.length - 1] ?? null;
}

export function notebookSignalRouteIntel(
  state: GameState,
  expeditionGoalNodeId: string,
  selectedNodeId: string | null
): NotebookSignalRouteIntel {
  const progress = notebookClueProgress(state);

  let fieldNote = `SIGNAL ${progress.discovered}/${progress.total}`;
  if (progress.discovered === 0) {
    return {
      clueCount: 0,
      fieldNote: `${fieldNote}  bearing offline`,
      routeHint: null
    };
  }

  fieldNote += progress.discovered >= 2 ? '  depth online' : '  depth offline';
  fieldNote += state.notebook.synthesisUnlocked ? '  synth lock' : '';

  if (!selectedNodeId) {
    return {
      clueCount: progress.discovered,
      fieldNote,
      routeHint: null
    };
  }

  const currentLegs = shortestLegCountBetweenNodes(state, state.currentNodeId, expeditionGoalNodeId);
  const selectedLegs = shortestLegCountBetweenNodes(state, selectedNodeId, expeditionGoalNodeId);
  if (currentLegs === null || selectedLegs === null) {
    return {
      clueCount: progress.discovered,
      fieldNote,
      routeHint: null
    };
  }

  let relation = 'Signal bearing holds.';
  if (selectedLegs < currentLegs) {
    relation = 'Signal bearing strengthens.';
  } else if (selectedLegs > currentLegs) {
    relation = 'Signal bearing weakens.';
  }

  let routeHint = relation;
  if (progress.discovered >= 2) {
    routeHint += ` Source est. ${selectedLegs} leg${selectedLegs === 1 ? '' : 's'}.`;
  }

  if (state.notebook.synthesisUnlocked) {
    const bestNeighborLegs = connectedNeighbors(state)
      .map((neighbor) => shortestLegCountBetweenNodes(state, neighbor.nodeId, expeditionGoalNodeId))
      .filter((legs): legs is number => legs !== null);

    const bestNeighborLegCount = bestNeighborLegs.length > 0 ? Math.min(...bestNeighborLegs) : null;
    if (bestNeighborLegCount !== null && selectedLegs === bestNeighborLegCount) {
      routeHint += ' Best current lead.';
    }
  }

  return {
    clueCount: progress.discovered,
    fieldNote,
    routeHint
  };
}

export function recordNotebookClue(
  state: GameState,
  source: {
    nodeType: NodeTypeKey;
    nodeId: string;
  }
): NotebookUnlockResult {
  const newEntries: NotebookEntry[] = [];
  const clueKey = NOTEBOOK_CLUE_ORDER.find((key) => key === source.nodeType);

  if (clueKey && !state.notebook.discoveredClues[clueKey]) {
    const entry = makeEntry(state.seed, clueKey, source.nodeId, state.day);
    state.notebook.discoveredClues[clueKey] = true;
    state.notebook.entries.push(entry);
    newEntries.push(entry);
  }

  const allCoreCluesFound = NOTEBOOK_CLUE_ORDER.every((key) => state.notebook.discoveredClues[key]);
  if (allCoreCluesFound && !state.notebook.synthesisUnlocked) {
    const synthesis = makeSynthesisEntry(state.seed, state.day);
    state.notebook.synthesisUnlocked = true;
    state.notebook.entries.push(synthesis);
    newEntries.push(synthesis);
  }

  return { newEntries };
}
