import type { GameState, Echo, PlayerId, Position, EntityType } from '../types/gameTypes';

// Initial empty 8x8 board (all nulls for now)
const emptyBoard: (EntityType | null)[][] = Array.from({ length: 8 }, () => Array<EntityType | null>(8).fill(null));

export const initialGameState: GameState = {
  board: emptyBoard,
  echoes: [],
  phase: 'input',
  currentTick: 0,
  turnNumber: 1,
  scores: { player1: 0, player2: 0 },
  currentPlayer: 'player1',
  pendingEcho: null,
  submittedPlayers: [],
  turnHistory: [],
};

// Actions for the reducer
export type GameAction =
  | { type: 'RESET_GAME' }
  | { type: 'ADD_ECHO'; echo: Echo }
  | { type: 'FINALIZE_ECHO'; echo: Echo }
  | { type: 'SUBMIT_TURN'; player: PlayerId }
  | { type: 'NEXT_TURN' }
  | { type: 'REMOVE_ECHO'; echoId: string }
  | { type: 'RECORD_TURN_HISTORY'; entry: import('../types/gameTypes').TurnHistoryEntry };

function switchPlayer(player: PlayerId): PlayerId {
  return player === 'player1' ? 'player2' : 'player1';
}

// Reducer function
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'RESET_GAME':
      return { ...initialGameState };
    case 'ADD_ECHO':
      return {
        ...state,
        pendingEcho: action.echo,
      };
    case 'FINALIZE_ECHO': {
      // Check if this is an extension of an existing echo (same ID)
      const existingEchoIndex = state.echoes.findIndex(e => e.id === action.echo.id);
      let newEchoes: Echo[];
      
      if (existingEchoIndex !== -1) {
        // This is an extension - replace the existing echo
        newEchoes = [...state.echoes];
        newEchoes[existingEchoIndex] = action.echo;
      } else {
        // This is a new echo - add it to the array
        newEchoes = [...state.echoes, action.echo];
      }
      
      return {
        ...state,
        echoes: newEchoes,
        pendingEcho: null,
        submittedPlayers: [...state.submittedPlayers, action.echo.playerId],
        currentPlayer: switchPlayer(state.currentPlayer),
        // If both players have submitted, phase will be updated in SUBMIT_TURN
      };
    }
    case 'SUBMIT_TURN': {
      const submitted = state.submittedPlayers.includes(action.player)
        ? state.submittedPlayers
        : [...state.submittedPlayers, action.player];
      const bothSubmitted = submitted.includes('player1') && submitted.includes('player2');
      return {
        ...state,
        phase: bothSubmitted ? 'replay' : state.phase,
        submittedPlayers: submitted,
      };
    }
    case 'NEXT_TURN': {
      return {
        ...state,
        turnNumber: state.turnNumber + 1,
        phase: 'input',
        submittedPlayers: [],
        pendingEcho: null,
        echoes: state.echoes.filter(e => e.alive),
      };
    }
    case 'REMOVE_ECHO': {
      return {
        ...state,
        echoes: state.echoes.filter(e => e.id !== action.echoId),
      };
    }
    case 'RECORD_TURN_HISTORY': {
      return {
        ...state,
        turnHistory: [...state.turnHistory, action.entry],
      };
    }
    default:
      return state;
  }
} 