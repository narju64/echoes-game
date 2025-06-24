import React, { useReducer, useEffect, useState, useRef, useCallback } from 'react';
import { initialGameState, gameReducer } from '../game/gameState';
import type { Echo, PlayerId, Direction } from '../types/gameTypes';
import Board from '../components/Board';
import EchoActionAssignment from '../components/EchoActionAssignment';
import EchoSelection from '../components/EchoSelection';

const getHomeRow = (playerId: PlayerId) => (playerId === 'player1' ? 0 : 7);

// Add selection mode type
type SelectionMode = 'choosing' | 'new-echo' | 'extend-echo';

// Function to get column letter from column number
const getColumnLetter = (col: number): string => {
  return String.fromCharCode(65 + col); // A, B, C, etc.
};

const getRowNumber = (row: number): string => {
  return (8 - row).toString(); // 8, 7, 6, etc. (top to bottom)
};

const getBoardPosition = (row: number, col: number): string => {
  return `${getColumnLetter(col)}${getRowNumber(row)}`;
};

const getDirectionName = (direction: { x: number; y: number }): string => {
  const { x, y } = direction;
  if (x === 0 && y === 1) return 'N';
  if (x === 1 && y === 1) return 'NE';
  if (x === 1 && y === 0) return 'E';
  if (x === 1 && y === -1) return 'SE';
  if (x === 0 && y === -1) return 'S';
  if (x === -1 && y === -1) return 'SW';
  if (x === -1 && y === 0) return 'W';
  if (x === -1 && y === 1) return 'NW';
  return `(${x}, ${y})`; // fallback for unexpected directions
};

// Function to generate echo names based on creation order and starting column
const generateEchoNames = (echoes: Echo[]): Map<string, string> => {
  const nameMap = new Map<string, string>();
  let newEchoCount = 0;
  
  echoes.forEach(echo => {
    const startPos = (echo as any).startingPosition || echo.position;
    const columnLetter = getColumnLetter(startPos.col);
    
    // Check if this is a new echo (not an extension)
    const isNewEcho = !nameMap.has(echo.id);
    if (isNewEcho) {
      newEchoCount++;
      nameMap.set(echo.id, `Echo ${newEchoCount}${columnLetter}`);
    }
  });
  
  return nameMap;
};

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
  const states: { echoes: Echo[]; projectiles: SimProjectile[]; tick: number; destroyed: { echoId: string; by: PlayerId|null }[]; collisions: { row: number; col: number }[] }[] = [];
  
  let currentEchoes = echoes.map(e => ({
    ...deepCopyEcho(e),
    position: { ...e.startingPosition },
    alive: true,
  }));
  let projectiles: SimProjectile[] = [];
  let mines: SimProjectile[] = [];
  let nextProjectileId = 1;
  
  // Track shield state at the end of each tick
  const shieldStateAtEndOfTick = new Map<string, { isShielded: boolean; shieldDirection?: Direction }>();

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

  let tick = 1;
  while (true) {
    // Calculate maximum remaining actions among alive echoes
    const maxRemainingActions = Math.max(...currentEchoes.map((e) => {
      if (!e.alive) return 0;
      const originalEcho = echoes.find(origEcho => origEcho.id === e.id);
      if (!originalEcho) return 0;
      const actionsUsed = tick - 1; // Actions used so far
      const remainingActions = Math.max(0, originalEcho.instructionList.length - actionsUsed);
      return remainingActions;
    }), 0);

    // If no alive echoes have actions remaining, stop the replay
    if (maxRemainingActions === 0) {
      break;
    }

    let destroyedThisTick: { echoId: string; by: PlayerId|null }[] = [];
    let collisionsThisTick: { row: number; col: number }[] = [];
    
    // 1. Move projectiles
    projectiles = projectiles
      .filter(p => p.alive)
      .map(p => ({ ...p, position: { row: p.position.row + p.direction.y, col: p.position.col + p.direction.x } }));
    // 2. Move echoes and spawn new projectiles/mines
    currentEchoes = currentEchoes.map((e) => {
      // Find the original echo by ID to get the correct action
      const originalEcho = echoes.find(origEcho => origEcho.id === e.id);
      if (!originalEcho) return deepCopyEcho(e);
      
      const action = originalEcho.instructionList[tick - 1];
      // If no action for this tick:
      if (!action) {
        // Check if shield was active at the end of the previous tick
        const previousShieldState = shieldStateAtEndOfTick.get(e.id);
        if (previousShieldState && previousShieldState.isShielded) {
          return { ...e, isShielded: true, shieldDirection: { ...previousShieldState.shieldDirection! } };
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
          if (echo) {
            // Process each projectile individually, checking shield status for each one
            projectileEnts.forEach(projEnt => {
              const proj = projectiles.find(p => p.id === projEnt.id) || mines.find(m => m.id === projEnt.id);
              if (!proj) return;
              
              // Check shield status for this specific projectile
              if (echo.isShielded && echo.shieldDirection && proj.type === 'projectile') {
                const approachDir = { x: -proj.direction.x, y: -proj.direction.y };
                const key = `${echo.shieldDirection.x},${echo.shieldDirection.y}`;
                const allowed = SHIELD_BLOCKS[key] || [];
                const blocked = allowed.some(d => d.x === approachDir.x && d.y === approachDir.y);
                
                if (blocked) {
                  proj.alive = false;
                  // Deactivate shield after blocking a projectile
                  echo.isShielded = false;
                  echo.shieldDirection = undefined;
                } else {
                  proj.alive = false;
                  // Remove echo immediately
                  currentEchoes = currentEchoes.filter(e => e.id !== echo.id);
                  // Award point to projectile owner
                  const owner = getProjectileOwner(echoes, proj);
                  destroyedThisTick.push({ echoId: echo.id, by: owner && owner !== echo.playerId ? owner : null });
                }
              } else {
                // No shield or mine collision - echo is destroyed
                proj.alive = false;
                if (echo) {
                  // Remove echo immediately
                  currentEchoes = currentEchoes.filter(e => e.id !== echo.id);
                  // Award point to projectile/mine owner
                  const owner = getProjectileOwner(echoes, proj);
                  destroyedThisTick.push({ echoId: echo.id, by: owner && owner !== echo.playerId ? owner : null });
                }
              }
            });
          }
        } else {
          entities.forEach(ent => {
            if (ent.type === 'echo') {
              const echo = currentEchoes.find(e => e.id === ent.id);
              if (echo) {
                // Remove echo immediately instead of just marking as dead
                currentEchoes = currentEchoes.filter(e => e.id !== echo.id);
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
    
    // Record shield state at the end of this tick for next tick's persistence check
    currentEchoes.forEach(e => {
      shieldStateAtEndOfTick.set(e.id, {
        isShielded: e.isShielded,
        shieldDirection: e.shieldDirection
      });
    });
    
    tick++;
  }
  return states;
}

// Simulate ally preview at a specific tick (for input phase)
function simulateAllyPreviewAtTick(
  allEchoes: Echo[], 
  currentPlayer: PlayerId, 
  targetTick: number
): { echoes: Echo[], projectiles: { row: number; col: number; type: 'projectile' | 'mine'; direction: Direction }[] } {
  // Filter for ally echoes only
  const allyEchoes = allEchoes
    .filter(e => e.playerId === currentPlayer && e.alive)
    .map(e => ({
      ...deepCopyEcho(e),
      position: { ...e.position },
      alive: true,
    }));

  let currentEchoes = allyEchoes;
  let projectiles: SimProjectile[] = [];
  let mines: SimProjectile[] = [];
  let nextProjectileId = 1;
  
  // Track shield state at the end of each tick
  const shieldStateAtEndOfTick = new Map<string, { isShielded: boolean; shieldDirection?: Direction }>();

  // Simulate up to the target tick
  for (let tick = 1; tick <= targetTick; tick++) {
    // 1. Move projectiles
    projectiles = projectiles
      .filter(p => p.alive)
      .map(p => ({ ...p, position: { row: p.position.row + p.direction.y, col: p.position.col + p.direction.x } }));
    
    // 2. Move echoes and spawn new projectiles/mines
    currentEchoes = currentEchoes.map((e) => {
      const originalEcho = allEchoes.find(origEcho => origEcho.id === e.id);
      if (!originalEcho) return deepCopyEcho(e);
      
      const action = originalEcho.instructionList[tick - 1];
      if (!action) {
        // Check if shield was active at the end of the previous tick
        const previousShieldState = shieldStateAtEndOfTick.get(e.id);
        if (previousShieldState && previousShieldState.isShielded) {
          return { ...e, isShielded: true, shieldDirection: { ...previousShieldState.shieldDirection! } };
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
    
    // Record shield state at the end of this tick for next tick's persistence check
    currentEchoes.forEach(e => {
      shieldStateAtEndOfTick.set(e.id, {
        isShielded: e.isShielded,
        shieldDirection: e.shieldDirection
      });
    });
  }

  // Return current state at target tick
  return {
    echoes: currentEchoes.map(deepCopyEcho),
    projectiles: [...projectiles.filter(p => p.alive), ...mines.filter(m => m.alive)].map(p => ({
      row: p.position.row,
      col: p.position.col,
      type: p.type,
      direction: p.direction,
    })),
  };
}

// Export the preview simulation function for use in other components
export { simulateAllyPreviewAtTick };

const GamePage: React.FC = () => {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('choosing');
  const currentPlayer: PlayerId = state.currentPlayer;
  const homeRow = getHomeRow(currentPlayer);

  // Find unoccupied home row tiles
  const highlightedTiles = Array.from({ length: 8 })
    .map((_, col) => ({ row: homeRow, col }))
    .filter(tile => !state.echoes.some(e => {
      const startPos = (e as any).startingPosition || e.position;
      return startPos.row === tile.row && startPos.col === tile.col && e.alive;
    }));

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

  // Handle going back from tile selection
  const handleBackFromTileSelection = () => {
    setSelectionMode('choosing');
  };

  // Reset selection mode when turn changes
  useEffect(() => {
    setSelectionMode('choosing');
  }, [state.currentPlayer, state.turnNumber]);

  // Auto-set to new echo if no existing echoes
  useEffect(() => {
    if (selectionMode === 'choosing' && playerEchoes.length === 0) {
      setSelectionMode('new-echo');
    }
  }, [selectionMode, playerEchoes.length]);

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

  // Replay phase logic
  const [replayStates, setReplayStates] = useState<{ echoes: Echo[]; projectiles: SimProjectile[]; tick: number; destroyed: { echoId: string; by: PlayerId|null }[]; collisions: { row: number; col: number }[] }[]>([]);
  const [replayTick, setReplayTick] = useState(0);
  const replayTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentTickRef = useRef(0);

  useEffect(() => {
    if (state.phase === 'replay') {
      const sim = simulateReplay(state.echoes.map(e => ({ ...e, startingPosition: { row: e.position.row, col: e.position.col } }) as Echo & { startingPosition: { row: number; col: number } }));
      setReplayStates(sim);
      setReplayTick(0);
      currentTickRef.current = 0; // Reset the ref
      if (replayTimer.current) clearInterval(replayTimer.current);
      if (sim.length > 0) {
        replayTimer.current = setInterval(() => {
          currentTickRef.current += 1;
          const newTick = currentTickRef.current;
          setReplayTick(newTick);
          if (newTick >= sim.length - 1) {
            if (replayTimer.current) clearInterval(replayTimer.current);
          }
        }, 3000);
      }
    } else {
      setReplayStates([]);
      setReplayTick(0);
      currentTickRef.current = 0; // Reset the ref
      if (replayTimer.current) clearInterval(replayTimer.current);
    }
    return () => { if (replayTimer.current) clearInterval(replayTimer.current); };
  }, [state.phase, state.echoes]);

  const handleNextTurn = () => {
    // Record turn history before moving to next turn
    if (replayStates.length > 0) {
      const destroyedEchoIds = new Set<string>();
      const allDestroyed: { echoId: string; by: PlayerId | null }[] = [];
      const allCollisions: { row: number; col: number }[] = [];
      
      replayStates.forEach(state => {
        state.destroyed.forEach(destroyed => {
          destroyedEchoIds.add(destroyed.echoId);
          allDestroyed.push(destroyed);
        });
        state.collisions.forEach(collision => {
          allCollisions.push(collision);
        });
      });
      
      // Create turn history entry
      const turnHistoryEntry = {
        turnNumber: state.turnNumber,
        player1Echoes: state.echoes.filter(e => e.playerId === 'player1').map(deepCopyEcho),
        player2Echoes: state.echoes.filter(e => e.playerId === 'player2').map(deepCopyEcho),
        scores: { ...state.scores },
        destroyedEchoes: allDestroyed,
        collisions: allCollisions,
      };
      
      dispatch({ type: 'RECORD_TURN_HISTORY', entry: turnHistoryEntry });
      
      // Remove each destroyed echo from the game state
      destroyedEchoIds.forEach(echoId => {
        dispatch({ type: 'REMOVE_ECHO', echoId });
      });
    }
    
    dispatch({ type: 'NEXT_TURN' });
  };

  const handleReplay = useCallback(() => {
    setReplayTick(0);
    currentTickRef.current = 0; // Reset the ref
    if (replayTimer.current) {
      clearInterval(replayTimer.current);
    }
    replayTimer.current = null;
    
    replayTimer.current = setInterval(() => {
      currentTickRef.current += 1;
      const newTick = currentTickRef.current;
      setReplayTick(newTick);
      
      if (newTick >= replayStates.length - 1) {
        if (replayTimer.current) clearInterval(replayTimer.current);
      }
    }, 3000);
  }, [replayStates.length]);

  if (state.phase === 'replay') {
    const current = replayStates[replayTick] || { echoes: state.echoes, projectiles: [], tick: 0, destroyed: [], collisions: [] };
    // Map SimProjectile to ProjectilePreview for Board
    const projectilePreviews = current.projectiles.map(p => ({ row: p.position.row, col: p.position.col, type: p.type, direction: p.direction }));
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
        
        {/* Clean Debug Output for Replay Phase */}
        <div style={{ background: '#222', color: '#eee', padding: '1rem', marginTop: '2rem', borderRadius: '8px', fontSize: '0.9rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#4CAF50' }}>Debug Info - Turn {state.turnNumber} (Replay)</h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <strong>Phase:</strong> {state.phase} | <strong>Replay Tick:</strong> {current.tick} | <strong>Total Ticks:</strong> {replayStates.length}
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <strong>Scores:</strong> Player 1: {state.scores.player1} | Player 2: {state.scores.player2}
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <strong>Current Echoes ({current.echoes.length}):</strong>
            {current.echoes.length === 0 ? (
              <div style={{ color: '#888', fontStyle: 'italic' }}>No echoes</div>
            ) : (
              <div style={{ marginLeft: '1rem' }}>
                {(() => {
                  const echoNames = generateEchoNames(current.echoes);
                  return current.echoes.map((echo, index) => (
                    <div key={echo.id} style={{ marginBottom: '0.5rem', padding: '0.5rem', background: '#333', borderRadius: '4px' }}>
                      <div style={{ color: echo.playerId === 'player1' ? '#ff6b6b' : '#4ecdc4', fontWeight: 'bold' }}>
                        {echoNames.get(echo.id) || `Echo ${index + 1}`} ({echo.playerId === 'player1' ? 'Player 1' : 'Player 2'})
                      </div>
                      <div><strong>Position:</strong> {getBoardPosition(echo.position.row, echo.position.col)} | <strong>Alive:</strong> {echo.alive ? 'Yes' : 'No'}</div>
                      <div><strong>Shielded:</strong> {echo.isShielded ? 'Yes' : 'No'}</div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <strong>Projectiles ({current.projectiles.length}):</strong>
            {current.projectiles.length === 0 ? (
              <div style={{ color: '#888', fontStyle: 'italic' }}>No projectiles</div>
            ) : (
              <div style={{ marginLeft: '1rem' }}>
                {current.projectiles.map((proj, index) => (
                  <div key={index} style={{ color: '#ccc', fontSize: '0.8rem' }}>
                    {proj.type}: {getBoardPosition(proj.position.row, proj.position.col)} → {getDirectionName(proj.direction)}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {current.destroyed.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <strong>Destroyed This Tick ({current.destroyed.length}):</strong>
              <div style={{ marginLeft: '1rem' }}>
                {(() => {
                  const echoNames = generateEchoNames(current.echoes);
                  return current.destroyed.map((destroyed, index) => {
                    const echoName = echoNames.get(destroyed.echoId) || `Echo ${destroyed.echoId.slice(0, 8)}`;
                    return (
                      <div key={index} style={{ color: '#ff6b6b', fontSize: '0.8rem' }}>
                        {echoName} by {destroyed.by || 'collision'}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
          
          {current.collisions.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <strong>Collisions ({current.collisions.length}):</strong>
              <div style={{ marginLeft: '1rem' }}>
                {current.collisions.map((collision, index) => (
                  <div key={index} style={{ color: '#ffd93d', fontSize: '0.8rem' }}>
                    {getBoardPosition(collision.row, collision.col)}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {state.turnHistory.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <strong>Turn History ({state.turnHistory.length} turns):</strong>
              <div style={{ marginLeft: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
                {state.turnHistory.slice().reverse().map((entry, index) => (
                  <div key={entry.turnNumber} style={{ marginBottom: '0.5rem', padding: '0.5rem', background: '#333', borderRadius: '4px', fontSize: '0.8rem' }}>
                    <div style={{ fontWeight: 'bold', color: '#4CAF50' }}>Turn {entry.turnNumber}</div>
                    <div><strong>Scores:</strong> P1: {entry.scores.player1} | P2: {entry.scores.player2}</div>
                    <div><strong>Echoes:</strong> P1: {entry.player1Echoes.length} | P2: {entry.player2Echoes.length}</div>
                    {entry.destroyedEchoes.length > 0 && (
                      <div><strong>Destroyed:</strong> {entry.destroyedEchoes.length} echoes</div>
                    )}
                    {entry.collisions.length > 0 && (
                      <div><strong>Collisions:</strong> {entry.collisions.length} events</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
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
      ) : (selectionMode === 'choosing' && playerEchoes.length > 0) ? (
        <EchoSelection 
          currentPlayer={currentPlayer}
          existingEchoes={state.echoes}
          onNewEcho={handleNewEcho}
          onExtendEcho={handleExtendEcho}
        />
      ) : (
        <div>
          <Board 
            echoes={state.echoes} 
            highlightedTiles={selectionMode === 'new-echo' ? highlightedTiles : existingEchoTiles} 
            onTileClick={selectionMode === 'new-echo' ? handleNewEchoTileClick : handleExtendEchoTileClick} 
          />
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            {playerEchoes.length > 0 && (
              <button
                onClick={handleBackFromTileSelection}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.9rem',
                  background: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                ← Back to Choose Echo Action
              </button>
            )}
          </div>
        </div>
      )}
      
      <p>Turn: {state.turnNumber}</p>
      <p>Number of Echoes: {state.echoes.length}</p>
      <button onClick={handleReset}>Reset Game</button>
      
      {/* Clean Debug Output */}
      <div style={{ background: '#222', color: '#eee', padding: '1rem', marginTop: '2rem', borderRadius: '8px', fontSize: '0.9rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#4CAF50' }}>Debug Info - Turn {state.turnNumber}</h3>
        
        <div style={{ marginBottom: '1rem' }}>
          <strong>Phase:</strong> {state.phase} | <strong>Current Player:</strong> {state.currentPlayer === 'player1' ? 'Player 1 (Red)' : 'Player 2 (Blue)'}
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <strong>Scores:</strong> Player 1: {state.scores.player1} | Player 2: {state.scores.player2}
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <strong>Echoes ({state.echoes.length}):</strong>
          {state.echoes.length === 0 ? (
            <div style={{ color: '#888', fontStyle: 'italic' }}>No echoes</div>
          ) : (
            <div style={{ marginLeft: '1rem' }}>
              {(() => {
                const echoNames = generateEchoNames(state.echoes);
                return state.echoes.map((echo, index) => (
                  <div key={echo.id} style={{ marginBottom: '0.5rem', padding: '0.5rem', background: '#333', borderRadius: '4px' }}>
                    <div style={{ color: echo.playerId === 'player1' ? '#ff6b6b' : '#4ecdc4', fontWeight: 'bold' }}>
                      {echoNames.get(echo.id) || `Echo ${index + 1}`} ({echo.playerId === 'player1' ? 'Player 1' : 'Player 2'})
                    </div>
                    <div><strong>Position:</strong> {getBoardPosition(echo.position.row, echo.position.col)} | <strong>Alive:</strong> {echo.alive ? 'Yes' : 'No'}</div>
                    <div><strong>Actions ({echo.instructionList.length}):</strong></div>
                    <div style={{ marginLeft: '1rem', fontSize: '0.8rem' }}>
                      {(() => {
                        let currentPos = { ...echo.position };
                        return echo.instructionList.map((action, actionIndex) => {
                          // Calculate position for this tick
                          let tickPosition = currentPos;
                          if (action.type === 'walk') {
                            tickPosition = { 
                              row: currentPos.row + action.direction.y, 
                              col: currentPos.col + action.direction.x 
                            };
                          } else if (action.type === 'dash') {
                            tickPosition = { 
                              row: currentPos.row + action.direction.y * 2, 
                              col: currentPos.col + action.direction.x * 2 
                            };
                          }
                          
                          // Update current position for next iteration
                          if (action.type === 'walk' || action.type === 'dash') {
                            currentPos = tickPosition;
                          }
                          
                          return (
                            <div key={actionIndex} style={{ color: '#ccc' }}>
                              Tick {action.tick}: {action.type.toUpperCase()} ({getDirectionName(action.direction)}) [Cost: {action.cost}] at {getBoardPosition(tickPosition.row, tickPosition.col)}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
        
        {state.pendingEcho && (
          <div style={{ marginBottom: '1rem' }}>
            <strong>Pending Echo:</strong>
            <div style={{ marginLeft: '1rem', padding: '0.5rem', background: '#333', borderRadius: '4px' }}>
              <div style={{ color: state.pendingEcho.playerId === 'player1' ? '#ff6b6b' : '#4ecdc4', fontWeight: 'bold' }}>
                {state.pendingEcho.playerId === 'player1' ? 'Player 1' : 'Player 2'} - {state.pendingEcho.actionPoints} Action Points
              </div>
              <div><strong>Position:</strong> {getBoardPosition(state.pendingEcho.position.row, state.pendingEcho.position.col)}</div>
              <div><strong>Actions:</strong> {state.pendingEcho.instructionList.length}</div>
            </div>
          </div>
        )}
        
        <div style={{ fontSize: '0.8rem', color: '#888' }}>
          <strong>Submitted Players:</strong> {state.submittedPlayers.join(', ') || 'None'}
        </div>
        
        {state.turnHistory.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <strong>Turn History ({state.turnHistory.length} turns):</strong>
            <div style={{ marginLeft: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
              {state.turnHistory.slice().reverse().map((entry, index) => (
                <div key={entry.turnNumber} style={{ marginBottom: '0.5rem', padding: '0.5rem', background: '#333', borderRadius: '4px', fontSize: '0.8rem' }}>
                  <div style={{ fontWeight: 'bold', color: '#4CAF50' }}>Turn {entry.turnNumber}</div>
                  <div><strong>Scores:</strong> P1: {entry.scores.player1} | P2: {entry.scores.player2}</div>
                  <div><strong>Echoes:</strong> P1: {entry.player1Echoes.length} | P2: {entry.player2Echoes.length}</div>
                  {entry.destroyedEchoes.length > 0 && (
                    <div><strong>Destroyed:</strong> {entry.destroyedEchoes.length} echoes</div>
                  )}
                  {entry.collisions.length > 0 && (
                    <div><strong>Collisions:</strong> {entry.collisions.length} events</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GamePage; 