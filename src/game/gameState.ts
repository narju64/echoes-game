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

// Helper functions for win condition checking
function checkWinConditions(echoes: Echo[], scores: Record<PlayerId, number>): PlayerId | null {
  // Restore original win conditions
  const SCORE_TO_WIN = 10;
  const COLUMNS_TO_WIN = 8;

  const player1Echoes = echoes.filter(e => e.playerId === 'player1' && e.alive);
  const player2Echoes = echoes.filter(e => e.playerId === 'player2' && e.alive);

  const player1Columns = new Set(player1Echoes.map(e => e.position.col));
  const player2Columns = new Set(player2Echoes.map(e => e.position.col));

  // Echoes in columns win condition
  const p1HasEchoWin = player1Columns.size >= COLUMNS_TO_WIN;
  const p2HasEchoWin = player2Columns.size >= COLUMNS_TO_WIN;
  if (p1HasEchoWin && !p2HasEchoWin) return 'player1';
  if (p2HasEchoWin && !p1HasEchoWin) return 'player2';
  // If both have enough, do not end the game

  // Opponent destruction win condition
  if (player1Echoes.length === 0 && player2Echoes.length > 0) {
    return 'player2';
  }
  if (player2Echoes.length === 0 && player1Echoes.length > 0) {
    return 'player1';
  }
  // If both have zero, do not end the game

  // Points win condition
  const p1HasScoreWin = scores.player1 >= SCORE_TO_WIN;
  const p2HasScoreWin = scores.player2 >= SCORE_TO_WIN;
  if (p1HasScoreWin && !p2HasScoreWin) return 'player1';
  if (p2HasScoreWin && !p1HasScoreWin) return 'player2';
  // If both have enough points, do not end the game

  return null;
}

// Actions for the reducer
export type GameAction =
  | { type: 'RESET_GAME' }
  | { type: 'ADD_ECHO'; echo: Echo }
  | { type: 'SELECT_ECHO_FOR_EXTENSION'; echo: Echo }
  | { type: 'FINALIZE_ECHO'; echo: Echo }
  | { type: 'SWITCH_PLAYER' }
  | { type: 'SUBMIT_TURN'; player: PlayerId }
  | { type: 'NEXT_TURN' }
  | { type: 'REMOVE_ECHO'; echoId: string }
  | { type: 'RECORD_TURN_HISTORY'; entry: import('../types/gameTypes').TurnHistoryEntry }
  | { type: 'UPDATE_SCORES'; destroyedEchoes: { echoId: string; by: PlayerId | null; position: Position }[] }
  | { type: 'CHECK_WIN_CONDITIONS' };

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
        echoes: [...state.echoes, action.echo],
        pendingEcho: action.echo,
      };
    case 'SELECT_ECHO_FOR_EXTENSION': {
      // Set the echo as pending for extension without adding it to the echoes array
      return {
        ...state,
        pendingEcho: action.echo,
      };
    }
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
        // Don't switch currentPlayer in multiplayer mode - it's handled by assigned gamePlayerId
        // currentPlayer: switchPlayer(state.currentPlayer),
        // If both players have submitted, phase will be updated in SUBMIT_TURN
      };
    }
    case 'SWITCH_PLAYER': {
      return {
        ...state,
        currentPlayer: switchPlayer(state.currentPlayer),
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
    case 'UPDATE_SCORES': {
      const destroyedEchoes = action.destroyedEchoes;
      const newScores = { ...state.scores };
      
      destroyedEchoes.forEach(({ echoId: _echoId, by }) => {
        if (by) {
          newScores[by] += 1;
        }
      });
      
      return {
        ...state,
        scores: newScores,
      };
    }
    case 'CHECK_WIN_CONDITIONS': {
      const winner = checkWinConditions(state.echoes, state.scores);
      return {
        ...state,
        winner: winner || undefined,
        phase: winner ? 'gameOver' : state.phase,
      };
    }
    default:
      return state;
  }
} 