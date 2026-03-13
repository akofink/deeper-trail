import { notebookCoreClueSequence } from '../../engine/sim/notebook';
import { getMaxHealth } from '../../engine/sim/vehicle';
import { CANOPY_LIFT_HOLD_SECONDS } from './canopyLifts';
import type { RuntimeState } from './runtimeState';
import { SERVICE_STOP_HOLD_SECONDS } from './serviceStops';

const RELAY_INDEX_BY_CLUE = {
  ruin: 0,
  nature: 1,
  anomaly: 2
} as const;

export interface GoalSignalProfile {
  primerBeaconId: string;
  primerBeaconIndex: number;
  endingTitle: string;
  endingSummary: string;
  endingDiscoveryNote: string;
  endingCompletionNote: string;
  endingEpilogueNote: string;
  arrivalBonusNote: string;
  runBonusNote: string;
  encounterBonusNote: string;
  arrivalBonusType: 'scrap' | 'health' | 'fuel';
  runBonusType: 'clear-hazard' | 'start-shield' | 'lower-beacon';
  encounterBonusType:
    | 'lower-relays'
    | 'clear-front-hazards'
    | 'extra-salvage'
    | 'soften-movers'
    | 'shorter-run'
    | 'clear-tail-hazard';
  postGoalRouteHookType: 'relay-credit' | 'breach-fuel' | 'salvage-echo' | 'quiet-heal' | 'folded-hop' | 'vented-shield';
  postGoalRouteHookNote: string;
}

export function hasGoalSignalPrimer(state: RuntimeState): boolean {
  return state.sim.notebook.synthesisUnlocked && state.sim.currentNodeId === state.expeditionGoalNodeId;
}

function decodedGoalSignalProfile(state: RuntimeState): GoalSignalProfile | null {
  if (!state.sim.notebook.synthesisUnlocked) {
    return null;
  }

  const clueSequence = notebookCoreClueSequence(state.sim);
  const [leadClue, middleClue, finalClue] = clueSequence;
  if (!leadClue || !middleClue || !finalClue) {
    return null;
  }

  const primerBeaconIndex = RELAY_INDEX_BY_CLUE[leadClue];
  const primerBeaconId = `B${primerBeaconIndex}`;
  const encounterBonus =
    leadClue === 'ruin' && middleClue === 'nature'
      ? {
          endingTitle: 'Grounded Relay Vault',
          endingDiscoveryNote:
            'At the source, a grounded relay vault opens around a hand-built spindle that answers your road-language notes.',
          endingEpilogueNote: 'Its grounded lattice answers the bike-scale relay language instead of abandoning it.',
          encounterBonusType: 'lower-relays' as const,
          encounterBonusNote: 'ruin/grove braid: the source shelves its relay line into grounded reach',
          postGoalRouteHookType: 'relay-credit' as const,
          postGoalRouteHookNote: 'Afterglow hook: each post-goal route grants +1 free travel credit.'
        }
      : leadClue === 'ruin' && middleClue === 'anomaly'
        ? {
            endingTitle: 'Breached Entry Core',
            endingDiscoveryNote:
              'Inside the breach, the source exposes a cracked transit core stitched together with quarry braces and phase seams.',
            endingCompletionNote: 'The source met you through a split breach instead of a sealed barricade.',
            endingEpilogueNote: 'Inside the breach, the route reads like a quarry plan rewritten in phase seams.',
            encounterBonusType: 'clear-front-hazards' as const,
            encounterBonusNote: 'ruin/phase braid: the source breaches its entry barricades',
            postGoalRouteHookType: 'breach-fuel' as const,
            postGoalRouteHookNote: 'Afterglow hook: each post-goal route restores +4 fuel.'
          }
        : leadClue === 'nature' && middleClue === 'ruin'
          ? {
              endingTitle: 'Echo Salvage Orchard',
              endingDiscoveryNote:
                'At the source, recovered route fragments hang like tagged fruit around a live salvage trunk still carrying the signal.',
              endingCompletionNote: 'The source paid back the route in salvage echoes all the way to its heart.',
              endingEpilogueNote: 'Each recovered fragment repeats the outward trail, turning salvage into a readable memory map.',
              encounterBonusType: 'extra-salvage' as const,
              encounterBonusNote: 'grove/quarry braid: salvage echoes line the source path',
              postGoalRouteHookType: 'salvage-echo' as const,
              postGoalRouteHookNote: 'Afterglow hook: each post-goal route yields +2 salvage.'
            }
          : leadClue === 'nature' && middleClue === 'anomaly'
            ? {
                endingTitle: 'Quiet Phase Garden',
                endingDiscoveryNote:
                  'At the center, the source resolves into a tended crossing where the moving fields grow in measured rows instead of storming loose.',
                endingCompletionNote: 'The moving fields hushed long enough for a clean, steady crossing.',
                endingEpilogueNote: 'The silence holds just long enough to show the source as a tended crossing instead of a storm.',
                encounterBonusType: 'soften-movers' as const,
                encounterBonusNote: 'grove/phase braid: the source quiets its moving fields',
                postGoalRouteHookType: 'quiet-heal' as const,
                postGoalRouteHookNote: 'Afterglow hook: each post-goal route restores +1 hull.'
              }
            : leadClue === 'anomaly' && middleClue === 'ruin'
              ? {
                  endingTitle: 'Folded Quarry Threshold',
                  endingDiscoveryNote:
                    'Past the fold, the source is packed into impossible short distance: quarry ramps, relay teeth, and sudden adjacency.',
                  endingCompletionNote: 'The last stretch folded inward and let the source arrive early.',
                  endingEpilogueNote: 'Past the fold, the source confirms distance itself was the last lock on the trail.',
                  encounterBonusType: 'shorter-run' as const,
                  encounterBonusNote: 'phase/quarry braid: the source folds the last approach closer',
                  postGoalRouteHookType: 'folded-hop' as const,
                  postGoalRouteHookNote: 'Afterglow hook: each post-goal route refunds +1 free travel credit.'
                }
              : {
                  endingTitle: 'Vented Bloom Channel',
                  endingDiscoveryNote:
                    'At the source, an opened vent channels the route into a bloom-lined conduit that stays clear just long enough to read.',
                  endingCompletionNote: 'The final channel stayed open and vented clear right to the source.',
                  endingEpilogueNote: 'The opened vent carries the grove pattern forward into whatever deeper route comes next.',
                  encounterBonusType: 'clear-tail-hazard' as const,
                  encounterBonusNote: 'phase/grove braid: the source vents a clean final channel',
                  postGoalRouteHookType: 'vented-shield' as const,
                  postGoalRouteHookNote: 'Afterglow hook: each post-goal route re-primes one shield charge.'
                };
  const arrivalBonus =
    middleClue === 'ruin'
      ? {
          arrivalBonusType: 'scrap' as const,
          arrivalBonusNote: 'source cache: +2 scrap on arrival'
        }
      : middleClue === 'nature'
        ? {
            arrivalBonusType: 'health' as const,
            arrivalBonusNote: 'shelter bloom: +1 health on arrival'
          }
        : {
            arrivalBonusType: 'fuel' as const,
            arrivalBonusNote: 'phase reserve: +4 fuel on arrival'
          };
  const runBonus =
    finalClue === 'ruin'
      ? {
          runBonusType: 'clear-hazard' as const,
          runBonusNote: 'ruin line: first barrier collapsed and one site objective starts resolved'
        }
      : finalClue === 'nature'
        ? {
            runBonusType: 'lower-beacon' as const,
            runBonusNote: 'grove line: first relay drops into easier reach and one site objective starts charted'
          }
        : {
            runBonusType: 'start-shield' as const,
            runBonusNote: 'anomaly line: shield charge starts primed and one site objective starts stabilized'
          };

  return {
    primerBeaconId,
    primerBeaconIndex,
    endingTitle: encounterBonus.endingTitle,
    endingSummary: `${encounterBonus.endingTitle}: ${arrivalBonus.arrivalBonusNote}; ${encounterBonus.encounterBonusNote}; ${runBonus.runBonusNote}; ${encounterBonus.endingDiscoveryNote}; ${encounterBonus.endingEpilogueNote}.`,
    endingDiscoveryNote: encounterBonus.endingDiscoveryNote,
    endingCompletionNote:
      encounterBonus.endingCompletionNote ??
      'The source shelves its relay line low and opens a grounded vault at the end of the route.',
    endingEpilogueNote: encounterBonus.endingEpilogueNote,
    arrivalBonusNote: arrivalBonus.arrivalBonusNote,
    runBonusNote: runBonus.runBonusNote,
    encounterBonusNote: encounterBonus.encounterBonusNote,
    arrivalBonusType: arrivalBonus.arrivalBonusType,
    runBonusType: runBonus.runBonusType,
    encounterBonusType: encounterBonus.encounterBonusType,
    postGoalRouteHookType: encounterBonus.postGoalRouteHookType,
    postGoalRouteHookNote: encounterBonus.postGoalRouteHookNote
  };
}

export function goalSignalProfile(state: RuntimeState): GoalSignalProfile | null {
  if (!hasGoalSignalPrimer(state)) {
    return null;
  }

  return decodedGoalSignalProfile(state);
}

export function applyGoalSignalPrimer(state: RuntimeState): boolean {
  const profile = goalSignalProfile(state);
  if (!profile) {
    return false;
  }

  const relay = state.beacons[profile.primerBeaconIndex];
  if (!relay || relay.activated) {
    return false;
  }

  relay.activated = true;
  return true;
}

export function applyGoalSignalRunBonus(state: RuntimeState): boolean {
  const profile = goalSignalProfile(state);
  if (!profile) {
    return false;
  }

  let secondaryObjectiveResolved = false;
  const firstServiceStop = state.serviceStops.find((stop) => !stop.serviced);
  if (firstServiceStop) {
    firstServiceStop.serviced = true;
    firstServiceStop.progress = SERVICE_STOP_HOLD_SECONDS;
    secondaryObjectiveResolved = true;
  } else {
    const firstSyncGate = state.syncGates.find((gate) => !gate.stabilized);
    if (firstSyncGate) {
      firstSyncGate.stabilized = true;
      secondaryObjectiveResolved = true;
    } else {
      const firstCanopyLift = state.canopyLifts.find((lift) => !lift.charted);
      if (firstCanopyLift) {
        firstCanopyLift.charted = true;
        firstCanopyLift.progress = CANOPY_LIFT_HOLD_SECONDS;
        secondaryObjectiveResolved = true;
      } else {
        const firstImpactPlate = state.impactPlates.find((plate) => !plate.shattered);
        if (firstImpactPlate) {
          firstImpactPlate.shattered = true;
          secondaryObjectiveResolved = true;
        }
      }
    }
  }

  if (profile.runBonusType === 'clear-hazard') {
    if (!collapseHazard(state.hazards[0])) {
      return secondaryObjectiveResolved;
    }
    return true;
  }

  if (profile.runBonusType === 'lower-beacon') {
    const firstRelay = state.beacons.find((beacon, index) => !beacon.activated && index !== profile.primerBeaconIndex) ?? state.beacons[0];
    if (!firstRelay) {
      return secondaryObjectiveResolved;
    }
    firstRelay.y += 20;
    return true;
  }

  if (profile.runBonusType === 'start-shield') {
    state.shieldChargeAvailable = true;
    return true;
  }

  return secondaryObjectiveResolved;
}

function collapseHazard(hazard: RuntimeState['hazards'][number] | undefined): boolean {
  if (!hazard) {
    return false;
  }

  hazard.w = 0;
  hazard.h = 0;
  hazard.baseW = 0;
  hazard.baseH = 0;
  hazard.amplitudeX = 0;
  hazard.amplitudeY = 0;
  hazard.pulse = 0;
  hazard.speed = 0;
  return true;
}

export function applyGoalSignalEncounterBonus(state: RuntimeState): boolean {
  const profile = goalSignalProfile(state);
  if (!profile) {
    return false;
  }

  if (profile.encounterBonusType === 'lower-relays') {
    let lowered = false;
    for (const [index, beacon] of state.beacons.entries()) {
      if (index === profile.primerBeaconIndex) {
        continue;
      }

      beacon.y += 18;
      lowered = true;
    }
    return lowered;
  }

  if (profile.encounterBonusType === 'clear-front-hazards') {
    const first = collapseHazard(state.hazards[0]);
    const second = collapseHazard(state.hazards[1]);
    return first || second;
  }

  if (profile.encounterBonusType === 'extra-salvage') {
    const spawnTargets = state.beacons.filter((_, index) => index !== profile.primerBeaconIndex).slice(0, 2);
    for (const beacon of spawnTargets) {
      state.collectibles.push({
        x: beacon.x,
        y: beacon.y - 18,
        r: 11,
        collected: false
      });
    }
    return spawnTargets.length > 0;
  }

  if (profile.encounterBonusType === 'soften-movers') {
    let softened = false;
    for (const hazard of state.hazards) {
      if (hazard.kind === 'static') {
        continue;
      }

      hazard.amplitudeX *= 0.6;
      hazard.amplitudeY *= 0.6;
      hazard.pulse *= 0.6;
      hazard.speed *= 0.6;
      softened = true;
    }
    return softened;
  }

  if (profile.encounterBonusType === 'shorter-run') {
    state.goalX = Math.max(2100, state.goalX - 180);
    return true;
  }

  const tailHazard = state.hazards.at(-1);
  const collapsed = collapseHazard(tailHazard);
  const trailingRelay = [...state.beacons]
    .map((beacon, index) => ({ beacon, index }))
    .reverse()
    .find(({ index }) => index !== profile.primerBeaconIndex)?.beacon;
  if (trailingRelay) {
    trailingRelay.y += 12;
  }
  return collapsed || Boolean(trailingRelay);
}

export function goalSignalPrimerNote(selectedNodeId: string | null, state: RuntimeState): string | null {
  if (!selectedNodeId || selectedNodeId !== state.expeditionGoalNodeId) {
    return null;
  }

  const profile = decodedGoalSignalProfile(state);
  if (!profile) {
    return null;
  }

  return `Synthesis route: ${profile.primerBeaconId} pre-linked; ${profile.arrivalBonusNote}; ${profile.encounterBonusNote}; ${profile.runBonusNote}.`;
}

export function goalSignalEndingSummary(state: RuntimeState): string | null {
  return goalSignalProfile(state)?.endingSummary ?? null;
}

export function applyGoalSignalPostGoalRouteHook(state: RuntimeState): string | null {
  if (!state.expeditionComplete) {
    return null;
  }

  const charges = state.postGoalRouteHookCharges ?? 0;
  if (charges <= 0) {
    return null;
  }

  const profile = decodedGoalSignalProfile(state);
  const hookType = state.postGoalRouteHookType ?? profile?.postGoalRouteHookType ?? null;
  if (!hookType) {
    state.postGoalRouteHookCharges = 0;
    return null;
  }

  state.postGoalRouteHookCharges = charges - 1;
  if (!state.postGoalRouteHookNote && profile?.postGoalRouteHookNote) {
    state.postGoalRouteHookNote = profile.postGoalRouteHookNote;
  }

  switch (hookType) {
    case 'relay-credit':
      state.freeTravelCharges += 1;
      return `Afterglow: relay lattice grants +1 free travel credit (${state.postGoalRouteHookCharges} hooks left).`;
    case 'breach-fuel':
      state.sim.fuel = Math.min(state.sim.fuelCapacity, state.sim.fuel + 4);
      return `Afterglow: breach reservoir restores +4 fuel (${state.postGoalRouteHookCharges} hooks left).`;
    case 'salvage-echo':
      state.sim.scrap += 2;
      return `Afterglow: salvage echo recovered +2 scrap (${state.postGoalRouteHookCharges} hooks left).`;
    case 'quiet-heal':
      state.health = Math.min(getMaxHealth(state.sim.vehicle), state.health + 1);
      return `Afterglow: quiet crossing restores +1 hull (${state.postGoalRouteHookCharges} hooks left).`;
    case 'folded-hop':
      state.freeTravelCharges += 1;
      return `Afterglow: folded route refunds +1 free travel credit (${state.postGoalRouteHookCharges} hooks left).`;
    case 'vented-shield':
      state.shieldChargeAvailable = true;
      return `Afterglow: vented channel re-primes shield charge (${state.postGoalRouteHookCharges} hooks left).`;
    default:
      return null;
  }
}
