import type { Battle } from '../Battle';
import { updateMana } from '../systems/mana';
import { updateUnits } from '../systems/units';
import { updateSpells } from '../systems/spells';
import { updateTowers } from '../systems/towers';
import { updateVictory } from '../systems/victory';

export interface SimulationModule {
  readonly id: string;
  readonly update: (battle: Battle) => void;
}
/** Fixed execution order is part of replay compatibility, not an editable balance value. */
export const SIMULATION_MODULES: readonly SimulationModule[] = Object.freeze(
  [
    { id: 'mana', update: updateMana },
    {
      id: 'ai',
      update: (battle: Battle) => {
        if (battle.aiEnabled && battle.time >= battle.aiAt) {
          battle.ai(1);
          battle.aiAt =
            battle.time +
            battle.gameplay.ai[`${battle.difficulty}Interval`] +
            battle.random() * battle.gameplay.ai.jitter;
        }
      },
    },
    { id: 'units', update: updateUnits },
    {
      id: 'spells',
      update: (battle: Battle) => {
        if (battle.tactical) updateSpells(battle);
      },
    },
    { id: 'towers', update: updateTowers },
    {
      id: 'cleanup',
      update: (battle: Battle) => {
        battle.units = battle.units.filter((u) => u.hp > 0);
      },
    },
    { id: 'victory', update: updateVictory },
  ].map((m) => Object.freeze(m)),
);
export function updateSimulation(battle: Battle) {
  for (const module of SIMULATION_MODULES) module.update(battle);
}
