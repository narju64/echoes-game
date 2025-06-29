import { gameReducer, initialGameState } from '../game/gameState';
import type { GameState } from '../types/gameTypes';
import { GameInterface } from '../ai/agents/base/GameInterface';
import { AIAgent, type GameResult } from '../ai/agents/base/AIAgent';

export class HeadlessGameRunner {
  runGame(agent1: AIAgent, agent2: AIAgent): GameResult {
    let state: GameState = initialGameState;
    const log: string[] = [];
    const history: GameState[] = [JSON.parse(JSON.stringify(state))];
    let turn = 0;
    let winner: string | null = null;
    const agents: { [id: string]: AIAgent } = {
      player1: agent1,
      player2: agent2,
    };
    let previousPlayer = state.currentPlayer;
    let previousPhase = state.phase;

    // Reset agents for new game
    agent1.reset();
    agent2.reset();

    // Main game loop
    while (!winner && turn < 200) { // Prevent infinite games
      log.push(`\n=== Turn ${turn + 1} | Phase: ${state.phase} | Current Player: ${state.currentPlayer} ===`);
      const agent = agents[state.currentPlayer];
      const validActions = GameInterface.getValidActions(state, state.currentPlayer);
      if (validActions.length === 0) {
        log.push(`No valid actions available.`);
        break;
      }
      // Add Echo Phase
      if (validActions.every(a => a.type === 'ADD_ECHO')) {
        const colToLetter = (col: number) => String.fromCharCode('A'.charCodeAt(0) + col);
        const positions = validActions.map(a => `${colToLetter(a.echo.position.col)}${a.echo.position.row + 1}`);
        log.push(`  Add Echo Phase: ${positions.length} valid actions: ${positions.join(', ')}`);
        const action = agent.getAction(state, undefined, validActions);
        if (!action) {
          log.push(`  No action returned, skipping turn.`);
          break;
        }
        log.push(`  Selected: ADD_ECHO at ${colToLetter(action.echo.position.col)}${action.echo.position.row + 1}`);
        state = gameReducer(state, action);
        history.push(JSON.parse(JSON.stringify(state)));
      }
      // Assign Action Points Phase (pendingEcho)
      else if (state.pendingEcho && state.pendingEcho.playerId === state.currentPlayer) {
        let echo = { ...state.pendingEcho };
        let ap = echo.actionPoints;
        let instrList = [...echo.instructionList];
        while (instrList.length < ap) {
          const validEchoActions = GameInterface.getValidEchoActions(state, { ...echo, instructionList: instrList });
          if (validEchoActions.length === 0) {
            log.push(`  No valid echo-actions available.`);
            break;
          }
          log.push(`  Assign Action Point ${instrList.length + 1}: valid actions: ${validEchoActions.map(a => {
            const dir = a.direction;
            if (dir.x === -1 && dir.y === 0) return '↓'; // North
            if (dir.x === 1 && dir.y === 0) return '↑';  // South
            if (dir.x === 0 && dir.y === 1) return '→';  // East
            if (dir.x === 0 && dir.y === -1) return '←'; // West
            if (dir.x === -1 && dir.y === 1) return '↘'; // NE
            if (dir.x === -1 && dir.y === -1) return '↙'; // NW
            if (dir.x === 1 && dir.y === 1) return '↗'; // SE
            if (dir.x === 1 && dir.y === -1) return '↖'; // SW
            return '?';
          }).join(' ')} `);
          const echoAction = agent.getAction(state, echo.id, validEchoActions);
          if (!echoAction) {
            log.push(`  No echo-action returned, skipping AP assignment.`);
            break;
          }
          instrList.push(echoAction);
          const newRow = echo.position.row + echoAction.direction.x;
          const newCol = echo.position.col + echoAction.direction.y;
          const colToLetter = (col: number) => String.fromCharCode('A'.charCodeAt(0) + col);
          log.push(`  Assigned ${(() => {
            const dir = echoAction.direction;
            if (dir.x === -1 && dir.y === 0) return '↓'; // North
            if (dir.x === 1 && dir.y === 0) return '↑';  // South
            if (dir.x === 0 && dir.y === 1) return '→';  // East
            if (dir.x === 0 && dir.y === -1) return '←'; // West
            if (dir.x === -1 && dir.y === 1) return '↘'; // NE
            if (dir.x === -1 && dir.y === -1) return '↙'; // NW
            if (dir.x === 1 && dir.y === 1) return '↗'; // SE
            if (dir.x === 1 && dir.y === -1) return '↖'; // SW
            return '?';
          })()} on Tick ${instrList.length}, New Position: ${colToLetter(newCol)}${newRow + 1}`);
          echo = { ...echo, position: { row: newRow, col: newCol } };
        }
        log.push(`  Assigned sequence: [${instrList.map(a => {
          const dir = a.direction;
          if (dir.x === -1 && dir.y === 0) return '↓'; // North
          if (dir.x === 1 && dir.y === 0) return '↑';  // South
          if (dir.x === 0 && dir.y === 1) return '→';  // East
          if (dir.x === 0 && dir.y === -1) return '←'; // West
          if (dir.x === -1 && dir.y === 1) return '↘'; // NE
          if (dir.x === -1 && dir.y === -1) return '↙'; // NW
          if (dir.x === 1 && dir.y === 1) return '↗'; // SE
          if (dir.x === 1 && dir.y === -1) return '↖'; // SW
          return '?';
        }).join(' ')}]`);
        // Finalize echo
        const finalizeAction = { type: 'FINALIZE_ECHO' as const, echo: { ...state.pendingEcho, instructionList: instrList, position: echo.position } };
        log.push(`  Finalized echo with sequence.`);
        state = gameReducer(state, finalizeAction);
        history.push(JSON.parse(JSON.stringify(state)));
      }
      // Other phases (replay, etc.)
      else {
        const action = agent.getAction(state, undefined, validActions);
        if (!action) {
          log.push(`  No action returned, skipping turn.`);
          break;
        }
        log.push(`  Selected: ${action.type}`);
        state = gameReducer(state, action);
        history.push(JSON.parse(JSON.stringify(state)));
      }
      if (state.winner) {
        winner = state.winner;
        log.push(`Game over! Winner: ${winner}`);
        break;
      }
      if (state.phase === 'input' && (state.currentPlayer !== previousPlayer || state.phase !== previousPhase)) {
        turn++;
      }
      previousPlayer = state.currentPlayer;
      previousPhase = state.phase;
    }
    if (!winner) {
      log.push('Game ended in a draw or max turns reached.');
    }

    const result: GameResult = {
      winner: winner as any,
      finalState: state,
      log,
      history,
    };

    // Notify agents of game end
    agent1.onGameEnd(result, history);
    agent2.onGameEnd(result, history);

    return result;
  }
}

// Minimal test: Run a game between two RandomAgents
import { RandomAgent } from '../ai/agents/rule-based/RandomAgent';

if (typeof window === 'undefined') { // Only run in Node/test, not in browser
  const agent1 = new RandomAgent('p1', 'RandomAgent1', 'player1');
  const agent2 = new RandomAgent('p2', 'RandomAgent2', 'player2');
  const runner = new HeadlessGameRunner();
  const result = runner.runGame(agent1, agent2);
  console.log('Game result:', result.winner);
  console.log('Agent 1 stats:', agent1.getStats());
  console.log('Agent 2 stats:', agent2.getStats());
  console.log('Log:');
  for (const line of result.log) {
    console.log(line);
  }
} 