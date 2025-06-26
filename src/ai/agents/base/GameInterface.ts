import type { GameState, Position, PlayerId, Echo, Direction } from '../../../types/gameTypes';
import type { Action } from '../../../types/gameTypes';

function getHomeRow(playerId: PlayerId): number {
  return playerId === 'player1' ? 0 : 7;
}

function isHomeTileEmpty(state: GameState, row: number, col: number): boolean {
  return !state.echoes.some(e => e.position.row === row && e.position.col === col && e.alive);
}

export class GameInterface {
  static getValidActions(state: GameState, playerId: string): any[] {
    const actions: any[] = [];
    // Only allow actions for the current player
    if (state.currentPlayer !== playerId) return actions;
    if (state.phase !== 'input') return actions;

    // 1. Placing a new echo (pendingEcho is null)
    if (state.pendingEcho === null) {
      const homeRow = getHomeRow(playerId as PlayerId);
      for (let col = 0; col < 8; col++) {
        if (isHomeTileEmpty(state, homeRow, col)) {
          actions.push({
            type: 'ADD_ECHO',
            echo: {
              id: Math.random().toString(36).substr(2, 9),
              playerId,
              position: { row: homeRow, col },
              instructionList: [],
              isShielded: false,
              actionPoints: 5,
              alive: true,
            },
          });
        }
      }
    }
    // 2. Assigning actions to a pending echo (pendingEcho is not null)
    else if (state.pendingEcho && state.pendingEcho.playerId === playerId) {
      // Generate a full random instructionList using all available action points
      const directions: Direction[] = [
        { x: 0, y: 1 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 },
      ];
      const ap = state.pendingEcho.actionPoints || 5;
      const instructionList = [];
      for (let i = 0; i < ap; i++) {
        const dir = directions[Math.floor(Math.random() * directions.length)];
        instructionList.push({ type: 'walk' as const, direction: dir, tick: i + 1, cost: 1 });
      }
      const echo: Echo = {
        ...state.pendingEcho,
        instructionList,
      };
      actions.push({ type: 'FINALIZE_ECHO', echo });
    }
    // Log the valid actions for debugging
    if (typeof window === 'undefined') {
      console.log(`[GameInterface] Valid actions for ${playerId}:`, actions);
    }
    return actions;
  }

  static getValidEchoActions(state: GameState, echo: Echo): Action[] {
    // Only allow walk actions for now
    const directions: Direction[] = [
      { x: 0, y: 1 },   // right (E)
      { x: 1, y: 0 },   // down (S)
      { x: 0, y: -1 },  // left (W)
      { x: -1, y: 0 },  // up (N)
      { x: 1, y: 1 },   // down-right (SE)
      { x: -1, y: 1 },  // up-right (NE)
      { x: 1, y: -1 },  // down-left (SW)
      { x: -1, y: -1 }, // up-left (NW)
    ];
    const valid: Action[] = [];
    for (const dir of directions) {
      const newRow = echo.position.row + dir.x;
      const newCol = echo.position.col + dir.y;
      if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
        valid.push({
          type: 'walk',
          direction: dir,
          tick: echo.instructionList.length + 1,
          cost: 1,
        });
      }
    }
    return valid;
  }
} 