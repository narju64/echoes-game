import React, { useReducer, useEffect, useState, useRef } from 'react';
import { initialGameState, gameReducer } from '../game/gameState';
import type { Echo, PlayerId, Direction } from '../types/gameTypes';
import Board from '../components/Board';
import EchoActionAssignment from '../components/EchoActionAssignment';
import EchoSelection from '../components/EchoSelection';

const getHomeRow = (playerId: PlayerId) => (playerId === 'player1' ? 0 : 7);

// Add selection mode type
type SelectionMode = 'choosing' | 'new-echo' | 'extend-echo';

interface SimProjectile {
  id: string;
  position: { row: number; col: number };
  direction: Direction;
  type: 'projectile' | 'mine';
  alive: boolean;
}

// Deep copy utility
function deepCopyEcho(e: Echo): Echo {
  return {
    ...e,
    position: { ...e.position },
    instructionList: e.instructionList.map(a => ({ ...a, direction: { ...a.direction } })),
  };
}

// Helper to get the owner of a projectile or mine
function getProjectileOwner(echoes: Echo[], proj: { position: { row: number; col: number }; direction: Direction; type: string }) {
  // Find the echo that fired or placed this projectile/mine
  // For projectiles: look for an echo whose action list includes a fire at this position/direction
  // For mines: look for an echo whose action list includes a mine at this position/direction
  for (const e of echoes) {
    for (const a of e.instructionList) {
      if (
        a.type === proj.type &&
        e.alive &&
        e.position &&
        e.position.row + a.direction.y === proj.position.row &&
        e.position.col + a.direction.x === proj.position.col &&
        a.direction.x === proj.direction.x &&
        a.direction.y === proj.direction.y
      ) {
        return e.playerId;
      }
    }
  }
  return undefined;
}

// Simulate the replay phase, returning an array of { echoes, projectiles, mines, tick, destroyed: { echoId, by: PlayerId|null }[], collisions: { row, col }[] } for each tick
function simulateReplay(echoes: (Echo & { startingPosition: { row: number; col: number } })[]): { echoes: Echo[]; projectiles: SimProjectile[]; tick: number; destroyed: { echoId: string; by: PlayerId|null }[]; collisions: { row: number; col: number }[] }[] {
  const maxTicks = Math.max(...echoes.map(e => e.instructionList.length), 0);
  const states: { echoes: Echo[]; projectiles: SimProjectile[]; tick: number; destroyed: { echoId: string; by: PlayerId|null }[]; collisions: { row: number; col: number }[] }[] = [];
  let currentEchoes = echoes.map(e => ({
    ...deepCopyEcho(e),
    position: { ...e.startingPosition },
    alive: true,
  }));
  let projectiles: SimProjectile[] = [];
  let mines: SimProjectile[] = [];
  let nextProjectileId = 1;

  // Tick 0: initial placement
  states.push({
    echoes: currentEchoes.map(deepCopyEcho),
    projectiles: [],
    tick: 0,
    destroyed: [],
    collisions: [],
  });

  // Helper: which approach directions does a shield block?
  const SHIELD_BLOCKS: Record<string, { x: number; y: number }[]> = {
    '0,1':   [ {x:-1, y:1}, {x:0, y:1}, {x:1, y:1} ],    // N
    '1,0':   [ {x:1, y:-1}, {x:1, y:0}, {x:1, y:1} ],    // E
    '0,-1':  [ {x:-1, y:-1}, {x:0, y:-1}, {x:1, y:-1} ], // S
    '-1,0':  [ {x:-1, y:-1}, {x:-1, y:0}, {x:-1, y:1} ], // W
    '1,1':   [ {x:1, y:1}, {x:0, y:1}, {x:1, y:0} ],     // NE
    '1,-1':  [ {x:1, y:-1}, {x:0, y:-1}, {x:1, y:0} ],   // SE
    '-1,-1': [ {x:-1, y:-1}, {x:0, y:-1}, {x:-1, y:0} ], // SW
    '-1,1':  [ {x:-1, y:1}, {x:0, y:1}, {x:-1, y:0} ],   // NW
  };

  for (let tick = 1; tick <= maxTicks; tick++) {
    let destroyedThisTick: { echoId: string; by: PlayerId|null }[] = [];
    let collisionsThisTick: { row: number; col: number }[] = [];
    
    // 1. Move projectiles
    projectiles = projectiles
      .filter(p => p.alive)
      .map(p => ({ ...p, position: { row: p.position.row + p.direction.y, col: p.position.col + p.direction.x } }));
    // 2. Move echoes and spawn new projectiles/mines
    currentEchoes = currentEchoes.map((e, idx) => {
      const action = echoes[idx].instructionList[tick - 1];
      // If no action for this tick:
      if (!action) {
        const lastAction = echoes[idx].instructionList[echoes[idx].instructionList.length - 1];
        if (lastAction && lastAction.type === 'shield') {
          return { ...e, isShielded: true, shieldDirection: { ...lastAction.direction } };
        } else {
          return { ...deepCopyEcho(e), isShielded: false, shieldDirection: undefined };
        }
      }
      if (!e.alive) return deepCopyEcho(e);
      if (action.type === 'walk') {
        return { ...e, position: { row: e.position.row + action.direction.y, col: e.position.col + action.direction.x }, isShielded: false, shieldDirection: undefined };
      } else if (action.type === 'dash') {
        return { ...e, position: { row: e.position.row + action.direction.y * 2, col: e.position.col + action.direction.x * 2 }, isShielded: false, shieldDirection: undefined };
      } else if (action.type === 'fire') {
        projectiles.push({
          id: `p${nextProjectileId++}`,
          position: { row: e.position.row + action.direction.y, col: e.position.col + action.direction.x },
          direction: { ...action.direction },
          type: 'projectile',
          alive: true,
        });
        return { ...deepCopyEcho(e), isShielded: false, shieldDirection: undefined };
      } else if (action.type === 'mine') {
        mines.push({
          id: `m${nextProjectileId++}`,
          position: { row: e.position.row + action.direction.y, col: e.position.col + action.direction.x },
          direction: { ...action.direction },
          type: 'mine',
          alive: true,
        });
        return { ...deepCopyEcho(e), isShielded: false, shieldDirection: undefined };
      } else if (action.type === 'shield') {
        return { ...e, isShielded: true, shieldDirection: { ...action.direction } };
      } else {
        return { ...deepCopyEcho(e), isShielded: false, shieldDirection: undefined };
      }
    });
    // 3. Add mines to projectiles for collision detection
    const allProjectiles = [...projectiles, ...mines];
    // 4. Collision detection (robust, with shield logic):
    const entityMap = new Map<string, { type: string; id: string }[]>();
    currentEchoes.forEach(e => {
      if (!e.alive) return;
      const key = `${e.position.row},${e.position.col}`;
      if (!entityMap.has(key)) entityMap.set(key, []);
      entityMap.get(key)!.push({ type: 'echo', id: e.id });
    });
    allProjectiles.forEach(p => {
      if (!p.alive) return;
      const key = `${p.position.row},${p.position.col}`;
      if (!entityMap.has(key)) entityMap.set(key, []);
      entityMap.get(key)!.push({ type: p.type, id: p.id });
    });
    // For each tile with more than one entity, handle shield/projectile logic
    entityMap.forEach((entities, key) => {
      if (entities.length > 1) {
        // Record collision location
        const [row, col] = key.split(',').map(Number);
        collisionsThisTick.push({ row, col });
        
        const echoEnt = entities.find(ent => ent.type === 'echo');
        const projectileEnts = entities.filter(ent => ent.type === 'projectile' || ent.type === 'mine');
        if (echoEnt && projectileEnts.length > 0) {
          const echo = currentEchoes.find(e => e.id === echoEnt.id);
          if (echo && echo.isShielded && echo.shieldDirection) {
            projectileEnts.forEach(projEnt => {
              const proj = projectiles.find(p => p.id === projEnt.id) || mines.find(m => m.id === projEnt.id);
              if (!proj) return;
              if (proj.type === 'projectile') {
                const approachDir = { x: -proj.direction.x, y: -proj.direction.y };
                let blocked = false;
                if (echo.shieldDirection) {
                  const key = `${echo.shieldDirection.x},${echo.shieldDirection.y}`;
                  const allowed = SHIELD_BLOCKS[key] || [];
                  blocked = allowed.some(d => d.x === approachDir.x && d.y === approachDir.y);
                }
                if (blocked) {
                  proj.alive = false;
                } else {
                  proj.alive = false;
                  echo.alive = false;
                  // Award point to projectile owner
                  const owner = getProjectileOwner(echoes, proj);
                  destroyedThisTick.push({ echoId: echo.id, by: owner && owner !== echo.playerId ? owner : null });
                }
              } else if (proj.type === 'mine') {
                proj.alive = false;
                echo.alive = false;
                // Award point to mine owner
                const owner = getProjectileOwner(echoes, proj);
                destroyedThisTick.push({ echoId: echo.id, by: owner && owner !== echo.playerId ? owner : null });
              }
            });
          } else {
            projectileEnts.forEach(projEnt => {
              const proj = projectiles.find(p => p.id === projEnt.id) || mines.find(m => m.id === projEnt.id);
              if (proj) {
                proj.alive = false;
                if (echo) echo.alive = false;
                // Award point to projectile/mine owner
                const owner = getProjectileOwner(echoes, proj);
                if (echo) destroyedThisTick.push({ echoId: echo.id, by: owner && owner !== echo.playerId ? owner : null });
              }
            });
          }
        } else {
          entities.forEach(ent => {
            if (ent.type === 'echo') {
              const echo = currentEchoes.find(e => e.id === ent.id);
              if (echo) {
                echo.alive = false;
                destroyedThisTick.push({ echoId: echo.id, by: null });
              }
            } else {
              const proj = projectiles.find(p => p.id === ent.id);
              if (proj) proj.alive = false;
              const mine = mines.find(m => m.id === ent.id);
              if (mine) mine.alive = false;
            }
          });
        }
      }
    });
    states.push({
      echoes: currentEchoes.map(deepCopyEcho),
      projectiles: [...projectiles.filter(p => p.alive), ...mines.filter(m => m.alive)].map(p => ({ ...p })),
      tick,
      destroyed: destroyedThisTick,
      collisions: collisionsThisTick,
    });
    projectiles = projectiles.filter(p => p.alive);
    mines = mines.filter(m => m.alive);
    currentEchoes = currentEchoes.map((e, idx) => {
      const nextAction = echoes[idx].instructionList[tick];
      const lastAction = echoes[idx].instructionList[echoes[idx].instructionList.length - 1];
      if (nextAction && nextAction.type === 'shield') return e;
      if (!nextAction && lastAction && lastAction.type === 'shield') return e;
      return { ...e, isShielded: false, shieldDirection: undefined };
    });
  }
  return states;
}

const GamePage: React.FC = () => {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('choosing');
  const currentPlayer: PlayerId = state.currentPlayer;
  const homeRow = getHomeRow(currentPlayer);

  // Find unoccupied home row tiles
  const highlightedTiles = Array.from({ length: 8 })
    .map((_, col) => ({ row: homeRow, col }))
    .filter(tile => !state.echoes.some(e => e.position.row === tile.row && e.position.col === tile.col && e.alive));

  // Find existing player echoes for extend mode
  const playerEchoes = state.echoes.filter(e => e.playerId === currentPlayer && e.alive);
  const existingEchoTiles = playerEchoes.map(e => ({ row: e.position.row, col: e.position.col }));

  // Handle new echo selection
  const handleNewEcho = () => {
    setSelectionMode('new-echo');
  };

  // Handle extend echo selection
  const handleExtendEcho = () => {
    setSelectionMode('extend-echo');
  };

  // Handle tile click for new echo
  const handleNewEchoTileClick = (row: number, col: number) => {
    if (!highlightedTiles.some(t => t.row === row && t.col === col)) return;
    const newEcho: Echo & { startingPosition: { row: number; col: number } } = {
      id: Math.random().toString(36).substr(2, 9),
      playerId: currentPlayer,
      position: { row, col },
      startingPosition: { row, col },
      instructionList: [],
      isShielded: false,
      actionPoints: 5,
      alive: true,
    };
    dispatch({ type: 'ADD_ECHO', echo: newEcho });
  };

  // Handle tile click for extend echo
  const handleExtendEchoTileClick = (row: number, col: number) => {
    if (!existingEchoTiles.some(t => t.row === row && t.col === col)) return;
    const existingEcho = playerEchoes.find(e => e.position.row === row && e.position.col === col);
    if (!existingEcho) return;
    
    // Create a copy of the existing echo for extension (keeping the same ID)
    const extendedEcho: Echo & { startingPosition: { row: number; col: number } } = {
      ...existingEcho,
      startingPosition: (existingEcho as any).startingPosition || { ...existingEcho.position },
      actionPoints: 3, // 3 action points for extension
      // Keep the existing instructionList - new actions will be added to it
    };
    dispatch({ type: 'ADD_ECHO', echo: extendedEcho });
  };

  const handleFinalizeEcho = (finalEcho: Echo) => {
    // If startingPosition is missing, add it from position
    const echoWithStart = {
      ...finalEcho,
      startingPosition: (finalEcho as any).startingPosition || { ...finalEcho.position },
    };
    dispatch({ type: 'FINALIZE_ECHO', echo: echoWithStart });
    dispatch({ type: 'SUBMIT_TURN', player: finalEcho.playerId });
    setSelectionMode('choosing'); // Reset selection mode
  };

  const handleReset = () => {
    dispatch({ type: 'RESET_GAME' });
    setSelectionMode('choosing');
  };

  // Reset selection mode when turn changes
  useEffect(() => {
    setSelectionMode('choosing');
  }, [state.currentPlayer, state.turnNumber]);

  // Replay phase logic
  const [replayStates, setReplayStates] = useState<{ echoes: Echo[]; projectiles: SimProjectile[]; tick: number; destroyed: { echoId: string; by: PlayerId|null }[]; collisions: { row: number; col: number }[] }[]>([]);
  const [replayTick, setReplayTick] = useState(0);
  const replayTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (state.phase === 'replay') {
      const sim = simulateReplay(state.echoes.map(e => ({ ...e, startingPosition: { row: e.position.row, col: e.position.col } }) as Echo & { startingPosition: { row: number; col: number } }));
      setReplayStates(sim);
      setReplayTick(0);
      if (replayTimer.current) clearInterval(replayTimer.current);
      if (sim.length > 0) {
        replayTimer.current = setInterval(() => {
          setReplayTick(tick => {
            if (tick + 1 >= sim.length) {
              if (replayTimer.current) clearInterval(replayTimer.current);
              return tick;
            }
            return tick + 1;
          });
        }, 3000);
      }
    } else {
      setReplayStates([]);
      setReplayTick(0);
      if (replayTimer.current) clearInterval(replayTimer.current);
    }
    return () => { if (replayTimer.current) clearInterval(replayTimer.current); };
  }, [state.phase, state.echoes]);

  const handleNextTurn = () => {
    dispatch({ type: 'NEXT_TURN' });
  };

  if (state.phase === 'replay') {
    const current = replayStates[replayTick] || { echoes: state.echoes, projectiles: [], tick: 0, destroyed: [], collisions: [] };
    // Map SimProjectile to ProjectilePreview for Board
    const projectilePreviews = current.projectiles.map(p => ({ row: p.position.row, col: p.position.col, type: p.type, direction: p.direction }));
    const handleReplay = () => {
      setReplayTick(0);
      if (replayTimer.current) clearInterval(replayTimer.current);
      if (replayStates.length > 0) {
        replayTimer.current = setInterval(() => {
          setReplayTick(tick => {
            if (tick + 1 >= replayStates.length) {
              if (replayTimer.current) clearInterval(replayTimer.current);
              return tick;
            }
            return tick + 1;
          });
        }, 3000);
      }
    };
    return (
      <div style={{ color: 'white', background: '#1a1a1a', minHeight: '100vh', padding: '2rem' }}>
        <h1>Replay Phase</h1>
        <div style={{ display: 'flex', gap: 32, marginBottom: 16 }}>
          <div>Player 1 (Red): <b>{state.scores.player1}</b></div>
          <div>Player 2 (Blue): <b>{state.scores.player2}</b></div>
        </div>
        <h2>Tick: {current.tick}</h2>
        <Board 
          echoes={current.echoes} 
          projectiles={projectilePreviews} 
          collisions={current.collisions}
        />
        <button onClick={handleReset}>Reset Game</button>
        <button onClick={handleReplay} style={{ marginLeft: 8 }}>Replay</button>
        <button onClick={handleNextTurn} style={{ marginLeft: 8 }}>Next Turn</button>
        <pre style={{ background: '#222', color: '#eee', padding: '1rem', marginTop: '2rem', borderRadius: '8px', fontSize: '0.9rem' }}>
          {JSON.stringify(state, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div style={{ color: 'white', background: '#1a1a1a', minHeight: '100vh', padding: '2rem' }}>
      <h1>Game Board</h1>
      <div style={{ display: 'flex', gap: 32, marginBottom: 16 }}>
        <div>Player 1 (Red): <b>{state.scores.player1}</b></div>
        <div>Player 2 (Blue): <b>{state.scores.player2}</b></div>
      </div>
      <h2>Current Turn: {currentPlayer === 'player1' ? 'Player 1 (Red)' : 'Player 2 (Blue)'}</h2>
      
      {state.pendingEcho ? (
        <EchoActionAssignment pendingEcho={state.pendingEcho} onComplete={handleFinalizeEcho} allEchoes={state.echoes} />
      ) : selectionMode === 'choosing' ? (
        <EchoSelection 
          currentPlayer={currentPlayer}
          existingEchoes={state.echoes}
          onNewEcho={handleNewEcho}
          onExtendEcho={handleExtendEcho}
        />
      ) : (
        <Board 
          echoes={state.echoes} 
          highlightedTiles={selectionMode === 'new-echo' ? highlightedTiles : existingEchoTiles} 
          onTileClick={selectionMode === 'new-echo' ? handleNewEchoTileClick : handleExtendEchoTileClick} 
        />
      )}
      
      <p>Turn: {state.turnNumber}</p>
      <p>Number of Echoes: {state.echoes.length}</p>
      <button onClick={handleReset}>Reset Game</button>
      <pre style={{ background: '#222', color: '#eee', padding: '1rem', marginTop: '2rem', borderRadius: '8px', fontSize: '0.9rem' }}>
        {JSON.stringify(state, null, 2)}
      </pre>
    </div>
  );
};

export default GamePage; 