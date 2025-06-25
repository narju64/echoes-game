import React, { useReducer, useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { initialGameState, gameReducer, type GameAction } from '../game/gameState';
import type { Echo, PlayerId, Direction, GameState } from '../types/gameTypes';
import Board from '../components/Board';
import EchoActionAssignment from '../components/EchoActionAssignment';
import EchoSelection from '../components/EchoSelection';
import GameInfoPanel from '../components/GameInfoPanel';

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
    instructionList: [...e.instructionList],
    shieldDirection: e.shieldDirection ? { ...e.shieldDirection } : undefined,
  };
}

// Simulate the replay phase, returning an array of { echoes, projectiles, mines, tick, destroyed: { echoId, by: PlayerId|null }[], collisions: { row, col }[] } for each tick
function simulateReplay(echoes: (Echo & { startingPosition: { row: number; col: number } })[]): { echoes: Echo[]; projectiles: SimProjectile[]; tick: number; destroyed: { echoId: string; by: PlayerId|null; position: { row: number; col: number }; playerId: PlayerId }[]; destroyedProjectiles: { id: string; type: 'projectile' | 'mine'; position: { row: number; col: number } }[]; collisions: { row: number; col: number }[]; shieldBlocks: { row: number; col: number; projectileDirection: Direction }[] }[] {
  const states: { echoes: Echo[]; projectiles: SimProjectile[]; tick: number; destroyed: { echoId: string; by: PlayerId|null; position: { row: number; col: number }; playerId: PlayerId }[]; destroyedProjectiles: { id: string; type: 'projectile' | 'mine'; position: { row: number; col: number } }[]; collisions: { row: number; col: number }[]; shieldBlocks: { row: number; col: number; projectileDirection: Direction }[] }[] = [];
  
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
    destroyedProjectiles: [],
    collisions: [],
    shieldBlocks: [],
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

    let destroyedThisTick: { echoId: string; by: PlayerId|null; position: { row: number; col: number }; playerId: PlayerId }[] = [];
    let destroyedProjectilesThisTick: { id: string; type: 'projectile' | 'mine'; position: { row: number; col: number } }[] = [];
    let collisionsThisTick: { row: number; col: number }[] = [];
    let shieldBlocksThisTick: { row: number; col: number; projectileDirection: Direction }[] = [];
    
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
                  // Record destroyed projectile
                  destroyedProjectilesThisTick.push({
                    id: proj.id,
                    type: proj.type,
                    position: { ...proj.position }
                  });
                  // Record shield block for animation
                  shieldBlocksThisTick.push({ 
                    row, 
                    col, 
                    projectileDirection: { ...proj.direction } 
                  });
                  // Deactivate shield after blocking a projectile
                  echo.isShielded = false;
                  echo.shieldDirection = undefined;
                } else {
                  proj.alive = false;
                  // Record destroyed projectile
                  destroyedProjectilesThisTick.push({
                    id: proj.id,
                    type: proj.type,
                    position: { ...proj.position }
                  });
                  // Remove echo immediately
                  currentEchoes = currentEchoes.filter(e => e.id !== echo.id);
                  // Award point to opponent
                  const opponent = echo.playerId === 'player1' ? 'player2' : 'player1';
                  destroyedThisTick.push({ echoId: echo.id, by: opponent, position: { row, col }, playerId: echo.playerId });
                  // Record regular collision
                  collisionsThisTick.push({ row, col });
                }
              } else {
                // No shield or mine collision - echo is destroyed
                proj.alive = false;
                // Record destroyed projectile
                destroyedProjectilesThisTick.push({
                  id: proj.id,
                  type: proj.type,
                  position: { ...proj.position }
                });
                if (echo) {
                  // Remove echo immediately
                  currentEchoes = currentEchoes.filter(e => e.id !== echo.id);
                  // Award point to opponent
                  const opponent = echo.playerId === 'player1' ? 'player2' : 'player1';
                  destroyedThisTick.push({ echoId: echo.id, by: opponent, position: { row, col }, playerId: echo.playerId });
                  // Record regular collision
                  collisionsThisTick.push({ row, col });
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
                // Award point to opponent
                const opponent = echo.playerId === 'player1' ? 'player2' : 'player1';
                destroyedThisTick.push({ echoId: echo.id, by: opponent, position: { row, col }, playerId: echo.playerId });
                // Record regular collision
                collisionsThisTick.push({ row, col });
              }
            } else {
              const proj = projectiles.find(p => p.id === ent.id);
              if (proj) {
                proj.alive = false;
                // Record destroyed projectile
                destroyedProjectilesThisTick.push({
                  id: proj.id,
                  type: proj.type,
                  position: { ...proj.position }
                });
              }
              const mine = mines.find(m => m.id === ent.id);
              if (mine) {
                mine.alive = false;
                // Record destroyed mine
                destroyedProjectilesThisTick.push({
                  id: mine.id,
                  type: mine.type,
                  position: { ...mine.position }
                });
              }
            }
          });
          // If there are 2+ projectiles/mines and no echo, record a collision for animation
          const onlyProjectilesOrMines = entities.every(ent => ent.type === 'projectile' || ent.type === 'mine');
          if (onlyProjectilesOrMines && entities.length > 1) {
            collisionsThisTick.push({ row, col });
          }
        }
      }
    });
    
    states.push({
      echoes: currentEchoes.map(deepCopyEcho),
      projectiles: [...projectiles.filter(p => p.alive), ...mines.filter(m => m.alive)].map(p => ({ ...p })),
      tick,
      destroyed: destroyedThisTick,
      destroyedProjectiles: destroyedProjectilesThisTick,
      collisions: collisionsThisTick,
      shieldBlocks: shieldBlocksThisTick,
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

const BOARD_WIDTH = 32 + 80 * 8; // ROW_LABEL_WIDTH + TILE_SIZE * 8

// Helper function to generate event log from replay states
function generateEventLogFromReplayStates(replayStates: any[]): string[] {
  const events: string[] = [];
  
  if (!replayStates || replayStates.length === 0) return events;
  
  // Group events by tick
  const eventsByTick = new Map<number, string[]>();
  
  replayStates.forEach((state, tickIndex) => {
    const tick = state.tick;
    const tickEvents: string[] = [];
    
    // Process destroyed echoes with their positions
    const destroyedEchoesByPosition = new Map<string, { blueCount: number; orangeCount: number }>();
    state.destroyed.forEach((destroyed: any) => {
      const posKey = `${destroyed.position.row},${destroyed.position.col}`;
      const existing = destroyedEchoesByPosition.get(posKey);
      
      if (existing) {
        if (destroyed.playerId === 'player1') {
          existing.orangeCount++;
        } else {
          existing.blueCount++;
        }
      } else {
        destroyedEchoesByPosition.set(posKey, {
          blueCount: destroyed.playerId === 'player2' ? 1 : 0,
          orangeCount: destroyed.playerId === 'player1' ? 1 : 0
        });
      }
    });
    
    // Process destroyed projectiles with their positions
    const destroyedProjectilesByPosition = new Map<string, { projectiles: number; mines: number }>();
    state.destroyedProjectiles.forEach((destroyed: any) => {
      const posKey = `${destroyed.position.row},${destroyed.position.col}`;
      const existing = destroyedProjectilesByPosition.get(posKey);
      if (existing) {
        if (destroyed.type === 'projectile') {
          existing.projectiles++;
        } else {
          existing.mines++;
        }
      } else {
        destroyedProjectilesByPosition.set(posKey, {
          projectiles: destroyed.type === 'projectile' ? 1 : 0,
          mines: destroyed.type === 'mine' ? 1 : 0
        });
      }
    });
    
    // Create events for each unique position
    const allPositions = new Set([
      ...destroyedEchoesByPosition.keys(),
      ...destroyedProjectilesByPosition.keys()
    ]);
    
    allPositions.forEach(posKey => {
      const [row, col] = posKey.split(',').map(Number);
      const boardPos = getBoardPosition(row, col);
      
      const echoData = destroyedEchoesByPosition.get(posKey);
      const projectileData = destroyedProjectilesByPosition.get(posKey);
      
      let eventDescription = '';
      
      if (echoData && projectileData) {
        // Both echoes and projectiles destroyed at same location
        
        // Check if there's a shield block at this location and adjust projectile count
        const hasShieldBlock = state.shieldBlocks.some((block: any) => 
          block.row === row && block.col === col
        );
        
        let adjustedProjectiles = projectileData.projectiles;
        let adjustedMines = projectileData.mines;
        
        if (hasShieldBlock && adjustedProjectiles > 0) {
          adjustedProjectiles -= 1; // Subtract 1 projectile that was blocked
        }
        
        // Determine what destroyed the echo
        let destroyer = '';
        if (adjustedProjectiles > 0 && adjustedMines > 0) {
          destroyer = 'projectile and mine';
        } else if (adjustedProjectiles > 0) {
          destroyer = 'projectile';
        } else if (adjustedMines > 0) {
          destroyer = 'mine';
        }
        
        // Build echo description
        let echoDescription = '';
        if (echoData.blueCount > 0 && echoData.orangeCount > 0) {
          echoDescription = `${echoData.blueCount} Blue and ${echoData.orangeCount} Orange echo${echoData.blueCount + echoData.orangeCount > 1 ? 's' : ''} destroyed by ${destroyer}`;
        } else if (echoData.blueCount > 0) {
          echoDescription = `${echoData.blueCount} Blue echo${echoData.blueCount > 1 ? 's' : ''} destroyed by ${destroyer}`;
        } else if (echoData.orangeCount > 0) {
          echoDescription = `${echoData.orangeCount} Orange echo${echoData.orangeCount > 1 ? 's' : ''} destroyed by ${destroyer}`;
        }
        
        eventDescription = `Tick ${tick} - ${echoDescription} at ${boardPos}`;
      } else if (echoData) {
        // Only echoes destroyed (echo vs echo collision)
        let echoDescription = '';
        
        if (echoData.blueCount > 0 && echoData.orangeCount > 0) {
          echoDescription = `${echoData.blueCount} Blue and ${echoData.orangeCount} Orange echo${echoData.blueCount + echoData.orangeCount > 1 ? 's' : ''} destroyed`;
        } else if (echoData.blueCount > 0) {
          echoDescription = `${echoData.blueCount} Blue echo${echoData.blueCount > 1 ? 's' : ''} destroyed`;
        } else if (echoData.orangeCount > 0) {
          echoDescription = `${echoData.orangeCount} Orange echo${echoData.orangeCount > 1 ? 's' : ''} destroyed`;
        }
        
        eventDescription = `Tick ${tick} - ${echoDescription} at ${boardPos}`;
      } else if (projectileData) {
        // Only projectiles destroyed (projectile vs projectile collision)
        
        // Check if there's a shield block at this location and adjust projectile count
        const hasShieldBlock = state.shieldBlocks.some((block: any) => 
          block.row === row && block.col === col
        );
        
        let adjustedProjectiles = projectileData.projectiles;
        let adjustedMines = projectileData.mines;
        
        if (hasShieldBlock && adjustedProjectiles > 0) {
          adjustedProjectiles -= 1; // Subtract 1 projectile that was blocked
        }
        
        let parts = [];
        if (adjustedProjectiles > 0) {
          parts.push(`${adjustedProjectiles} projectile${adjustedProjectiles > 1 ? 's' : ''}`);
        }
        if (adjustedMines > 0) {
          parts.push(`${adjustedMines} mine${adjustedMines > 1 ? 's' : ''}`);
        }
        
        // Only create event if there are actually entities to report
        if (parts.length > 0) {
          eventDescription = `Tick ${tick} - ${parts.join(' and ')} destroyed at ${boardPos}`;
        }
      }
      
      if (eventDescription) {
        tickEvents.push(eventDescription);
      }
    });
    
    // Add shield blocks (these are separate from collisions)
    state.shieldBlocks.forEach((block: any) => {
      const boardPos = getBoardPosition(block.row, block.col);
      // Find which player's echo is at this location to determine the shield owner
      const shieldedEcho = state.echoes.find((echo: any) => 
        echo.position.row === block.row && echo.position.col === block.col
      );
      const playerNumber = shieldedEcho?.playerId === 'player1' ? '1' : '2';
      tickEvents.push(`Tick ${tick} - Player ${playerNumber} shield blocks at ${boardPos}`);
    });
    
    if (tickEvents.length > 0) {
      eventsByTick.set(tick, tickEvents);
    }
  });
  
  // Convert to sorted array
  const sortedTicks = Array.from(eventsByTick.keys()).sort((a, b) => a - b);
  sortedTicks.forEach((tick, index) => {
    const tickEvents = eventsByTick.get(tick) || [];
    
    // Sort events within each tick by tile position and type
    const sortedTickEvents = tickEvents.sort((a, b) => {
      // Extract tile position from event strings
      const getTilePosition = (event: string) => {
        const match = event.match(/at ([A-H][1-8])/);
        return match ? match[1] : '';
      };
      
      const tileA = getTilePosition(a);
      const tileB = getTilePosition(b);
      
      // First sort by tile position (A1, A2, ..., H8)
      if (tileA !== tileB) {
        return tileA.localeCompare(tileB);
      }
      
      // If same tile, put shield blocks before collisions
      const isShieldBlockA = a.includes('shield blocks');
      const isShieldBlockB = b.includes('shield blocks');
      
      if (isShieldBlockA && !isShieldBlockB) return -1;
      if (!isShieldBlockA && isShieldBlockB) return 1;
      
      return 0;
    });
    
    // Add a blank line between different ticks (except before the first tick)
    if (index > 0) {
      events.push('');
    }
    sortedTickEvents.forEach(event => {
      events.push(event);
    });
  });
  
  return events;
}

const GamePage: React.FC = () => {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(gameReducer, initialGameState) as [GameState, React.Dispatch<GameAction>];
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
  const [replayStates, setReplayStates] = useState<{ echoes: Echo[]; projectiles: SimProjectile[]; tick: number; destroyed: { echoId: string; by: PlayerId|null; position: { row: number; col: number }; playerId: PlayerId }[]; destroyedProjectiles: { id: string; type: 'projectile' | 'mine'; position: { row: number; col: number } }[]; collisions: { row: number; col: number }[]; shieldBlocks: { row: number; col: number; projectileDirection: Direction }[] }[]>([]);
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
      const allDestroyed: { echoId: string; by: PlayerId | null; position: { row: number; col: number } }[] = [];
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
        destroyedProjectiles: replayStates.flatMap(state => state.destroyedProjectiles || []),
        collisions: allCollisions,
        shieldBlocks: replayStates.flatMap(state => state.shieldBlocks || []),
        eventLog: generateEventLogFromReplayStates(replayStates),
      };
      
      dispatch({ type: 'RECORD_TURN_HISTORY', entry: turnHistoryEntry });
      
      // Update scores based on destroyed echoes
      if (allDestroyed.length > 0) {
        dispatch({ type: 'UPDATE_SCORES', destroyedEchoes: allDestroyed });
      }
      
      // Remove each destroyed echo from the game state
      destroyedEchoIds.forEach(echoId => {
        dispatch({ type: 'REMOVE_ECHO', echoId });
      });
    }
    
    dispatch({ type: 'NEXT_TURN' });
    // Always check win conditions after all state updates
    dispatch({ type: 'CHECK_WIN_CONDITIONS' });
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

  // Determine highlightedTiles and onTileClick based on selectionMode
  let boardHighlightedTiles: { row: number; col: number }[] = [];
  let boardOnTileClick: ((row: number, col: number) => void) | undefined = undefined;
  if (selectionMode === 'new-echo') {
    boardHighlightedTiles = highlightedTiles;
    boardOnTileClick = handleNewEchoTileClick;
  } else if (selectionMode === 'extend-echo') {
    boardHighlightedTiles = existingEchoTiles;
    boardOnTileClick = handleExtendEchoTileClick;
  }

  if (state.phase === 'replay') {
    const current = replayStates[replayTick] || { echoes: state.echoes, projectiles: [], tick: 0, destroyed: [], destroyedProjectiles: [], collisions: [], shieldBlocks: [] };
    // Map SimProjectile to ProjectilePreview for Board
    const projectilePreviews = current.projectiles.map(p => ({ row: p.position.row, col: p.position.col, type: p.type, direction: p.direction }));
    return (
      <div style={{ color: 'white', background: '#1a1a1a', minHeight: '100vh', padding: '2rem' }}>
        {/* Home Button - Top Left Corner */}
        <button 
          onClick={() => navigate('/home')}
          style={{
            position: 'absolute',
            top: '1rem',
            left: '1rem',
            background: 'linear-gradient(145deg, #333, #444)',
            color: 'white',
            border: '2px solid #666',
            padding: '8px 16px',
            fontSize: '0.9rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontFamily: 'Orbitron, monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
            zIndex: 1000
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(145deg, #2196F3, #1976D2)';
            e.currentTarget.style.borderColor = '#2196F3';
            e.currentTarget.style.boxShadow = '0 0 20px #2196F3, 0 8px 16px rgba(33, 150, 243, 0.3)';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.textShadow = '0 0 8px #2196F3';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(145deg, #333, #444)';
            e.currentTarget.style.borderColor = '#666';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.textShadow = 'none';
          }}
        >
          Home
        </button>
        
        <GameInfoPanel 
          currentPlayer={currentPlayer}
          turnNumber={state.turnNumber}
          phase={state.phase}
          scores={state.scores}
          echoes={state.echoes}
          currentTick={current.tick}
          replayStates={replayStates}
          turnHistory={state.turnHistory}
        />
        <div style={{ width: BOARD_WIDTH, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ color: '#ff9800', fontWeight: 'bold', textShadow: '0 0 1px #fff', textAlign: 'left', fontSize: 22 }}>Player 1 (Orange): <b>{state.scores.player1}</b></div>
          <div style={{ color: 'blue', fontWeight: 'bold', textShadow: '0 0 1px #fff', textAlign: 'right', fontSize: 22 }}>Player 2 (Blue): <b>{state.scores.player2}</b></div>
        </div>
        <div style={{ width: BOARD_WIDTH, margin: '0 auto', textAlign: 'center', marginBottom: 0 }}>
          <h2 style={{ color: currentPlayer === 'player1' ? '#ff9800' : 'blue', textShadow: '0 0 1px #fff', margin: 0, fontSize: 28, textDecoration: 'underline' }}>
            Current Turn: {currentPlayer === 'player1' ? 'Player 1 (Orange)' : 'Player 2 (Blue)'}
          </h2>
        </div>
        <Board 
          echoes={current.echoes} 
          projectiles={projectilePreviews} 
          collisions={current.collisions}
          shieldBlocks={current.shieldBlocks}
        />
        <div style={{ textAlign: 'center', marginTop: '1rem', marginBottom: '1rem' }}>
          <button 
            onClick={handleReset}
            style={{
              position: 'relative',
              background: 'linear-gradient(145deg, #f4433620, #f4433640)',
              color: 'white',
              border: '2px solid #f44336',
              padding: '10px 20px',
              fontSize: '1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontFamily: 'Orbitron, monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 0 8px #f4433640, inset 0 1px 0 #f4433660',
              textShadow: '0 0 4px #f44336'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 4px 16px #f4433660, inset 0 1px 0 #f4433680';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 0 8px #f4433640, inset 0 1px 0 #f4433660';
            }}
          >
            🔄 Reset Game
          </button>
          <button 
            onClick={handleReplay}
            style={{
              position: 'relative',
              background: 'linear-gradient(145deg, #2196F320, #2196F340)',
              color: 'white',
              border: '2px solid #2196F3',
              padding: '10px 20px',
              fontSize: '1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontFamily: 'Orbitron, monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 0 8px #2196F340, inset 0 1px 0 #2196F360',
              textShadow: '0 0 4px #2196F3',
              marginRight: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 4px 16px #2196F360, inset 0 1px 0 #2196F380';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 0 8px #2196F340, inset 0 1px 0 #2196F360';
            }}
          >
            ▶️ Replay
          </button>
          <button 
            onClick={handleNextTurn}
            style={{
              position: 'relative',
              background: 'linear-gradient(145deg, #4CAF5020, #4CAF5040)',
              color: 'white',
              border: '2px solid #4CAF50',
              padding: '10px 20px',
              fontSize: '1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontFamily: 'Orbitron, monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 0 8px #4CAF5040, inset 0 1px 0 #4CAF5060',
              textShadow: '0 0 4px #4CAF50'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 4px 16px #4CAF5060, inset 0 1px 0 #4CAF5080';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 0 8px #4CAF5040, inset 0 1px 0 #4CAF5060';
            }}
          >
            ⏭️ Next Turn
          </button>
        </div>
        
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
                      <div style={{ color: echo.playerId === 'player1' ? 'orange' : '#4ecdc4', fontWeight: 'bold' }}>
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
                      <div key={index} style={{ color: 'orange', fontSize: '0.8rem' }}>
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
          
          {current.shieldBlocks.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <strong>Shield Blocks ({current.shieldBlocks.length}):</strong>
              <div style={{ marginLeft: '1rem' }}>
                {current.shieldBlocks.map((shieldBlock, index) => (
                  <div key={index} style={{ color: '#4CAF50', fontSize: '0.8rem' }}>
                    {getBoardPosition(shieldBlock.row, shieldBlock.col)} → {getDirectionName(shieldBlock.projectileDirection)}
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
                    {entry.destroyedProjectiles && entry.destroyedProjectiles.length > 0 && (
                      <div><strong>Destroyed Projectiles:</strong> {entry.destroyedProjectiles.length} projectiles</div>
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

  // Game Over Phase
  if (state.phase === 'gameOver') {
    const winner = state.winner;
    const finalScores = state.scores;
    const player1Echoes = state.echoes.filter(e => e.playerId === 'player1' && e.alive);
    const player2Echoes = state.echoes.filter(e => e.playerId === 'player2' && e.alive);
    
    return (
      <div style={{ color: 'white', background: '#1a1a1a', minHeight: '100vh', padding: '2rem' }}>
        {/* Home Button - Top Left Corner */}
        <button 
          onClick={() => navigate('/home')}
          style={{
            position: 'absolute',
            top: '1rem',
            left: '1rem',
            background: 'linear-gradient(145deg, #333, #444)',
            color: 'white',
            border: '2px solid #666',
            padding: '8px 16px',
            fontSize: '0.9rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontFamily: 'Orbitron, monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
            zIndex: 1000
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(145deg, #2196F3, #1976D2)';
            e.currentTarget.style.borderColor = '#2196F3';
            e.currentTarget.style.boxShadow = '0 0 20px #2196F3, 0 8px 16px rgba(33, 150, 243, 0.3)';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.textShadow = '0 0 8px #2196F3';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(145deg, #333, #444)';
            e.currentTarget.style.borderColor = '#666';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.textShadow = 'none';
          }}
        >
          Home
        </button>
        
        <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '2rem', color: winner === 'player1' ? 'orange' : '#4ecdc4' }}>
            🏆 Game Over! 🏆
          </h1>
          
          <div style={{ 
            background: '#333', 
            padding: '2rem', 
            borderRadius: '12px', 
            marginBottom: '2rem',
            border: `3px solid ${winner === 'player1' ? 'orange' : '#4ecdc4'}`
          }}>
            <h2 style={{ 
              fontSize: '2rem', 
              marginBottom: '1rem',
              color: winner === 'player1' ? 'orange' : '#4ecdc4'
            }}>
              {winner === 'player1' ? 'Player 1 (Orange)' : 'Player 2 (Blue)'} Wins!
            </h2>
            
            <div style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
              Final Scores:
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem' }}>
              <div style={{ 
                padding: '1rem', 
                background: winner === 'player1' ? 'orange' : '#666',
                borderRadius: '8px',
                minWidth: '120px'
              }}>
                <div style={{ fontWeight: 'bold' }}>Player 1 (Orange)</div>
                <div style={{ fontSize: '1.5rem' }}>{finalScores.player1}</div>
              </div>
              <div style={{ 
                padding: '1rem', 
                background: winner === 'player2' ? '#4ecdc4' : '#666',
                borderRadius: '8px',
                minWidth: '120px'
              }}>
                <div style={{ fontWeight: 'bold' }}>Player 2 (Blue)</div>
                <div style={{ fontSize: '1.5rem' }}>{finalScores.player2}</div>
              </div>
            </div>
            
            <div style={{ fontSize: '1rem', marginBottom: '1rem' }}>
              Final Echo Count:
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>
              <div>Player 1: {player1Echoes.length} echoes</div>
              <div>Player 2: {player2Echoes.length} echoes</div>
            </div>
          </div>
          
          {/* Board hidden on win screen
          <div style={{ marginBottom: '2rem' }}>
            <Board 
              echoes={state.echoes} 
              projectiles={[]}
              collisions={[]}
              shieldBlocks={[]}
            />
          </div>
          */}
          
          <button 
            onClick={handleReset}
            style={{
              padding: '1rem 2rem',
              fontSize: '1.2rem',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Play Again
          </button>
          
          {/* Final Game Stats */}
          <div style={{ 
            background: '#222', 
            color: '#eee', 
            padding: '1rem', 
            marginTop: '2rem', 
            borderRadius: '8px', 
            fontSize: '0.9rem',
            textAlign: 'left'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#4CAF50', textAlign: 'center' }}>Final Game Stats</h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <strong>Total Turns:</strong> {state.turnNumber}
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <strong>Win Condition:</strong> {
                finalScores.player1 >= 10 || finalScores.player2 >= 10 ? 'Points Victory (10+ points)' :
                player1Echoes.length === 0 || player2Echoes.length === 0 ? 'Opponent Destruction' :
                'Echo Count Victory (8 columns)'
              }
            </div>
            
            {state.turnHistory.length > 0 && (
              <div>
                <strong>Turn History ({state.turnHistory.length} turns):</strong>
                <div style={{ marginLeft: '1rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {state.turnHistory.slice().reverse().map((entry, index) => (
                    <div key={entry.turnNumber} style={{ marginBottom: '0.5rem', padding: '0.5rem', background: '#333', borderRadius: '4px', fontSize: '0.8rem' }}>
                      <div style={{ fontWeight: 'bold', color: '#4CAF50' }}>Turn {entry.turnNumber}</div>
                      <div><strong>Scores:</strong> P1: {entry.scores.player1} | P2: {entry.scores.player2}</div>
                      <div><strong>Echoes:</strong> P1: {entry.player1Echoes.length} | P2: {entry.player2Echoes.length}</div>
                      {entry.destroyedEchoes.length > 0 && (
                        <div><strong>Destroyed:</strong> {entry.destroyedEchoes.length} echoes</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ color: 'white', background: '#1a1a1a', minHeight: '100vh', padding: '2rem' }}>
      {/* Home Button - Top Left Corner */}
      <button 
        onClick={() => navigate('/home')}
        style={{
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          background: 'linear-gradient(145deg, #333, #444)',
          color: 'white',
          border: '2px solid #666',
          padding: '8px 16px',
          fontSize: '0.9rem',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontFamily: 'Orbitron, monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
          zIndex: 1000
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(145deg, #2196F3, #1976D2)';
          e.currentTarget.style.borderColor = '#2196F3';
          e.currentTarget.style.boxShadow = '0 0 20px #2196F3, 0 8px 16px rgba(33, 150, 243, 0.3)';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.textShadow = '0 0 8px #2196F3';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(145deg, #333, #444)';
          e.currentTarget.style.borderColor = '#666';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.textShadow = 'none';
        }}
      >
        Home
      </button>
      
      <GameInfoPanel 
        currentPlayer={currentPlayer}
        turnNumber={state.turnNumber}
        phase={state.phase}
        scores={state.scores}
        echoes={state.echoes}
        currentTick={state.currentTick}
        replayStates={[]}
        turnHistory={state.turnHistory}
      />
      <div style={{ width: BOARD_WIDTH, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ color: '#ff9800', fontWeight: 'bold', textShadow: '0 0 1px #fff', textAlign: 'left', fontSize: 22 }}>Player 1 (Orange): <b>{state.scores.player1}</b></div>
      <div style={{ color: 'blue', fontWeight: 'bold', textShadow: '0 0 1px #fff', textAlign: 'right', fontSize: 22 }}>Player 2 (Blue): <b>{state.scores.player2}</b></div>
      </div>
      <div style={{ width: BOARD_WIDTH, margin: '0 auto', textAlign: 'center', marginBottom: 0 }}>
        <h2 style={{ color: currentPlayer === 'player1' ? '#ff9800' : 'blue', textShadow: '0 0 1px #fff', margin: 0, fontSize: 28, textDecoration: 'underline' }}>
          Current Turn: {currentPlayer === 'player1' ? 'Player 1 (Orange)' : 'Player 2 (Blue)'}
        </h2>
      </div>
      
      {state.pendingEcho ? (
        <EchoActionAssignment pendingEcho={state.pendingEcho} onComplete={handleFinalizeEcho} allEchoes={state.echoes} />
      ) : (selectionMode === 'choosing' && playerEchoes.length > 0) ? (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <EchoSelection 
            currentPlayer={currentPlayer}
            existingEchoes={state.echoes}
            onNewEcho={handleNewEcho}
            onExtendEcho={handleExtendEcho}
          />
          <div style={{ marginLeft: '60px' }}>
            <Board 
              echoes={state.echoes} 
              highlightedTiles={boardHighlightedTiles}
              onTileClick={boardOnTileClick}
              fullWidth={false}
            />
          </div>
        </div>
      ) : (
        <div>
          <Board 
            echoes={state.echoes} 
            highlightedTiles={boardHighlightedTiles}
            onTileClick={boardOnTileClick}
            fullWidth={true}
          />
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            {playerEchoes.length > 0 && (
              <button
                onClick={handleBackFromTileSelection}
                style={{
                  position: 'relative',
                  background: 'linear-gradient(145deg, #66620, #66640)',
                  color: 'white',
                  border: '2px solid #666',
                  padding: '10px 20px',
                  fontSize: '1rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontFamily: 'Orbitron, monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
                  zIndex: 1000
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(145deg, #2196F3, #1976D2)';
                  e.currentTarget.style.borderColor = '#2196F3';
                  e.currentTarget.style.boxShadow = '0 0 20px #2196F3, 0 8px 16px rgba(33, 150, 243, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.textShadow = '0 0 8px #2196F3';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(145deg, #333, #444)';
                  e.currentTarget.style.borderColor = '#666';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.textShadow = 'none';
                }}
              >
                ← Back to Choose Echo Action
              </button>
            )}
          </div>
        </div>
      )}
      
      <div style={{ textAlign: 'center', marginTop: '1rem', marginBottom: '1rem' }}>
        <button 
          onClick={handleReset}
          style={{
            position: 'relative',
            background: 'linear-gradient(145deg, #f4433620, #f4433640)',
            color: 'white',
            border: '2px solid #f44336',
            padding: '10px 20px',
            fontSize: '1rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontFamily: 'Orbitron, monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
            zIndex: 1000
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
            e.currentTarget.style.boxShadow = '0 4px 16px #f4433660, inset 0 1px 0 #f4433680';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 0 8px #f4433640, inset 0 1px 0 #f4433660';
          }}
        >
          🔄 Reset Game
        </button>
      </div>
      
      {/* Clean Debug Output */}
      <div style={{ background: '#222', color: '#eee', padding: '1rem', marginTop: '2rem', borderRadius: '8px', fontSize: '0.9rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#4CAF50' }}>Debug Info - Turn {state.turnNumber}</h3>
        
        <div style={{ marginBottom: '1rem' }}>
          <strong>Phase:</strong> {state.phase} | <strong>Current Player:</strong> {state.currentPlayer === 'player1' ? 'Player 1 (Orange)' : 'Player 2 (Blue)'}
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
                    <div style={{ color: echo.playerId === 'player1' ? 'orange' : '#4ecdc4', fontWeight: 'bold' }}>
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
              <div style={{ color: state.pendingEcho.playerId === 'player1' ? 'orange' : '#4ecdc4', fontWeight: 'bold' }}>
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
                  {entry.destroyedProjectiles && entry.destroyedProjectiles.length > 0 && (
                    <div><strong>Destroyed Projectiles:</strong> {entry.destroyedProjectiles.length} projectiles</div>
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