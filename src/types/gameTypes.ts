// Core types for the Echoes tactical game

// Represents a position on the 8x8 board
export interface Position {
  row: number; // 0-7 (top to bottom)
  col: number; // 0-7 (left to right)
}

// Represents a direction (for movement, firing, etc.)
export interface Direction {
  x: -1 | 0 | 1;
  y: -1 | 0 | 1;
}

// Player identifiers
export type PlayerId = 'player1' | 'player2';

// All possible entity types on the board
export type EntityType = 'echo' | 'projectile' | 'mine';

// All possible action types
export type ActionType = 'walk' | 'shield' | 'dash' | 'fire' | 'mine';

// An action assigned to an echo
export interface Action {
  type: ActionType;
  direction: Direction;
  tick: number; // The tick this action is executed
  cost: number; // Action point cost
}

// An Echo entity
export interface Echo {
  id: string;
  playerId: PlayerId;
  position: Position;
  instructionList: Action[];
  isShielded: boolean;
  shieldDirection?: Direction;
  actionPoints: number;
  alive: boolean;
}

// The overall game state
export interface GameState {
  board: (EntityType | null)[][]; // 8x8 grid, null for empty
  echoes: Echo[];
  phase: 'input' | 'replay';
  currentTick: number;
  turnNumber: number;
  scores: Record<PlayerId, number>;
  winner?: PlayerId;
  currentPlayer: PlayerId;
  pendingEcho: Echo | null;
  submittedPlayers: PlayerId[];
} 