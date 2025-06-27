import type { GameState } from '../../../types/gameTypes';
import type { Agent } from '../../../simulation/HeadlessGameRunner';
import { GameInterface } from '../base/GameInterface';

export class RandomAgent implements Agent {
  id: string;
  name: string;

  constructor(id: string, name: string = 'RandomAgent') {
    this.id = id;
    this.name = name;
  }

  getAction(state: GameState, playerId: string): any {
    const actions = GameInterface.getValidActions(state, playerId);
    if (!actions || actions.length === 0) return null;
    const idx = Math.floor(Math.random() * actions.length);
    return actions[idx];
  }

  getEchoAction(_state: GameState, _echo: any, validEchoActions: any[]): any {
    if (!validEchoActions || validEchoActions.length === 0) return null;
    const idx = Math.floor(Math.random() * validEchoActions.length);
    return validEchoActions[idx];
  }
} 