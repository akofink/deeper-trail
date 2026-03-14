import { describe, expect, it } from 'vitest';
import {
  FIELD_REPAIR_SCRAP_COST,
  MAX_SUBSYSTEM_CONDITION,
  MAX_SUBSYSTEM_LEVEL,
  damageSubsystemForNodeType,
  getFuelCapacity,
  getInstallOffer,
  getInstallOffers,
  hasAnyUpgradeableSubsystem,
  hasAutoLinkScanner,
  repairMostDamagedSubsystem
} from '../src/engine/sim/vehicle';
import { installUpgradeForNodeType } from '../src/engine/sim/vehicle';
import { createInitialGameState } from '../src/game/state/gameState';

describe('vehicle repair loop', () => {
  it('damages the biome-specific subsystem', () => {
    const state = createInitialGameState('vehicle-damage');

    const damagedSubsystem = damageSubsystemForNodeType(state, 'anomaly');

    expect(damagedSubsystem).toBe('shielding');
    expect(state.vehicleCondition.shielding).toBe(MAX_SUBSYSTEM_CONDITION - 1);
    expect(state.vehicleCondition.engine).toBe(MAX_SUBSYSTEM_CONDITION);
  });

  it('repairs the most damaged subsystem by spending scrap', () => {
    const state = createInitialGameState('vehicle-repair');
    state.scrap = FIELD_REPAIR_SCRAP_COST + 1;
    state.vehicleCondition.engine = 1;
    state.vehicleCondition.frame = 2;

    const result = repairMostDamagedSubsystem(state);

    expect(result.didRepair).toBe(true);
    expect(result.repairedSubsystem).toBe('engine');
    expect(result.newCondition).toBe(2);
    expect(state.scrap).toBe(1);
  });

  it('rejects repair when all subsystems are already at full condition', () => {
    const state = createInitialGameState('vehicle-pristine');
    state.scrap = FIELD_REPAIR_SCRAP_COST;

    const result = repairMostDamagedSubsystem(state);

    expect(result.didRepair).toBe(false);
    expect(result.reason).toContain('full field condition');
    expect(state.scrap).toBe(FIELD_REPAIR_SCRAP_COST);
  });

  it('lists deterministic site module offers ordered by current level then biome priority', () => {
    const state = createInitialGameState('vehicle-install-offer');
    state.vehicle.shielding = 2;

    const offers = getInstallOffers(state, 'anomaly');
    const offer = getInstallOffer(state, 'anomaly');

    expect(offers).toHaveLength(2);
    expect(offers.map((entry) => entry.subsystem)).toEqual(['scanner', 'shielding']);
    expect(offer).toEqual({
      priorityIndex: 1,
      subsystem: 'scanner',
      currentLevel: 1,
      nextLevel: 2,
      scrapCost: 2
    });
  });

  it('installs the selected site module, spends scrap, and updates derived vehicle stats', () => {
    const state = createInitialGameState('vehicle-install');
    state.scrap = 5;

    const result = installUpgradeForNodeType(state, 'town', 1);

    expect(result.didInstall).toBe(true);
    expect(result.subsystem).toBe('storage');
    expect(result.nextLevel).toBe(2);
    expect(state.scrap).toBe(3);
    expect(state.vehicle.storage).toBe(2);
    expect(state.fuelCapacity).toBe(getFuelCapacity(state.vehicle));
    expect(state.fuel).toBe(state.fuelCapacity);
  });

  it('unlocks auto-link once scanner reaches level 3', () => {
    const state = createInitialGameState('vehicle-autolink');

    expect(hasAutoLinkScanner(state.vehicle)).toBe(false);
    state.vehicle.scanner = 3;
    expect(hasAutoLinkScanner(state.vehicle)).toBe(true);
  });

  it('rejects installation when the site modules are already maxed', () => {
    const state = createInitialGameState('vehicle-install-max');
    state.vehicle.engine = MAX_SUBSYSTEM_LEVEL;
    state.vehicle.storage = MAX_SUBSYSTEM_LEVEL;
    state.scrap = 20;

    const result = installUpgradeForNodeType(state, 'town');

    expect(result.didInstall).toBe(false);
    expect(result.reason).toContain('different biome site');
    expect(state.scrap).toBe(20);
  });

  it('reports when the entire vehicle is globally maxed', () => {
    const state = createInitialGameState('vehicle-globally-maxed');
    for (const subsystem of ['frame', 'engine', 'scanner', 'suspension', 'storage', 'shielding'] as const) {
      state.vehicle[subsystem] = MAX_SUBSYSTEM_LEVEL;
    }

    expect(hasAnyUpgradeableSubsystem(state)).toBe(false);
    const result = installUpgradeForNodeType(state, 'town');
    expect(result.didInstall).toBe(false);
    expect(result.reason).toContain('All vehicle subsystems');
  });
});
