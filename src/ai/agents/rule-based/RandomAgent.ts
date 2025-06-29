import type { GameState } from '../../../types/gameTypes';
import { AIAgent, type GameResult } from '../base/AIAgent';
import { GameInterface } from '../base/GameInterface';

export class RandomAgent extends AIAgent {
  constructor(id: string, name: string = 'RandomAgent', playerId: string) {
    super(id, name, playerId);
  }

  getAction(state: GameState, echoId?: string, validActions?: any[]): any {
    if (echoId && validActions) {
      // Echo action
      if (!validActions || validActions.length === 0) return null;
      const idx = Math.floor(Math.random() * validActions.length);
      return validActions[idx];
    } else {
      // Game action
      const actions = GameInterface.getValidActions(state, this.playerId);
      if (!actions || actions.length === 0) return null;
      const idx = Math.floor(Math.random() * actions.length);
      return actions[idx];
    }
  }

  reset(): void {
    // No state to reset for random agent
  }

  onGameEnd(_result: GameResult, _history: GameState[]): void {
    // No special handling for random agent
  }
} 