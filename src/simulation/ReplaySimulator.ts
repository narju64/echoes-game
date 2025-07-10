import type { Echo, Direction, PlayerId } from '../types/gameTypes';

export interface SimProjectile {
  id: string;
  position: { row: number; col: number };
  direction: Direction;
  type: 'projectile' | 'mine';
  alive: boolean;
}

export interface ReplayState {
  echoes: Echo[];
  projectiles: SimProjectile[];
  tick: number;
  destroyed: { echoId: string; by: PlayerId | null; position: { row: number; col: number }; playerId: PlayerId }[];
  destroyedProjectiles: { id: string; type: 'projectile' | 'mine'; position: { row: number; col: number } }[];
  collisions: { row: number; col: number }[];
  shieldBlocks: { row: number; col: number; projectileDirection: Direction }[];
}

function deepCopyEcho(e: Echo): Echo {
  return {
    ...e,
    position: { ...e.position },
    instructionList: e.instructionList.map(action => ({ ...action, direction: { ...action.direction } })),
    shieldDirection: e.shieldDirection ? { ...e.shieldDirection } : undefined,
  };
}

// Simulate the replay phase, returning an array of replay states for each tick
export function simulateReplay(echoes: (Echo & { startingPosition: { row: number; col: number } })[]): ReplayState[] {
  const states: ReplayState[] = [];
  
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

    let destroyedThisTick: { echoId: string; by: PlayerId | null; position: { row: number; col: number }; playerId: PlayerId }[] = [];
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