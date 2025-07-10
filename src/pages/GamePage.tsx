import React, { useReducer, useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { initialGameState, gameReducer, type GameAction } from '../game/gameState';
import type { Echo, PlayerId, Direction, GameState } from '../types/gameTypes';
import Board from '../components/Board';
import EchoActionAssignment from '../components/EchoActionAssignment';
import EchoSelection from '../components/EchoSelection';
import GameInfoPanel from '../components/GameInfoPanel';
import LeaveConfirmationModal from '../components/LeaveConfirmationModal';
import { socketService } from '../services/socket';
import { playSound, playClickSound, playGlassImpact, playLaserSound, playExplosion, backgroundMusic } from '../assets/sounds/playSound';
import { audioSounds } from '../assets/sounds/soundAssets';
import { setGameContext, captureGameError, clearGameContext } from '../services/sentry';
import { matchLogger } from '../services/matchLogger';

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

// Responsive scaling calculation
const getLayoutScale = () => {
  if (typeof window !== 'undefined') {
    const windowWidth = window.innerWidth;
    
    // Full layout requires: board + left panel + right panel + spacing
    // Board: 400-800px, Panels: 430px each, Spacing: 120px
    const minRequiredWidth = 800 + 430 + 430 + 120; // 1,780px for desktop
    
    if (windowWidth >= minRequiredWidth) {
      return 1; // Full size
    } else if (windowWidth >= 1200) {
      // Scale down proportionally for medium screens
      return windowWidth / minRequiredWidth;
    } else if (windowWidth >= 800) {
      // More aggressive scaling for smaller screens
      return Math.max(0.6, windowWidth / minRequiredWidth);
    } else {
      // Use existing mobile layout for very small screens
      return 1; // Let existing mobile logic handle it
    }
  }
  return 1; // Default to full size
};

const getBoardWidth = () => {
  if (typeof window !== 'undefined') {
    if (window.innerWidth <= 768) return 24 + 40 * 8; // mobile
    if (window.innerWidth <= 1024) return 28 + 60 * 8; // tablet
    return 32 + 80 * 8; // desktop
  }
  return 32 + 80 * 8; // default
};

// Helper function to generate event log from replay states
function generateEventLogFromReplayStates(replayStates: any[]): string[] {
  const events: string[] = [];
  
  if (!replayStates || replayStates.length === 0) return events;
  
  // Group events by tick
  const eventsByTick = new Map<number, string[]>();
  
  replayStates.forEach((state, _tickIndex) => {
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

// Add at the top, after imports
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
}

// Wrap click handlers to ensure playClickSound is called for all user-initiated clicks
const withClickSound = <T extends any[]>(fn: (...args: T) => void) => {
  return (...args: T) => {
    playClickSound();
    fn(...args);
  };
};

// Helper function to determine win condition
function determineWinCondition(
  winner: PlayerId, 
  finalScores: Record<PlayerId, number>, 
  player1Echoes: Echo[], 
  player2Echoes: Echo[]
): string {
  const SCORE_TO_WIN = 10;
  const COLUMNS_TO_WIN = 8;
  
  // Check score win condition
  if (finalScores[winner] >= SCORE_TO_WIN) {
    return `${SCORE_TO_WIN}_points`;
  }
  
  // Check columns win condition
  const winnerEchoes = winner === 'player1' ? player1Echoes : player2Echoes;
  const winnerColumns = new Set(winnerEchoes.map(e => e.position.col));
  if (winnerColumns.size >= COLUMNS_TO_WIN) {
    return `${COLUMNS_TO_WIN}_columns`;
  }
  
  // Check opponent destruction win condition
  const opponentEchoes = winner === 'player1' ? player2Echoes : player1Echoes;
  if (opponentEchoes.length === 0) {
    return 'opponent_destroyed';
  }
  
  return 'unknown';
}

const GamePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const modeParam = searchParams.get('mode');
  const [gameMode, _setGameMode] = useState(modeParam || 'hotseat');
  
  // Multiplayer-specific parameters
  const roomId = searchParams.get('roomId');
  const playerId = searchParams.get('playerId');
  const gamePlayerId = searchParams.get('gamePlayerId') as PlayerId | null;
  const playerName = searchParams.get('playerName');
  const isHost = searchParams.get('isHost') === 'true';
  
  // --- Multiplayer player names state ---
  const [playerNames, setPlayerNames] = useState<{ player1: string; player2: string }>({ player1: 'Player 1', player2: 'Player 2' });

  // Set player names in multiplayer mode
  useEffect(() => {
    if (gameMode === 'multiplayer') {
      // Try to get both player names from sessionStorage (set in Lobby/Host/Join)
      const p1 = sessionStorage.getItem(`room_${roomId}_player1_name`);
      const p2 = sessionStorage.getItem(`room_${roomId}_player2_name`);
      if (p1 && p2) {
        setPlayerNames({ player1: p1, player2: p2 });
      } else if (playerName && gamePlayerId) {
        // Fallback: set local player name, keep default for opponent
        setPlayerNames(prev => ({ ...prev, [gamePlayerId]: playerName }));
      }
    }
  }, [gameMode, roomId, playerName, gamePlayerId]);
  
  const [state, dispatch] = useReducer(gameReducer, initialGameState) as [GameState, React.Dispatch<GameAction>];
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('choosing');
  const [layoutScale, setLayoutScale] = useState(1);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  
  // Multiplayer submission tracking
  const [submittedPlayers, setSubmittedPlayers] = useState<Set<PlayerId>>(new Set());
  
  // Multiplayer waiting state
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  
  // For multiplayer: track if we've received opponent echoes for replay
  const [receivedOpponentEchoes, setReceivedOpponentEchoes] = useState(false);
  
  // For multiplayer: store opponent echoes separately until replay phase
  const pendingOpponentEchoesRef = useRef<Echo[]>([]);
  
  // For multiplayer: use assigned gamePlayerId, for other modes: use state.currentPlayer
  const currentPlayer: PlayerId = gameMode === 'multiplayer' && gamePlayerId ? gamePlayerId : state.currentPlayer;
  const homeRow = getHomeRow(currentPlayer);

  // Set Sentry context for error tracking
  useEffect(() => {
    setGameContext(gameMode, roomId || undefined);
    
    // Cleanup when component unmounts
    return () => {
      clearGameContext();
    };
  }, [gameMode, roomId]);

  // Start match logging when game begins
  useEffect(() => {
    if (state.echoes.length > 0 && !matchLogger.isActive()) {
      const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      matchLogger.startMatch(matchId, gameMode, ['player1', 'player2'], state);
    }
  }, [state.echoes.length, gameMode, state]);

  // Debug logging for multiplayer
  useEffect(() => {
    if (gameMode === 'multiplayer') {
      console.log('Multiplayer GamePage loaded with:');
      console.log('- gameMode:', gameMode);
      console.log('- roomId:', roomId);
      console.log('- playerId:', playerId);
      console.log('- gamePlayerId:', gamePlayerId);
      console.log('- playerName:', playerName);
      console.log('- isHost:', isHost);
      console.log('- currentPlayer (assigned):', currentPlayer);
    }
  }, [gameMode, roomId, playerId, gamePlayerId, playerName, isHost, currentPlayer]);

  // Debug logging for echoes state changes
  useEffect(() => {
    console.log('Echoes state changed:', {
      count: state.echoes.length,
      echoes: state.echoes.map(e => ({ id: e.id, playerId: e.playerId, alive: e.alive })),
      phase: state.phase,
      turnNumber: state.turnNumber
    });
  }, [state.echoes, state.phase, state.turnNumber]);

  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setLayoutScale(getLayoutScale());
    };
    // Set initial scale
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Stop background music when entering game
  useEffect(() => {
    backgroundMusic.stop();
  }, []);

  // Handle beforeunload event (page refresh, close tab, browser back)
  useEffect(() => {
    // Set a flag to detect if this is a fresh page load vs a reload
    const isReload = sessionStorage.getItem('gameReloading');
    
    if (isReload) {
      // This is a reload, redirect to home immediately
      sessionStorage.removeItem('gameReloading');
      window.location.href = '/home';
      return;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Set flag to indicate we're about to reload
      sessionStorage.setItem('gameReloading', 'true');
      
      // Show custom message for reload
      e.preventDefault();
      e.returnValue = 'Reloading will end your game session. Are you sure?';
      return 'Reloading will end your game session. Are you sure?';
    };

    const handlePopState = (e: PopStateEvent) => {
      // Always show modal for all game sessions
      e.preventDefault();
      setShowLeaveModal(true);
      // Push the current state back to prevent navigation
      window.history.pushState(null, '', window.location.href);
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    
    // Push initial state to enable popstate detection
    window.history.pushState(null, '', window.location.href);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []); // Remove any dependencies so it works in all modes

  // Handle multiplayer socket events
  useEffect(() => {
    if (gameMode === 'multiplayer') {
      const socket = socketService.getSocket();
      
      if (socket) {
        const handlePlayerLeft = (data: any) => {
          console.log('Player left event in GamePage:', data);
          
          console.log('URL params - roomId:', roomId, 'playerId:', playerId);
          
          // Send leaveRoom event to backend to notify that this player is also leaving
          if (roomId && playerId) {
            console.log('Sending leaveRoom event for kicked player');
            socketService.leaveRoom(roomId, playerId);
          } else {
            console.log('Missing roomId or playerId, cannot send leaveRoom event');
          }
          
          // Navigate back to home if other player left
          navigate('/home');
        };

        const handleRoomClosed = () => {
          console.log('Room closed event in GamePage');
          navigate('/home');
        };

        // New multiplayer game event handlers
        const handleGameAction = (data: any) => {
          console.log('Received game action from opponent:', data);
          // TODO: Apply opponent's action to local game state
        };

        const handlePlayerSubmitted = (data: any) => {
          console.log('Player submitted turn:', data);
          
          // Only track opponent submissions (not our own)
          const opponentPlayerId = data.gamePlayerId;
          if (opponentPlayerId && opponentPlayerId !== currentPlayer) {
            console.log('Opponent submitted:', opponentPlayerId);
            
            // Add opponent to submitted players
            const newSubmittedPlayers = new Set(submittedPlayers);
            newSubmittedPlayers.add(opponentPlayerId);
            setSubmittedPlayers(newSubmittedPlayers);
            
            // Note: Backend will trigger replay phase when both players submit
            // No need to check submission count here anymore
          }
        };

        const handleGameStateUpdate = (data: any) => {
          console.log('Received game state update:', data);
          // TODO: Sync local state with received state
        };

        const handleOpponentEchoes = (data: any) => {
          console.log('Received opponent echoes for replay:', data);
          console.log('Current state echoes before adding opponent:', state.echoes);
          
          // Store opponent echoes separately until replay phase
          if (data.echoes && Array.isArray(data.echoes)) {
            const opponentEchoes = data.echoes.map((echo: any) => ({
              ...echo,
              playerId: data.gamePlayerId // Ensure correct player ID
            }));
            
            console.log('Storing opponent echoes for later:', opponentEchoes);
            pendingOpponentEchoesRef.current = opponentEchoes;
            
            // Mark that we've received opponent echoes
            setReceivedOpponentEchoes(true);
          } else {
            console.error('No echoes found in opponent data or not an array:', data.echoes);
          }
        };

        const handleReplayPhase = (data: any) => {
          console.log('Replay phase triggered:', data);
          console.log('Pending opponent echoes:', pendingOpponentEchoesRef.current);
          
          // Add pending opponent echoes to state for replay
          if (pendingOpponentEchoesRef.current.length > 0) {
            console.log('Adding pending opponent echoes to state:', pendingOpponentEchoesRef.current);
            pendingOpponentEchoesRef.current.forEach((echo: Echo) => {
              dispatch({ type: 'FINALIZE_ECHO', echo });
            });
            pendingOpponentEchoesRef.current = []; // Clear pending echoes
          } else {
            console.log('No pending opponent echoes to add');
          }
          
          // Clear waiting state and start replay phase
          setWaitingForOpponent(false);
          
          // Mark that we have opponent echoes (they're now in state)
          setReceivedOpponentEchoes(true);
          
          // Echoes are now sent immediately when finalized, so no need to send them here
          console.log('Starting replay phase - echoes should already be exchanged');
          
          // Ensure both players are marked as submitted in game state
          dispatch({ type: 'SUBMIT_TURN', player: 'player1' });
          dispatch({ type: 'SUBMIT_TURN', player: 'player2' });
          
          // Reset submission tracking for next turn
          setSubmittedPlayers(new Set());
        };

        socket.on('playerLeft', handlePlayerLeft);
        socket.on('roomClosed', handleRoomClosed);
        socket.on('gameAction', handleGameAction);
        socket.on('playerSubmitted', handlePlayerSubmitted);
        socket.on('gameStateUpdate', handleGameStateUpdate);
        socket.on('opponentEchoes', handleOpponentEchoes);
        socket.on('replayPhase', handleReplayPhase);

        return () => {
          socket.off('playerLeft', handlePlayerLeft);
          socket.off('roomClosed', handleRoomClosed);
          socket.off('gameAction', handleGameAction);
          socket.off('playerSubmitted', handlePlayerSubmitted);
          socket.off('gameStateUpdate', handleGameStateUpdate);
          socket.off('opponentEchoes', handleOpponentEchoes);
          socket.off('replayPhase', handleReplayPhase);
        };
      }
    }
    
    // Return empty cleanup function if not multiplayer or no socket
    return () => {};
  }, [gameMode, navigate, searchParams]);

  // Add at the top, after other useState declarations
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Add this useEffect after multiplayer socket event useEffect
  useEffect(() => {
    if (gameMode === 'multiplayer') {
      const socket = socketService.getSocket();
      if (!socket) return;

      const handleDisconnect = () => {
        setIsReconnecting(true);
      };
      const handleReconnect = () => {
        setIsReconnecting(false);
        // Attempt to rejoin the room
        if (roomId && playerName && playerId) {
          socket.emit('joinRoom', { roomId, playerName, isHost, playerId });
        }
      };
      socket.on('disconnect', handleDisconnect);
      socket.on('reconnect', handleReconnect);
      return () => {
        socket.off('disconnect', handleDisconnect);
        socket.off('reconnect', handleReconnect);
      };
    }
  }, [gameMode, roomId, playerName, playerId, isHost]);

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
    // Don't dispatch ADD_ECHO here - wait for tile click
  };

  // Handle extend echo selection
  const handleExtendEcho = () => {
    setSelectionMode('extend-echo');
    // Don't dispatch ADD_ECHO here - wait for tile click
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
    dispatch({ type: 'SELECT_ECHO_FOR_EXTENSION', echo: extendedEcho });
  };

  const handleFinalizeEcho = (finalEcho: Echo) => {
    try {
      console.log('Finalizing echo:', finalEcho);
      console.log('Current state before finalize:', {
        echoes: state.echoes.map(e => ({ id: e.id, playerId: e.playerId, alive: e.alive })),
        currentPlayer: state.currentPlayer,
        phase: state.phase
      });
    
    // If startingPosition is missing, add it from position
    const echoWithStart = {
      ...finalEcho,
      startingPosition: (finalEcho as any).startingPosition || { ...finalEcho.position },
    };
    dispatch({ type: 'FINALIZE_ECHO', echo: echoWithStart });
    
    // Handle multiplayer submission
    if (gameMode === 'multiplayer') {
      // Send the finalized echo to the server (but don't add opponent's echo yet)
      if (roomId && playerId && playerName && currentPlayer) {
        const echoToSend = [echoWithStart]; // Send just this finalized echo
        console.log('Sending finalized echo to server:', echoToSend);
        socketService.sendGameState(roomId, playerId, playerName, currentPlayer, echoToSend);
      }
      
      // Track this player's submission
      const newSubmittedPlayers = new Set(submittedPlayers);
      newSubmittedPlayers.add(currentPlayer);
      setSubmittedPlayers(newSubmittedPlayers);
      
      // Set waiting state to prevent further actions
      setWaitingForOpponent(true);
      
      // Emit submission event to opponent
      const socket = socketService.getSocket();
      if (socket && roomId) {
        socket.emit('playerSubmitted', {
          roomId,
          playerId: currentPlayer,
          playerName,
          gamePlayerId: currentPlayer
        });
        console.log('Emitted playerSubmitted event for:', currentPlayer);
      }
      
      // Note: Backend will trigger replay phase when both players submit
      // No need to check submission count here anymore
    } else {
      // Original hotseat logic
      // Switch to the other player after finalizing an echo
      dispatch({ type: 'SWITCH_PLAYER' });
      
      // Check if both players have submitted before calling SUBMIT_TURN
      const newSubmittedPlayers = new Set([...state.submittedPlayers, finalEcho.playerId]);
      if (newSubmittedPlayers.has('player1') && newSubmittedPlayers.has('player2')) {
        dispatch({ type: 'SUBMIT_TURN', player: finalEcho.playerId });
      }
    }
    
    setSelectionMode('choosing'); // Reset selection mode
    } catch (error) {
      console.error('Error in handleFinalizeEcho:', error);
      captureGameError(error as Error, {
        gameMode,
        gameId: roomId || undefined,
        playerId: currentPlayer,
        action: 'finalize_echo',
        gameState: {
          echoes: state.echoes.length,
          phase: state.phase,
          turnNumber: state.turnNumber
        }
      });
    }
  };

  const handleReset = () => {
    dispatch({ type: 'RESET_GAME' });
    setSelectionMode('choosing');
  };

  const handleLeaveGame = () => {
    setShowLeaveModal(true);
  };

  const handleConfirmLeave = () => {
    console.log('GamePage handleConfirmLeave called');
    console.log('RoomId from URL:', roomId);
    console.log('PlayerId from URL:', playerId);
    
    if (roomId) {
      console.log('Calling socketService.leaveRoom from GamePage');
      socketService.leaveRoom(roomId, playerId || undefined);
    } else {
      console.log('No roomId found in GamePage, cannot leave room');
    }
    
    setShowLeaveModal(false);
    navigate('/home');
  };

  const handleCancelLeave = () => {
    setShowLeaveModal(false);
  };

  // Replay phase logic
  const [replayStates, setReplayStates] = useState<{ echoes: Echo[]; projectiles: SimProjectile[]; tick: number; destroyed: { echoId: string; by: PlayerId|null; position: { row: number; col: number }; playerId: PlayerId }[]; destroyedProjectiles: { id: string; type: 'projectile' | 'mine'; position: { row: number; col: number } }[]; collisions: { row: number; col: number }[]; shieldBlocks: { row: number; col: number; projectileDirection: Direction }[] }[]>([]);
  const [replayTick, setReplayTick] = useState(0);
  const replayTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentTickRef = useRef(0);

  useEffect(() => {
    if (state.phase === 'replay') {
      // In multiplayer mode, wait for opponent echoes before starting replay
      if (gameMode === 'multiplayer' && !receivedOpponentEchoes) {
        console.log('Waiting for opponent echoes before starting replay...');
        return;
      }
      
      console.log('Starting replay simulation with echoes:', state.echoes);
      const sim = simulateReplay(state.echoes.map(e => ({ ...e, startingPosition: { row: e.position.row, col: e.position.col } }) as Echo & { startingPosition: { row: number; col: number } }));
      
      // Log replay events for match logging
      sim.forEach((tickState, index) => {
        if (index === 0) {
          // Log initial state
          matchLogger.logTickStart(0, { ...state, echoes: tickState.echoes });
        } else {
          // Log each tick
          matchLogger.logTickStart(index, { ...state, echoes: tickState.echoes });
          
          // Log collisions
          tickState.collisions.forEach(collision => {
            matchLogger.logCollision(
              { id: 'collision', type: 'collision', player: 'unknown' },
              { id: 'collision', type: 'collision', player: 'unknown' },
              { row: collision.row, col: collision.col }
            );
          });
          
          // Log destroyed entities
          tickState.destroyed.forEach(destroyed => {
            const echo = state.echoes.find(e => e.id === destroyed.echoId);
            if (echo) {
              matchLogger.logEntityDestroyed(echo, 'collision');
            }
          });
          
          // Log shield blocks
          tickState.shieldBlocks.forEach(shieldBlock => {
            matchLogger.logCollision(
              { id: 'shield', type: 'shield', player: 'unknown' },
              { id: 'projectile', type: 'projectile', player: 'unknown' },
              { row: shieldBlock.row, col: shieldBlock.col }
            );
          });
          
          matchLogger.logTickEnd(index, { ...state, echoes: tickState.echoes });
        }
      });
      
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
  }, [state.phase, state.echoes, gameMode, receivedOpponentEchoes]);

  useEffect(() => {
    if (state.phase !== 'replay' || replayTick <= 0) return;
    const prev = replayStates[replayTick - 1] || { projectiles: [], shieldBlocks: [], collisions: [] };
    const curr = replayStates[replayTick] || { projectiles: [], shieldBlocks: [], collisions: [] };
    // Projectile firing sounds
    const prevIds = new Set(prev.projectiles.map(p => p.id));
    const newProjectiles = curr.projectiles.filter(p => p.type === 'projectile' && !prevIds.has(p.id));
    if (newProjectiles.length > 0) {
      playLaserSound();
      newProjectiles.slice(1).forEach((_, i) => {
        setTimeout(() => {
                      playLaserSound();
        }, (i + 1) * 100);
      });
    }
    // Shield block and collision sounds
    const prevShieldBlocks = prev.shieldBlocks || [];
    const currShieldBlocks = curr.shieldBlocks || [];
    const newShieldBlocks = currShieldBlocks.filter(
      sb => !prevShieldBlocks.some(psb => psb.row === sb.row && psb.col === sb.col && psb.projectileDirection.x === sb.projectileDirection.x && psb.projectileDirection.y === sb.projectileDirection.y)
    );
    newShieldBlocks.forEach((_, i) => {
      setTimeout(() => {
        playLaserSound();
      }, i * 80);
    });
    // Collision sounds (play for every collision in the current tick)
    const currCollisions = curr.collisions || [];
    currCollisions.forEach((_, i) => {
      setTimeout(() => {
        playLaserSound();
      }, i * 80);
    });
    // Echo destroyed sounds
    const prevDestroyed = prev.destroyed || [];
    const currDestroyed = curr.destroyed || [];
    const prevDestroyedIds = new Set(prevDestroyed.map(d => d.echoId));
    const newDestroyed = currDestroyed.filter(d => !prevDestroyedIds.has(d.echoId));
    newDestroyed.forEach((_, i) => {
      setTimeout(() => {
            playExplosion();
      }, i * 120);
    });
    // Shield activation sounds
    const prevEchoes = prev.echoes || [];
    const currEchoes = curr.echoes || [];
    currEchoes.forEach((echo, i) => {
      const prevEcho = prevEchoes.find(e => e.id === echo.id);
      if (prevEcho && !prevEcho.isShielded && echo.isShielded) {
        setTimeout(() => {
          playSound(audioSounds.forceField_000, 0.8);
        }, i * 80);
      }
    });
    // Dash action sounds
    currEchoes.forEach((echo, i) => {
      const prevEcho = prevEchoes.find(e => e.id === echo.id);
      if (
        prevEcho &&
        prevEcho.alive && echo.alive &&
        ((Math.abs(echo.position.row - prevEcho.position.row) === 2 && echo.position.col === prevEcho.position.col) ||
         (Math.abs(echo.position.col - prevEcho.position.col) === 2 && echo.position.row === prevEcho.position.row))
      ) {
        setTimeout(() => {
          playSound(audioSounds.doorOpen_002, 0.7);
        }, i * 80);
      }
    });
  }, [replayTick, state.phase, replayStates]);

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

  const isMobile = useIsMobile();

  if (state.phase === 'replay') {
    const current = replayStates[replayTick] || { echoes: state.echoes, projectiles: [], tick: 0, destroyed: [], destroyedProjectiles: [], collisions: [], shieldBlocks: [] };
    // Map SimProjectile to ProjectilePreview for Board
    const projectilePreviews = current.projectiles.map(p => ({ row: p.position.row, col: p.position.col, type: p.type, direction: p.direction }));
    return (
      <>
        <div style={{ 
          minHeight: '100vh', 
          background: '#000', 
          color: 'white', 
          fontFamily: 'Orbitron, monospace',
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          {isReconnecting && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              background: '#ffc107',
              color: '#222',
              textAlign: 'center',
              padding: '0.5rem',
              zIndex: 2000,
              fontWeight: 'bold',
              letterSpacing: '1px',
              boxShadow: '0 2px 8px #0002'
            }}>
              Reconnecting to game server...
            </div>
          )}
          {/* Home button */}
          {isMobile ? (
            <button
              onClick={() => { playClickSound(); handleLeaveGame(); }}
              style={{
                position: 'absolute',
                top: 4,
                left: 4,
                width: 28,
                height: 28,
                background: 'linear-gradient(145deg, #333, #444)',
                color: 'white',
                border: '2px solid #666',
                borderRadius: '50%',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontFamily: 'Orbitron, monospace',
                fontSize: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                zIndex: 1000
              }}
              aria-label="Home"
            >
              🏠
            </button>
          ) : (
          <button
            onClick={() => { playClickSound(); handleLeaveGame(); }}
            style={{
              position: 'absolute',
              top: 20,
              left: 20,
              background: 'linear-gradient(145deg, #333, #444)',
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
              playGlassImpact();
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
          )}
          
          
          {/* Main game content - centered container */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            maxWidth: '100%',
            margin: '0 auto',
            marginTop: isMobile && (gameMode === 'hotseat' || gameMode === 'ai') ? (state.phase === 'replay' ? '-15px' : '-30px') : 0,
            paddingTop: isMobile && (gameMode === 'hotseat' || gameMode === 'ai') ? 0 : 0,
            transform: `scale(${layoutScale})`,
            transformOrigin: 'center top',
            minHeight: layoutScale < 1 ? `${100 / layoutScale}vh` : 'auto'
          }}>
            
            {/* Game info panels - centered */}
            <div style={{ 
              width: '100%', 
              maxWidth: getBoardWidth(), 
              marginBottom: isMobile && (gameMode === 'hotseat' || gameMode === 'ai') ? '0.5rem' : '1rem',
              paddingLeft: isMobile && gameMode !== 'multiplayer' ? 32 : 0,
              paddingTop: isMobile && gameMode === 'multiplayer' ? 0 : (isMobile && (gameMode === 'hotseat' || gameMode === 'ai') ? 0 : (isMobile ? 10 : 0))
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: isMobile && gameMode === 'multiplayer' ? 4 : (isMobile && (gameMode === 'hotseat' || gameMode === 'ai') ? 4 : 8), 
                marginTop: isMobile && gameMode === 'multiplayer' ? 0 : undefined,
                paddingLeft: gameMode === 'multiplayer' ? 30 : 0 
              }}
                className={isMobile && (gameMode === 'hotseat' || gameMode === 'ai') ? 'scoreboard-mobile' : ''}>
                {gameMode === 'multiplayer' ? (
                  <>
                    <div style={{ 
                      color: '#ff9800', 
                      fontWeight: 'bold', 
                      textShadow: '0 0 1px #fff', 
                      textAlign: 'left', 
                      fontSize: isMobile ? 16 : 28 
                    }}>{playerNames.player1}: <b>{state.scores.player1}</b></div>
                    <div style={{ 
                      color: 'blue', 
                      fontWeight: 'bold', 
                      textShadow: '0 0 1px #fff', 
                      textAlign: 'right', 
                      fontSize: isMobile ? 16 : 28 
                    }}>{playerNames.player2}: <b>{state.scores.player2}</b></div>
                  </>
                ) : (
                  <>
                    <div style={{ 
                      color: '#ff9800', 
                      fontWeight: 'bold', 
                      textShadow: '0 0 1px #fff', 
                      textAlign: 'left', 
                      fontSize: isMobile ? 16 : 28 
                    }}>Player 1{isMobile && (gameMode === 'hotseat' || gameMode === 'ai') ? '' : ' (Orange)'}: <b>{state.scores.player1}</b></div>
                    <div style={{ 
                      color: 'blue', 
                      fontWeight: 'bold', 
                      textShadow: '0 0 1px #fff', 
                      textAlign: 'right', 
                      fontSize: isMobile ? 16 : 28 
                    }}>Player 2{isMobile && (gameMode === 'hotseat' || gameMode === 'ai') ? '' : ' (Blue)'}: <b>{state.scores.player2}</b></div>
                  </>
                )}
              </div>
              {/* Remove Current Turn title in multiplayer mode */}
              {gameMode !== 'multiplayer' && (
                <div style={{ 
                  textAlign: 'center', 
                  marginBottom: isMobile && (gameMode === 'hotseat' || gameMode === 'ai') ? 0 : 0 
                }}
                  className={isMobile && (gameMode === 'hotseat' || gameMode === 'ai') ? 'turn-title-mobile' : ''}>
                  <h2 style={{ 
                    color: currentPlayer === 'player1' ? '#ff9800' : 'blue', 
                    textShadow: '0 0 1px #fff', 
                    margin: isMobile && (gameMode === 'hotseat' || gameMode === 'ai') ? '0 0 4px 0' : 0, 
                    fontSize: 28, 
                    textDecoration: 'underline' 
                  }}>
                  Current Turn: {currentPlayer === 'player1' ? 'Player 1 (Orange)' : 'Player 2 (Blue)'}
                </h2>
              </div>
              )}
            </div>
            
            {/* Game board and controls - centered */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              width: '100%',
              height: isMobile && gameMode === 'multiplayer' && typeof window !== 'undefined' && window.innerWidth === 320 ? '350px' : undefined,
              marginTop: isMobile && gameMode === 'multiplayer' && typeof window !== 'undefined' && window.innerWidth === 320 && state.phase === 'replay' ? '-20px' : (isMobile && (gameMode === 'hotseat' || gameMode === 'ai') ? (state.phase === 'replay' ? '-13px' : '-20px') : 0)
            }}>
              <div style={{ position: 'relative',
                height: isMobile && gameMode === 'multiplayer' && typeof window !== 'undefined' && window.innerWidth === 320 ? '350px' : undefined }}>
                <GameInfoPanel
                  turnNumber={state.turnNumber}
                  phase="replay"
                  currentTick={current.tick}
                  replayStates={replayStates}
                  turnHistory={state.turnHistory}
                />
                <Board 
                  echoes={current.echoes} 
                  projectiles={projectilePreviews} 
                  collisions={current.collisions}
                  shieldBlocks={current.shieldBlocks}
                />
              </div>
            </div>
            
            {/* Reset button - centered */}
            {import.meta.env.DEV && (gameMode !== 'multiplayer' || state.phase === 'replay') && (
              <div style={{ 
                textAlign: 'center', 
                marginTop: isMobile && gameMode === 'multiplayer' && typeof window !== 'undefined' && window.innerWidth === 320 && state.phase === 'replay' ? '-18px' : (isMobile && (gameMode === 'hotseat' || gameMode === 'ai') ? '0.25rem' : (isMobile && gameMode === 'multiplayer' && state.phase === 'replay' ? '0.1rem' : '1rem')), 
                marginBottom: isMobile && (gameMode === 'hotseat' || gameMode === 'ai') ? '0.5rem' : (isMobile && gameMode === 'multiplayer' && state.phase === 'replay' ? '0.3rem' : '1rem') 
              }}>
              <button 
                onClick={() => { playClickSound(); handleReset(); }}
                style={{
                  position: 'relative',
                  background: 'linear-gradient(145deg, #f4433620, #f4433640)',
                  color: 'white',
                  border: '2px solid #f44336',
                  padding: isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? '4px 8px' : (isMobile ? '6px 12px' : '10px 20px'),
                  fontSize: isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? '0.7rem' : (isMobile ? '0.8rem' : '1rem'),
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontFamily: 'Orbitron, monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
                  zIndex: 1000,
                  minHeight: isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? 0 : undefined,
                  minWidth: isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? 0 : undefined,
                }}
                onMouseEnter={(e) => {
                  playGlassImpact();
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 4px 16px #f4433660, inset 0 1px 0 #f4433680';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 0 8px #f4433640, inset 0 1px 0 #f4433660';
                }}
              >
                  🔄 Reset
              </button>
              </div>
            )}
            
            {/* Replay and Next buttons - always visible */}
            <div style={{ 
              textAlign: 'center', 
              marginTop: isMobile && gameMode === 'multiplayer' && typeof window !== 'undefined' && window.innerWidth === 320 && state.phase === 'replay' ? '-18px' : (isMobile && (gameMode === 'hotseat' || gameMode === 'ai') ? '0.25rem' : (isMobile && gameMode === 'multiplayer' && state.phase === 'replay' ? '0.1rem' : '1rem')), 
              marginBottom: isMobile && (gameMode === 'hotseat' || gameMode === 'ai') ? '0.5rem' : (isMobile && gameMode === 'multiplayer' && state.phase === 'replay' ? '0.3rem' : '1rem') 
            }}>
              <button 
                onClick={() => { playClickSound(); handleReplay(); }}
                style={{
                  position: 'relative',
                  background: 'linear-gradient(145deg, #2196F320, #2196F340)',
                  color: 'white',
                  border: '2px solid #2196F3',
                  padding: isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? '4px 8px' : (isMobile ? '6px 12px' : '10px 20px'),
                  fontSize: isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? '0.7rem' : (isMobile ? '0.8rem' : '1rem'),
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontFamily: 'Orbitron, monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 0 8px #2196F340, inset 0 1px 0 #2196F360',
                  textShadow: '0 0 4px #2196F3',
                  marginRight: isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? '2px' : (isMobile ? '4px' : '8px'),
                  minHeight: isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? 0 : undefined,
                  minWidth: isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? 0 : undefined,
                }}
                onMouseEnter={(e) => {
                  playGlassImpact();
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
                onClick={() => { playClickSound(); handleNextTurn(); }}
                style={{
                  position: 'relative',
                  background: 'linear-gradient(145deg, #4CAF5020, #4CAF5040)',
                  color: 'white',
                  border: '2px solid #4CAF50',
                  padding: isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? '4px 8px' : (isMobile ? '6px 12px' : '10px 20px'),
                  fontSize: isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? '0.7rem' : (isMobile ? '0.8rem' : '1rem'),
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontFamily: 'Orbitron, monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 0 8px #4CAF5040, inset 0 1px 0 #4CAF5060',
                  textShadow: '0 0 4px #4CAF50',
                  minHeight: isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? 0 : undefined,
                  minWidth: isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? 0 : undefined,
                }}
                onMouseEnter={(e) => {
                  playGlassImpact();
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 4px 16px #4CAF5060, inset 0 1px 0 #4CAF5080';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 0 8px #4CAF5040, inset 0 1px 0 #4CAF5060';
                }}
              >
                  ⏭️ Next
              </button>
            </div>
          </div>
        </div>
        
        <LeaveConfirmationModal
          isOpen={showLeaveModal}
          onConfirm={handleConfirmLeave}
          onCancel={handleCancelLeave}
          title="Leave Game?"
          message="Leaving will end your game session. Are you sure you want to continue?"
        />
      </>
    );
  }

  // Game Over Phase
  if (state.phase === 'gameOver') {
    const winner = state.winner;
    const finalScores = state.scores;
    const player1Echoes = state.echoes.filter(e => e.playerId === 'player1' && e.alive);
    const player2Echoes = state.echoes.filter(e => e.playerId === 'player2' && e.alive);
    
    // End match logging when game is over
    if (winner && matchLogger.isActive()) {
      const winCondition = determineWinCondition(winner, finalScores, player1Echoes, player2Echoes);
      matchLogger.endMatch(winner, winCondition, finalScores, state);
    }
    
    return (
      <>
        <div style={{ 
          minHeight: '100vh', 
          background: '#000', 
          color: 'white', 
          fontFamily: 'Orbitron, monospace',
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          {isReconnecting && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              background: '#ffc107',
              color: '#222',
              textAlign: 'center',
              padding: '0.5rem',
              zIndex: 2000,
              fontWeight: 'bold',
              letterSpacing: '1px',
              boxShadow: '0 2px 8px #0002'
            }}>
              Reconnecting to game server...
            </div>
          )}
          {/* Home button */}
          {isMobile ? (
            <button
              onClick={() => { playClickSound(); handleLeaveGame(); }}
              style={{
                position: 'absolute',
                top: 4,
                left: 4,
                width: 28,
                height: 28,
                background: 'linear-gradient(145deg, #333, #444)',
                color: 'white',
                border: '2px solid #666',
                borderRadius: '50%',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontFamily: 'Orbitron, monospace',
                fontSize: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                zIndex: 1000
              }}
              aria-label="Home"
            >
              🏠
            </button>
          ) : (
          <button
            onClick={() => { playClickSound(); handleLeaveGame(); }}
            style={{
              position: 'absolute',
              top: 20,
              left: 20,
              background: 'linear-gradient(145deg, #333, #444)',
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
              playGlassImpact();
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
          )}
           
          {/* Main game content - centered container */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            maxWidth: '100%',
            margin: '0 auto',
            transform: `scale(${layoutScale})`,
            transformOrigin: 'center top',
            minHeight: layoutScale < 1 ? `${100 / layoutScale}vh` : 'auto'
          }}>
            
            {/* Game info panels - centered */}
            <div style={{ width: '100%', maxWidth: getBoardWidth(), marginBottom: '1rem' }}>
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
                  onClick={() => { playClickSound(); handleReset(); }}
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
                        {state.turnHistory.slice().reverse().map((entry, _index) => (
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
          </div>
        </div>
        
        <LeaveConfirmationModal
          isOpen={showLeaveModal}
          onConfirm={handleConfirmLeave}
          onCancel={handleCancelLeave}
          title="Leave Game?"
          message="Leaving will end your game session. Are you sure you want to continue?"
        />
      </>
    );
  }

  return (
    <>
      <div style={{ 
        minHeight: '100vh', 
        background: '#000', 
        color: 'white', 
        fontFamily: 'Orbitron, monospace',
        padding: '20px',
        boxSizing: 'border-box'
      }}>
        {isReconnecting && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            background: '#ffc107',
            color: '#222',
            textAlign: 'center',
            padding: '0.5rem',
            zIndex: 2000,
            fontWeight: 'bold',
            letterSpacing: '1px',
            boxShadow: '0 2px 8px #0002'
          }}>
            Reconnecting to game server...
          </div>
        )}
        {/* Home button */}
        {isMobile ? (
          <button
            onClick={() => { playClickSound(); handleLeaveGame(); }}
            style={{
              position: 'absolute',
              top: 4,
              left: 4,
              width: 28,
              height: 28,
              background: 'linear-gradient(145deg, #333, #444)',
              color: 'white',
              border: '2px solid #666',
              borderRadius: '50%',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontFamily: 'Orbitron, monospace',
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              zIndex: 1000
            }}
            aria-label="Home"
          >
            🏠
          </button>
        ) : (
        <button
          onClick={() => { playClickSound(); handleLeaveGame(); }}
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            background: 'linear-gradient(145deg, #333, #444)',
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
            playGlassImpact();
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
        )}
                
        {/* Main game content - centered container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: '100%',
            margin: '0 auto',
            marginTop: isMobile && gameMode === 'multiplayer' ? 0 : (isMobile && (gameMode === 'hotseat' || gameMode === 'ai') ? (state.phase === 'input' ? '-30px' : '-15px') : 0),
            paddingTop: isMobile && gameMode === 'multiplayer' ? 0 : (isMobile && (gameMode === 'hotseat' || gameMode === 'ai') ? 0 : 0),
            transform: `scale(${layoutScale})`,
            transformOrigin: 'center top',
            minHeight: layoutScale < 1 ? `${100 / layoutScale}vh` : 'auto'
          }}
        >
          
          {/* Game info panels - centered */}
          <div style={{ 
            width: '100%', 
            maxWidth: getBoardWidth(), 
            marginBottom: isMobile && gameMode === 'multiplayer' ? 0 : '1rem',
            paddingLeft: isMobile && gameMode !== 'multiplayer' ? 32 : 0,
            paddingTop: isMobile && gameMode === 'multiplayer' ? 0 : (isMobile ? 10 : 0)
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: isMobile && gameMode === 'multiplayer' ? 0 : 8, 
              paddingLeft: gameMode === 'multiplayer' ? 30 : 0 
            }}
              className={isMobile && (gameMode === 'hotseat' || gameMode === 'ai') ? 'scoreboard-mobile' : ''}>
              {gameMode === 'multiplayer' ? (
                <>
                  <div style={{ 
                    color: '#ff9800', 
                    fontWeight: 'bold', 
                    textShadow: '0 0 1px #fff', 
                    textAlign: 'left', 
                    fontSize: isMobile ? 16 : 28 
                  }}>{playerNames.player1}: <b>{state.scores.player1}</b></div>
                  <div style={{ 
                    color: 'blue', 
                    fontWeight: 'bold', 
                    textShadow: '0 0 1px #fff', 
                    textAlign: 'right', 
                    fontSize: isMobile ? 16 : 28 
                  }}>{playerNames.player2}: <b>{state.scores.player2}</b></div>
                </>
              ) : (
                <>
                  <div style={{ 
                    color: '#ff9800', 
                    fontWeight: 'bold', 
                    textShadow: '0 0 1px #fff', 
                    textAlign: 'left', 
                    fontSize: isMobile ? 16 : 28 
                  }}>Player 1{isMobile ? '' : ' (Orange)'}: <b>{state.scores.player1}</b></div>
                  <div style={{ 
                    color: 'blue', 
                    fontWeight: 'bold', 
                    textShadow: '0 0 1px #fff', 
                    textAlign: 'right', 
                    fontSize: isMobile ? 16 : 28 
                  }}>Player 2{isMobile ? '' : ' (Blue)'}: <b>{state.scores.player2}</b></div>
                </>
              )}
            </div>
            {/* Remove Current Turn title in multiplayer mode */}
            {gameMode !== 'multiplayer' && (
              <div style={{ textAlign: 'center', marginBottom: 0 }}
                className={isMobile && (gameMode === 'hotseat' || gameMode === 'ai') ? 'turn-title-mobile' : ''}>
              <h2 style={{ color: currentPlayer === 'player1' ? '#ff9800' : 'blue', textShadow: '0 0 1px #fff', margin: 0, fontSize: 28, textDecoration: 'underline' }}>
                Current Turn: {currentPlayer === 'player1' ? 'Player 1 (Orange)' : 'Player 2 (Blue)'}
              </h2>
            </div>
            )}
          </div>
          
          {/* Game board and controls - centered */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            width: '100%',
            height: isMobile && gameMode === 'multiplayer' && typeof window !== 'undefined' && window.innerWidth === 320 ? '350px' : undefined,
            marginTop: isMobile && (gameMode === 'hotseat' || gameMode === 'ai') ? (state.phase === 'input' ? '-20px' : '-13px') : 0
          }}>
            <div style={{ position: 'relative',
              height: isMobile && gameMode === 'multiplayer' && typeof window !== 'undefined' && window.innerWidth === 320 ? '350px' : undefined }}>
              {state.pendingEcho ? (
                <div style={{ position: 'relative' }}>
                  <GameInfoPanel
                    turnNumber={state.turnNumber}
                    phase="input"
                    currentTick={state.currentTick}
                    replayStates={[]}
                    turnHistory={state.turnHistory}
                  />
                  <EchoActionAssignment 
                    pendingEcho={state.pendingEcho} 
                    onComplete={handleFinalizeEcho} 
                    allEchoes={state.echoes}
                    gameMode={gameMode}
                  />
                </div>
              ) : (selectionMode === 'choosing' && playerEchoes.length > 0) ? (
                <div style={{ position: 'relative' }}>
                  <GameInfoPanel
                    turnNumber={state.turnNumber}
                    phase="input"
                    currentTick={state.currentTick}
                    replayStates={[]}
                    turnHistory={state.turnHistory}
                  />
                  {!(gameMode === 'multiplayer' && waitingForOpponent) && (
                  <EchoSelection 
                    currentPlayer={currentPlayer}
                    existingEchoes={state.echoes}
                    onNewEcho={withClickSound(handleNewEcho)}
                    onExtendEcho={withClickSound(handleExtendEcho)}
                    disabled={gameMode === 'multiplayer' && waitingForOpponent}
                  />
                  )}
                  {gameMode === 'multiplayer' && waitingForOpponent && (
                    <div style={{
                      background: 'rgba(255, 193, 7, 0.2)',
                      border: '2px solid #ffc107',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginTop: '1rem',
                      textAlign: 'center',
                      color: '#ffc107',
                      fontWeight: 'bold'
                    }}>
                      ⏳ Waiting for opponent to submit their turn...
                    </div>
                  )}
                  <Board 
                    echoes={state.echoes} 
                    highlightedTiles={boardHighlightedTiles}
                    onTileClick={boardOnTileClick ? withClickSound(boardOnTileClick) : undefined}
                  />
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <GameInfoPanel
                    turnNumber={state.turnNumber}
                    phase="input"
                    currentTick={state.currentTick}
                    replayStates={[]}
                    turnHistory={state.turnHistory}
                  />
                  <Board 
                    echoes={state.echoes} 
                    highlightedTiles={boardHighlightedTiles}
                    onTileClick={boardOnTileClick ? withClickSound(boardOnTileClick) : undefined}
                  />
                  <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    {playerEchoes.length > 0 && (
                      <button
                        onClick={() => { playClickSound(); handleBackFromTileSelection(); }}
                        style={{
                          position: 'relative',
                          background: 'linear-gradient(145deg, #66620, #66640)',
                          color: 'white',
                          border: '2px solid #666',
                          padding: isMobile && (gameMode === 'hotseat' || gameMode === 'ai') ? '4px 8px' : '10px 20px',
                          fontSize: isMobile && (gameMode === 'hotseat' || gameMode === 'ai') ? '0.7rem' : '1rem',
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
                          playGlassImpact();
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
            </div>
          </div>
          
          {/* Reset button - centered - hidden in main game flow */}
          {false && gameMode !== 'multiplayer' && (
            <div style={{ 
              textAlign: 'center', 
              marginTop: (selectionMode === 'new-echo' && playerEchoes.length === 0) ? '-20px' : 
                         (selectionMode === 'new-echo' || selectionMode === 'extend-echo') ? '0px' : 
                         (isMobile && (gameMode === 'hotseat' || gameMode === 'ai') ? '0.25rem' : '1rem'), 
              marginBottom: isMobile && (gameMode === 'hotseat' || gameMode === 'ai') ? '0.5rem' : '1rem' 
            }}>
            <button 
              onClick={() => { playClickSound(); handleReset(); }}
              style={{
                position: 'relative',
                background: 'linear-gradient(145deg, #f4433620, #f4433640)',
                color: 'white',
                border: '2px solid #f44336',
                  padding: isMobile && (gameMode === 'hotseat' || gameMode === 'ai') ? '6px 12px' : '10px 20px',
                  fontSize: isMobile && (gameMode === 'hotseat' || gameMode === 'ai') ? '0.8rem' : '1rem',
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
                🔄 Reset
              </button>
              <button 
                onClick={() => { playClickSound(); handleReplay(); }}
                style={{
                  position: 'relative',
                  background: 'linear-gradient(145deg, #2196F320, #2196F340)',
                  color: 'white',
                  border: '2px solid #2196F3',
                  padding: isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? '4px 8px' : (isMobile ? '6px 12px' : '10px 20px'),
                  fontSize: isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? '0.7rem' : (isMobile ? '0.8rem' : '1rem'),
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontFamily: 'Orbitron, monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 0 8px #2196F340, inset 0 1px 0 #2196F360',
                  textShadow: '0 0 4px #2196F3',
                  marginRight: isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? '2px' : (isMobile ? '4px' : '8px'),
                  minHeight: isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? 0 : undefined,
                  minWidth: isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? 0 : undefined,
                }}
                onMouseEnter={(e) => {
                  playGlassImpact();
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
                onClick={() => { playClickSound(); handleNextTurn(); }}
                style={{
                  position: 'relative',
                  background: 'linear-gradient(145deg, #4CAF5020, #4CAF5040)',
                  color: 'white',
                  border: '2px solid #4CAF50',
                  padding: isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? '4px 8px' : (isMobile ? '6px 12px' : '10px 20px'),
                  fontSize: isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? '0.7rem' : (isMobile ? '0.8rem' : '1rem'),
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontFamily: 'Orbitron, monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 0 8px #4CAF5040, inset 0 1px 0 #4CAF5060',
                  textShadow: '0 0 4px #4CAF50',
                  minHeight: isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? 0 : undefined,
                  minWidth: isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? 0 : undefined,
                }}
                onMouseEnter={(e) => {
                  playGlassImpact();
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 4px 16px #4CAF5060, inset 0 1px 0 #4CAF5080';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 0 8px #4CAF5040, inset 0 1px 0 #4CAF5060';
                }}
              >
                ⏭️ Next
            </button>
          </div>
          )}
          

        </div>
      </div>
      
      <LeaveConfirmationModal
        isOpen={showLeaveModal}
        onConfirm={handleConfirmLeave}
        onCancel={handleCancelLeave}
        title="Leave Game?"
        message="Leaving will end your game session. Are you sure you want to continue?"
      />
    </>
  );
};

export default GamePage; 
