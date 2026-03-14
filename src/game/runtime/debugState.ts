import { notebookSignalRouteIntel } from '../../engine/sim/notebook';
import { anomalyFacingLabel, anomalyRequiredFacing, getObjectiveSummary, getBeaconRuleForNodeType } from '../../engine/sim/runObjectives';
import { buildSeedBuildShareCode } from '../../engine/sim/shareCode';
import { arrivalSiteBonusPreview } from '../../engine/sim/siteBonuses';
import { connectedNeighbors, currentNodeType, findNode } from '../../engine/sim/world';
import {
  getInstallOffer,
  getInstallOffers,
  FIELD_REPAIR_SCRAP_COST,
  missingVehicleConditionPoints,
  WORKSHOP_REPAIR_COST_PER_POINT
} from '../../engine/sim/vehicle';
import { visibleBiomeKnowledge, visibleBiomeKnowledgeWithSignalIntel } from '../../engine/sim/exploration';
import { hasBeaconAutoLink } from './beaconActivation';
import { hasCompletedCurrentNode } from './expeditionFlow';
import { describeGoalRouteHookEffect } from './goalSignal';
import type { RuntimeState } from './runtimeState';

type ObjectiveSupportKey = 'serviceStops' | 'impactPlates' | 'canopyLifts' | 'syncGates';

export interface DebugStateSnapshot {
  scene: RuntimeState['scene'];
  mode: RuntimeState['mode'];
  coordinates: string;
  sim: {
    seed: string;
    day: number;
    currentNodeId: string;
    currentNodeType: string | null;
    expeditionGoalNodeId: string;
    expeditionComplete: boolean;
    fuel: number;
    fuelCapacity: number;
    scrap: number;
    vehicle: RuntimeState['sim']['vehicle'];
    vehicleCondition: RuntimeState['sim']['vehicleCondition'];
    exploration: RuntimeState['sim']['exploration'];
    notebook: RuntimeState['sim']['notebook'];
    shareCode: string;
    legacyCarryOvers: RuntimeState['legacyCarryOvers'];
  };
  map: {
    rotation: number;
    travelUnlockedAtCurrentNode: boolean;
    freeTravelCharges: number;
    lastTravel:
      | {
          destinationNodeId: string;
          fuelCost: number;
          usedFreeTravel: boolean;
          freeTravelChargesBefore: number;
          freeTravelChargesAfter: number;
          fuelBefore: number;
          fuelAfterTravel: number;
          arrivalNodeType?: string;
        }
      | null;
    repairMode: 'field' | 'workshop';
    repairCostScrap: number;
    autoLinkUnlocked: boolean;
    dashEnergy: number;
    installOfferIndex: number;
    installOffer: ReturnType<typeof getInstallOffer>;
    installOffers: ReturnType<typeof getInstallOffers>;
    connectedRoutes: ReturnType<typeof connectedNeighbors>;
    selectedRoute:
      | {
          nodeId: string;
          nodeType: string | null;
          fuelCost: number;
          objectiveRule: ReturnType<typeof getBeaconRuleForNodeType> | null;
          objectiveSummary: string | null;
          isGoal: boolean;
          knowledge: ReturnType<typeof visibleBiomeKnowledge>;
          siteBonusPreview: ReturnType<typeof arrivalSiteBonusPreview> | null;
          signalHint: string | null;
          isBestLead: boolean;
          bestLeadArrivalRewardHint: string | null;
          afterglowPreview: string | null;
          legacyEchoPreview: string[];
        }
      | null;
    message: string;
  };
  run: {
    player: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      width: number;
      height: number;
      onGround: boolean;
      invulnSeconds: number;
    };
    world: {
      groundY: number;
      goalX: number;
      distanceToGoal: number;
    };
    camera: {
      x: number;
      width: number;
      visibleRangeX: [number, number];
    };
    collectiblesRemaining: number;
    beacons: Array<{
      id: string;
      x: number;
      y: number;
      activated: boolean;
    }>;
    serviceStops: Array<{
      id: string;
      x: number;
      width: number;
      progress: number;
      serviced: boolean;
    }>;
    syncGates: Array<{
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      stabilized: boolean;
    }>;
    canopyLifts: Array<{
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      progress: number;
      charted: boolean;
    }>;
    impactPlates: Array<{
      id: string;
      x: number;
      width: number;
      shattered: boolean;
    }>;
    objectiveRule: ReturnType<typeof getBeaconRuleForNodeType>;
    objectiveSummary: string;
    objectiveProgress: {
      primaryCompleted: number;
      primaryTotal: number;
      supportCompleted: number;
      supportTotal: number;
      supportKey: ObjectiveSupportKey;
    };
    dashBoost: number;
    dashEnergy: number;
    visibleHazards: Array<{ x: number; y: number; w: number; h: number }>;
  };
  stats: {
    health: number;
    maxHealth: number;
    score: number;
    elapsedSeconds: number;
  };
}

function objectiveSupportKeyForNodeType(nodeType: string): ObjectiveSupportKey {
  if (nodeType === 'ruin') return 'impactPlates';
  if (nodeType === 'nature') return 'canopyLifts';
  if (nodeType === 'anomaly') return 'syncGates';
  return 'serviceStops';
}

function countObjectiveSupportProgress(state: RuntimeState, nodeType: string): {
  supportKey: ObjectiveSupportKey;
  supportCompleted: number;
  supportTotal: number;
} {
  const supportKey = objectiveSupportKeyForNodeType(nodeType);

  if (supportKey === 'impactPlates') {
    return {
      supportKey,
      supportCompleted: state.impactPlates.filter((plate) => plate.shattered).length,
      supportTotal: state.impactPlates.length
    };
  }
  if (supportKey === 'canopyLifts') {
    return {
      supportKey,
      supportCompleted: state.canopyLifts.filter((lift) => lift.charted).length,
      supportTotal: state.canopyLifts.length
    };
  }
  if (supportKey === 'syncGates') {
    return {
      supportKey,
      supportCompleted: state.syncGates.filter((gate) => gate.stabilized).length,
      supportTotal: state.syncGates.length
    };
  }

  return {
    supportKey,
    supportCompleted: state.serviceStops.filter((stop) => stop.serviced).length,
    supportTotal: state.serviceStops.length
  };
}

export function buildDebugStateSnapshot(state: RuntimeState, viewportWidth: number, maxHealth: number): DebugStateSnapshot {
  const options = connectedNeighbors(state.sim);
  const selectedOption = options[state.mapSelectionIndex] ?? null;
  const selectedNode = selectedOption ? findNode(state.sim, selectedOption.nodeId) ?? null : null;
  const currentNode = findNode(state.sim, state.sim.currentNodeId) ?? null;
  const visibleMinX = state.cameraX;
  const visibleMaxX = state.cameraX + viewportWidth;
  const activeNodeType = currentNode?.type ?? 'town';
  const signalIntel = notebookSignalRouteIntel(state.sim, state.expeditionGoalNodeId, selectedOption?.nodeId ?? null);
  const routeKnowledge = selectedNode ? visibleBiomeKnowledgeWithSignalIntel(state.sim, selectedNode.type, signalIntel) : null;
  const objectiveProgress = countObjectiveSupportProgress(state, activeNodeType);
  const installOffers = getInstallOffers(state.sim, currentNodeType(state.sim));
  const installOfferIndex = Math.max(0, Math.min(state.mapInstallSelectionIndex ?? 0, Math.max(0, installOffers.length - 1)));
  const repairMode = activeNodeType === 'town' ? 'workshop' : 'field';
  const repairCostScrap =
    repairMode === 'workshop'
      ? missingVehicleConditionPoints(state.sim.vehicleCondition) * WORKSHOP_REPAIR_COST_PER_POINT
      : FIELD_REPAIR_SCRAP_COST;

  return {
    scene: state.scene,
    mode: state.mode,
    coordinates: 'origin at top-left, x rightward, y downward, all units are world pixels',
    sim: {
      seed: state.seed,
      day: state.sim.day,
      currentNodeId: state.sim.currentNodeId,
      currentNodeType: currentNode?.type ?? null,
      expeditionGoalNodeId: state.expeditionGoalNodeId,
      expeditionComplete: state.expeditionComplete,
      fuel: state.sim.fuel,
      fuelCapacity: state.sim.fuelCapacity,
      scrap: state.sim.scrap,
      vehicle: state.sim.vehicle,
      vehicleCondition: state.sim.vehicleCondition,
      exploration: state.sim.exploration,
      notebook: state.sim.notebook,
      shareCode: buildSeedBuildShareCode(state.sim),
      legacyCarryOvers: state.legacyCarryOvers.map((carryOver) => ({ ...carryOver }))
    },
    map: {
      rotation: Number(state.mapRotation.toFixed(2)),
      travelUnlockedAtCurrentNode: hasCompletedCurrentNode(state),
      freeTravelCharges: state.freeTravelCharges,
      lastTravel: state.lastTravel
        ? {
            destinationNodeId: state.lastTravel.destinationNodeId,
            fuelCost: state.lastTravel.fuelCost,
            usedFreeTravel: state.lastTravel.usedFreeTravel,
            freeTravelChargesBefore: state.lastTravel.freeTravelChargesBefore,
            freeTravelChargesAfter: state.lastTravel.freeTravelChargesAfter,
            fuelBefore: state.lastTravel.fuelBefore,
            fuelAfterTravel: state.lastTravel.fuelAfterTravel,
            arrivalNodeType: state.lastTravel.arrivalNodeType
          }
        : null,
      repairMode,
      repairCostScrap,
      autoLinkUnlocked: hasBeaconAutoLink(state),
      dashEnergy: Number(state.dashEnergy.toFixed(2)),
      installOfferIndex,
      installOffer: getInstallOffer(state.sim, currentNodeType(state.sim), installOfferIndex),
      installOffers,
      connectedRoutes: options,
      selectedRoute: selectedOption
        ? {
            nodeId: selectedOption.nodeId,
            nodeType: selectedNode?.type ?? null,
            fuelCost: selectedOption.distance,
            objectiveRule: selectedNode ? getBeaconRuleForNodeType(selectedNode.type) : null,
            objectiveSummary: selectedNode ? getObjectiveSummary(selectedNode.type) : null,
            isGoal: selectedOption.nodeId === state.expeditionGoalNodeId,
            knowledge: routeKnowledge ?? visibleBiomeKnowledge(state.sim, 'town'),
            siteBonusPreview: selectedNode ? arrivalSiteBonusPreview(state.sim, selectedNode.type) : null,
            signalHint: signalIntel.routeHint,
            isBestLead: signalIntel.isBestLead,
            bestLeadArrivalRewardHint: signalIntel.bestLeadArrivalRewardHint,
            afterglowPreview:
              state.expeditionComplete && (state.postGoalRouteHookCharges ?? 0) > 0 && state.postGoalRouteHookType
                ? describeGoalRouteHookEffect(state.postGoalRouteHookType)
                : null,
            legacyEchoPreview: state.legacyCarryOvers.map(
              (carryOver) => `${carryOver.sourceTitle}: ${describeGoalRouteHookEffect(carryOver.type)}`
            )
          }
        : null,
      message: state.mapMessage
    },
    run: {
      player: {
        x: Math.round(state.player.x),
        y: Math.round(state.player.y),
        vx: Math.round(state.player.vx),
        vy: Math.round(state.player.vy),
        width: state.player.w,
        height: state.player.h,
        onGround: state.player.onGround,
        invulnSeconds: Number(state.player.invuln.toFixed(2))
      },
      world: {
        groundY: state.groundY,
        goalX: state.goalX,
        distanceToGoal: Math.max(0, Math.round(state.goalX - (state.player.x + state.player.w)))
      },
      camera: {
        x: Math.round(state.cameraX),
        width: Math.round(viewportWidth),
        visibleRangeX: [Math.round(visibleMinX), Math.round(visibleMaxX)]
      },
      collectiblesRemaining: state.collectibles.filter((collectible) => !collectible.collected).length,
      beacons: state.beacons.map((beacon, index) => ({
        id: beacon.id,
        x: Math.round(beacon.x),
        y: Math.round(beacon.y),
        activated: beacon.activated,
        scanLocked: Boolean(beacon.scanLocked),
        scanProgress: Number((beacon.scanProgress ?? 0).toFixed(2)),
        requiredFacing: activeNodeType === 'anomaly' ? anomalyFacingLabel(anomalyRequiredFacing(index)) : null,
        facingAligned: activeNodeType === 'anomaly' ? state.player.facing === anomalyRequiredFacing(index) : null
      })),
      serviceStops: state.serviceStops.map((stop) => ({
        id: stop.id,
        x: Math.round(stop.x),
        width: stop.w,
        progress: Number(stop.progress.toFixed(2)),
        serviced: stop.serviced
      })),
      syncGates: state.syncGates.map((gate) => ({
        id: gate.id,
        x: Math.round(gate.x),
        y: Math.round(gate.y),
        width: gate.w,
        height: gate.h,
        stabilized: gate.stabilized
      })),
      canopyLifts: state.canopyLifts.map((lift) => ({
        id: lift.id,
        x: Math.round(lift.x),
        y: Math.round(lift.y),
        width: lift.w,
        height: lift.h,
        progress: Number(lift.progress.toFixed(2)),
        charted: lift.charted
      })),
      impactPlates: state.impactPlates.map((plate) => ({
        id: plate.id,
        x: Math.round(plate.x),
        width: plate.w,
        shattered: plate.shattered
      })),
      objectiveRule: getBeaconRuleForNodeType(activeNodeType),
      objectiveSummary: getObjectiveSummary(activeNodeType),
      objectiveProgress: {
        primaryCompleted: state.beacons.filter((beacon) => beacon.activated).length,
        primaryTotal: state.beacons.length,
        ...objectiveProgress
      },
      dashBoost: Number(state.dashBoost.toFixed(2)),
      dashEnergy: Number(state.dashEnergy.toFixed(2)),
      visibleHazards: state.hazards
        .filter((hazard) => hazard.x + hazard.w >= visibleMinX && hazard.x <= visibleMaxX)
        .map((hazard) => ({ x: Math.round(hazard.x), y: Math.round(hazard.y), w: hazard.w, h: hazard.h }))
    },
    stats: {
      health: state.health,
      maxHealth,
      score: state.score,
      elapsedSeconds: Number(state.elapsedSeconds.toFixed(2))
    }
  };
}
