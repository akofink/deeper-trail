import { connectedNeighbors } from '../../engine/sim/world';
import { attemptBeaconActivation } from './beaconActivation';
import { buildLegacyCarryOver } from './goalSignal';
import {
  advanceMapSelection,
  mapSceneStatusText,
  tryFieldRepairOnMap,
  tryInstallUpgradeOnMap,
  tryTravelSelectedNode
} from './mapSceneFlow';
import {
  createInitialRuntimeState,
  groundYForCanvasHeight,
  resetRunFromCurrentNode,
  shiftRunSceneVertical,
  type RuntimeState
} from './runtimeState';

export interface ShellKeyDownOptions {
  canvasHeight: number;
  createSeed: () => string;
  previousMapNavigate: boolean;
}

export interface ShellKeyDownResult {
  nextState: RuntimeState;
  preventDefault: boolean;
  previousMapNavigate: boolean;
  toggleFullscreen: boolean;
}

export interface ShellKeyUpResult {
  previousMapNavigate: boolean;
}

export function handleShellKeyDown(state: RuntimeState, code: string, options: ShellKeyDownOptions): ShellKeyDownResult {
  if (code === 'KeyF') {
    return {
      nextState: state,
      preventDefault: true,
      previousMapNavigate: options.previousMapNavigate,
      toggleFullscreen: true
    };
  }

  if (code === 'KeyP' && state.scene === 'run') {
    if (state.mode === 'playing') {
      state.mode = 'paused';
    } else if (state.mode === 'paused') {
      state.mode = 'playing';
    }

    return {
      nextState: state,
      preventDefault: true,
      previousMapNavigate: options.previousMapNavigate,
      toggleFullscreen: false
    };
  }

  if (code === 'KeyA') {
    state.scene = state.scene === 'run' ? 'map' : 'run';
    state.mapMessage = mapSceneStatusText(state);
    state.mapMessageTimer = 3;
    return {
      nextState: state,
      preventDefault: true,
      previousMapNavigate: options.previousMapNavigate,
      toggleFullscreen: false
    };
  }

  if (code === 'KeyN' && state.scene === 'map') {
    return {
      nextState: createInitialRuntimeState(options.canvasHeight, options.createSeed(), buildLegacyCarryOver(state) ?? undefined),
      preventDefault: true,
      previousMapNavigate: false,
      toggleFullscreen: false
    };
  }

  if ((code === 'Enter' || code === 'KeyR') && (state.mode === 'won' || state.mode === 'lost')) {
    const nextState =
      state.mode === 'lost'
        ? createInitialRuntimeState(options.canvasHeight, options.createSeed())
        : state;

    if (state.mode === 'won') {
      resetRunFromCurrentNode(nextState);
      nextState.mode = 'playing';
    }

    return {
      nextState,
      preventDefault: true,
      previousMapNavigate: false,
      toggleFullscreen: false
    };
  }

  if (code === 'Enter' && state.scene === 'run' && state.mode === 'playing') {
    attemptBeaconActivation(state);
    return {
      nextState: state,
      preventDefault: true,
      previousMapNavigate: options.previousMapNavigate,
      toggleFullscreen: false
    };
  }

  if (state.scene === 'map') {
    if (code === 'Enter') {
      tryTravelSelectedNode(state);
      return {
        nextState: state,
        preventDefault: true,
        previousMapNavigate: options.previousMapNavigate,
        toggleFullscreen: false
      };
    }

    if (code === 'KeyB') {
      tryFieldRepairOnMap(state);
      return {
        nextState: state,
        preventDefault: true,
        previousMapNavigate: options.previousMapNavigate,
        toggleFullscreen: false
      };
    }

    if (code === 'KeyC') {
      tryInstallUpgradeOnMap(state);
      return {
        nextState: state,
        preventDefault: true,
        previousMapNavigate: options.previousMapNavigate,
        toggleFullscreen: false
      };
    }

    if (code === 'ArrowUp' || code === 'ArrowDown') {
      if (!options.previousMapNavigate) {
        state.mapSelectionIndex = advanceMapSelection(
          state.mapSelectionIndex,
          connectedNeighbors(state.sim).length,
          code === 'ArrowUp' ? -1 : 1
        );
      }

      return {
        nextState: state,
        preventDefault: true,
        previousMapNavigate: true,
        toggleFullscreen: false
      };
    }
  }

  return {
    nextState: state,
    preventDefault: false,
    previousMapNavigate: options.previousMapNavigate,
    toggleFullscreen: false
  };
}

export function handleShellKeyUp(code: string, previousMapNavigate: boolean): ShellKeyUpResult {
  if (code === 'ArrowUp' || code === 'ArrowDown') {
    return { previousMapNavigate: false };
  }

  return { previousMapNavigate };
}

export function resizeRuntimeState(state: RuntimeState, canvasHeight: number): void {
  const nextGroundY = groundYForCanvasHeight(canvasHeight);
  const deltaY = nextGroundY - state.groundY;
  state.groundY = nextGroundY;

  if (state.scene === 'run') {
    shiftRunSceneVertical(state, deltaY);
    if (state.player.y + state.player.h > state.groundY) {
      state.player.y = state.groundY - state.player.h;
    }
    if (state.player.y + state.player.h >= state.groundY) {
      state.player.vy = 0;
      state.player.onGround = true;
    }
    return;
  }

  if (state.player.y + state.player.h > state.groundY) {
    state.player.y = state.groundY - state.player.h;
    state.player.vy = 0;
    state.player.onGround = true;
  }
}
