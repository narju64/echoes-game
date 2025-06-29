import type { GameState } from '../../../types/gameTypes';

export interface GameResult {
  winner: string | null;
  finalState: GameState;
  log: string[];
  history: GameState[];
}

export abstract class AIAgent {
  id: string;
  name: string;
  playerId: string;

  constructor(id: string, name: string = 'AIAgent', playerId: string) {
    this.id = id;
    this.name = name;
    this.playerId = playerId;
  }

  abstract getAction(state: GameState, echoId?: string, validActions?: any[]): any;
  
  abstract reset(): void;
  
  abstract onGameEnd(result: GameResult, history: GameState[]): void;
  
  getStats(): any {
    return {
      id: this.id,
      name: this.name,
      playerId: this.playerId
    };
  }
} 