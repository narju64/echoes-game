import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useReducer, useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { initialGameState, gameReducer } from '../game/gameState';
import Board from '../components/Board';
import EchoActionAssignment from '../components/EchoActionAssignment';
import EchoSelection from '../components/EchoSelection';
import EchoActionPreviewBoard from '../components/EchoActionPreviewBoard';
import EchoActionSidebar from '../components/EchoActionSidebar';
import GameInfoPanel from '../components/GameInfoPanel';
import AITrainingPanel from '../components/AITrainingPanel';
const getHomeRow = (playerId) => (playerId === 'player1' ? 0 : 7);
// Function to get column letter from column number
const getColumnLetter = (col) => {
    return String.fromCharCode(65 + col); // A, B, C, etc.
};
const getRowNumber = (row) => {
    return (8 - row).toString(); // 8, 7, 6, etc. (top to bottom)
};
const getBoardPosition = (row, col) => {
    return `${getColumnLetter(col)}${getRowNumber(row)}`;
};
const getDirectionName = (direction) => {
    const { x, y } = direction;
    if (x === 0 && y === 1)
        return 'N';
    if (x === 1 && y === 1)
        return 'NE';
    if (x === 1 && y === 0)
        return 'E';
    if (x === 1 && y === -1)
        return 'SE';
    if (x === 0 && y === -1)
        return 'S';
    if (x === -1 && y === -1)
        return 'SW';
    if (x === -1 && y === 0)
        return 'W';
    if (x === -1 && y === 1)
        return 'NW';
    return `(${x}, ${y})`; // fallback for unexpected directions
};
// Function to generate echo names based on creation order and starting column
const generateEchoNames = (echoes) => {
    const nameMap = new Map();
    let newEchoCount = 0;
    echoes.forEach(echo => {
        const startPos = echo.startingPosition || echo.position;
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
// Deep copy utility
function deepCopyEcho(e) {
    return {
        ...e,
        position: { ...e.position },
        instructionList: [...e.instructionList],
        shieldDirection: e.shieldDirection ? { ...e.shieldDirection } : undefined,
    };
}
// Simulate the replay phase, returning an array of { echoes, projectiles, mines, tick, destroyed: { echoId, by: PlayerId|null }[], collisions: { row, col }[] } for each tick
function simulateReplay(echoes) {
    const states = [];
    let currentEchoes = echoes.map(e => ({
        ...deepCopyEcho(e),
        position: { ...e.startingPosition },
        alive: true,
    }));
    let projectiles = [];
    let mines = [];
    let nextProjectileId = 1;
    // Track shield state at the end of each tick
    const shieldStateAtEndOfTick = new Map();
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
    const SHIELD_BLOCKS = {
        '0,1': [{ x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 }], // N
        '1,0': [{ x: 1, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 }], // E
        '0,-1': [{ x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 }], // S
        '-1,0': [{ x: -1, y: -1 }, { x: -1, y: 0 }, { x: -1, y: 1 }], // W
        '1,1': [{ x: 1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 0 }], // NE
        '1,-1': [{ x: 1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: 0 }], // SE
        '-1,-1': [{ x: -1, y: -1 }, { x: 0, y: -1 }, { x: -1, y: 0 }], // SW
        '-1,1': [{ x: -1, y: 1 }, { x: 0, y: 1 }, { x: -1, y: 0 }], // NW
    };
    let tick = 1;
    while (true) {
        // Calculate maximum remaining actions among alive echoes
        const maxRemainingActions = Math.max(...currentEchoes.map((e) => {
            if (!e.alive)
                return 0;
            const originalEcho = echoes.find(origEcho => origEcho.id === e.id);
            if (!originalEcho)
                return 0;
            const actionsUsed = tick - 1; // Actions used so far
            const remainingActions = Math.max(0, originalEcho.instructionList.length - actionsUsed);
            return remainingActions;
        }), 0);
        // If no alive echoes have actions remaining, stop the replay
        if (maxRemainingActions === 0) {
            break;
        }
        let destroyedThisTick = [];
        let destroyedProjectilesThisTick = [];
        let collisionsThisTick = [];
        let shieldBlocksThisTick = [];
        // 1. Move projectiles
        projectiles = projectiles
            .filter(p => p.alive)
            .map(p => ({ ...p, position: { row: p.position.row + p.direction.y, col: p.position.col + p.direction.x } }));
        // 2. Move echoes and spawn new projectiles/mines
        currentEchoes = currentEchoes.map((e) => {
            // Find the original echo by ID to get the correct action
            const originalEcho = echoes.find(origEcho => origEcho.id === e.id);
            if (!originalEcho)
                return deepCopyEcho(e);
            const action = originalEcho.instructionList[tick - 1];
            // If no action for this tick:
            if (!action) {
                // Check if shield was active at the end of the previous tick
                const previousShieldState = shieldStateAtEndOfTick.get(e.id);
                if (previousShieldState && previousShieldState.isShielded) {
                    return { ...e, isShielded: true, shieldDirection: { ...previousShieldState.shieldDirection } };
                }
                else {
                    return { ...deepCopyEcho(e), isShielded: false, shieldDirection: undefined };
                }
            }
            if (!e.alive)
                return deepCopyEcho(e);
            if (action.type === 'walk') {
                return { ...e, position: { row: e.position.row + action.direction.y, col: e.position.col + action.direction.x }, isShielded: false, shieldDirection: undefined };
            }
            else if (action.type === 'dash') {
                return { ...e, position: { row: e.position.row + action.direction.y * 2, col: e.position.col + action.direction.x * 2 }, isShielded: false, shieldDirection: undefined };
            }
            else if (action.type === 'fire') {
                projectiles.push({
                    id: `p${nextProjectileId++}`,
                    position: { row: e.position.row + action.direction.y, col: e.position.col + action.direction.x },
                    direction: { ...action.direction },
                    type: 'projectile',
                    alive: true,
                });
                return { ...deepCopyEcho(e), isShielded: false, shieldDirection: undefined };
            }
            else if (action.type === 'mine') {
                mines.push({
                    id: `m${nextProjectileId++}`,
                    position: { row: e.position.row + action.direction.y, col: e.position.col + action.direction.x },
                    direction: { ...action.direction },
                    type: 'mine',
                    alive: true,
                });
                return { ...deepCopyEcho(e), isShielded: false, shieldDirection: undefined };
            }
            else if (action.type === 'shield') {
                return { ...e, isShielded: true, shieldDirection: { ...action.direction } };
            }
            else {
                return { ...deepCopyEcho(e), isShielded: false, shieldDirection: undefined };
            }
        });
        // 3. Add mines to projectiles for collision detection
        const allProjectiles = [...projectiles, ...mines];
        // 4. Collision detection (robust, with shield logic):
        const entityMap = new Map();
        currentEchoes.forEach(e => {
            if (!e.alive)
                return;
            const key = `${e.position.row},${e.position.col}`;
            if (!entityMap.has(key))
                entityMap.set(key, []);
            entityMap.get(key).push({ type: 'echo', id: e.id });
        });
        allProjectiles.forEach(p => {
            if (!p.alive)
                return;
            const key = `${p.position.row},${p.position.col}`;
            if (!entityMap.has(key))
                entityMap.set(key, []);
            entityMap.get(key).push({ type: p.type, id: p.id });
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
                            if (!proj)
                                return;
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
                                }
                                else {
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
                            }
                            else {
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
                }
                else {
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
                        }
                        else {
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
function simulateAllyPreviewAtTick(allEchoes, currentPlayer, targetTick) {
    // Filter for ally echoes only
    const allyEchoes = allEchoes
        .filter(e => e.playerId === currentPlayer && e.alive)
        .map(e => ({
        ...deepCopyEcho(e),
        position: { ...e.position },
        alive: true,
    }));
    let currentEchoes = allyEchoes;
    let projectiles = [];
    let mines = [];
    let nextProjectileId = 1;
    // Track shield state at the end of each tick
    const shieldStateAtEndOfTick = new Map();
    // Simulate up to the target tick
    for (let tick = 1; tick <= targetTick; tick++) {
        // 1. Move projectiles
        projectiles = projectiles
            .filter(p => p.alive)
            .map(p => ({ ...p, position: { row: p.position.row + p.direction.y, col: p.position.col + p.direction.x } }));
        // 2. Move echoes and spawn new projectiles/mines
        currentEchoes = currentEchoes.map((e) => {
            const originalEcho = allEchoes.find(origEcho => origEcho.id === e.id);
            if (!originalEcho)
                return deepCopyEcho(e);
            const action = originalEcho.instructionList[tick - 1];
            if (!action) {
                // Check if shield was active at the end of the previous tick
                const previousShieldState = shieldStateAtEndOfTick.get(e.id);
                if (previousShieldState && previousShieldState.isShielded) {
                    return { ...e, isShielded: true, shieldDirection: { ...previousShieldState.shieldDirection } };
                }
                else {
                    return { ...deepCopyEcho(e), isShielded: false, shieldDirection: undefined };
                }
            }
            if (!e.alive)
                return deepCopyEcho(e);
            if (action.type === 'walk') {
                return { ...e, position: { row: e.position.row + action.direction.y, col: e.position.col + action.direction.x }, isShielded: false, shieldDirection: undefined };
            }
            else if (action.type === 'dash') {
                return { ...e, position: { row: e.position.row + action.direction.y * 2, col: e.position.col + action.direction.x * 2 }, isShielded: false, shieldDirection: undefined };
            }
            else if (action.type === 'fire') {
                projectiles.push({
                    id: `p${nextProjectileId++}`,
                    position: { row: e.position.row + action.direction.y, col: e.position.col + action.direction.x },
                    direction: { ...action.direction },
                    type: 'projectile',
                    alive: true,
                });
                return { ...deepCopyEcho(e), isShielded: false, shieldDirection: undefined };
            }
            else if (action.type === 'mine') {
                mines.push({
                    id: `m${nextProjectileId++}`,
                    position: { row: e.position.row + action.direction.y, col: e.position.col + action.direction.x },
                    direction: { ...action.direction },
                    type: 'mine',
                    alive: true,
                });
                return { ...deepCopyEcho(e), isShielded: false, shieldDirection: undefined };
            }
            else if (action.type === 'shield') {
                return { ...e, isShielded: true, shieldDirection: { ...action.direction } };
            }
            else {
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
function generateEventLogFromReplayStates(replayStates) {
    const events = [];
    if (!replayStates || replayStates.length === 0)
        return events;
    // Group events by tick
    const eventsByTick = new Map();
    replayStates.forEach((state, tickIndex) => {
        const tick = state.tick;
        const tickEvents = [];
        // Process destroyed echoes with their positions
        const destroyedEchoesByPosition = new Map();
        state.destroyed.forEach((destroyed) => {
            const posKey = `${destroyed.position.row},${destroyed.position.col}`;
            const existing = destroyedEchoesByPosition.get(posKey);
            if (existing) {
                if (destroyed.playerId === 'player1') {
                    existing.orangeCount++;
                }
                else {
                    existing.blueCount++;
                }
            }
            else {
                destroyedEchoesByPosition.set(posKey, {
                    blueCount: destroyed.playerId === 'player2' ? 1 : 0,
                    orangeCount: destroyed.playerId === 'player1' ? 1 : 0
                });
            }
        });
        // Process destroyed projectiles with their positions
        const destroyedProjectilesByPosition = new Map();
        state.destroyedProjectiles.forEach((destroyed) => {
            const posKey = `${destroyed.position.row},${destroyed.position.col}`;
            const existing = destroyedProjectilesByPosition.get(posKey);
            if (existing) {
                if (destroyed.type === 'projectile') {
                    existing.projectiles++;
                }
                else {
                    existing.mines++;
                }
            }
            else {
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
                const hasShieldBlock = state.shieldBlocks.some((block) => block.row === row && block.col === col);
                let adjustedProjectiles = projectileData.projectiles;
                let adjustedMines = projectileData.mines;
                if (hasShieldBlock && adjustedProjectiles > 0) {
                    adjustedProjectiles -= 1; // Subtract 1 projectile that was blocked
                }
                // Determine what destroyed the echo
                let destroyer = '';
                if (adjustedProjectiles > 0 && adjustedMines > 0) {
                    destroyer = 'projectile and mine';
                }
                else if (adjustedProjectiles > 0) {
                    destroyer = 'projectile';
                }
                else if (adjustedMines > 0) {
                    destroyer = 'mine';
                }
                // Build echo description
                let echoDescription = '';
                if (echoData.blueCount > 0 && echoData.orangeCount > 0) {
                    echoDescription = `${echoData.blueCount} Blue and ${echoData.orangeCount} Orange echo${echoData.blueCount + echoData.orangeCount > 1 ? 's' : ''} destroyed by ${destroyer}`;
                }
                else if (echoData.blueCount > 0) {
                    echoDescription = `${echoData.blueCount} Blue echo${echoData.blueCount > 1 ? 's' : ''} destroyed by ${destroyer}`;
                }
                else if (echoData.orangeCount > 0) {
                    echoDescription = `${echoData.orangeCount} Orange echo${echoData.orangeCount > 1 ? 's' : ''} destroyed by ${destroyer}`;
                }
                eventDescription = `Tick ${tick} - ${echoDescription} at ${boardPos}`;
            }
            else if (echoData) {
                // Only echoes destroyed (echo vs echo collision)
                let echoDescription = '';
                if (echoData.blueCount > 0 && echoData.orangeCount > 0) {
                    echoDescription = `${echoData.blueCount} Blue and ${echoData.orangeCount} Orange echo${echoData.blueCount + echoData.orangeCount > 1 ? 's' : ''} destroyed`;
                }
                else if (echoData.blueCount > 0) {
                    echoDescription = `${echoData.blueCount} Blue echo${echoData.blueCount > 1 ? 's' : ''} destroyed`;
                }
                else if (echoData.orangeCount > 0) {
                    echoDescription = `${echoData.orangeCount} Orange echo${echoData.orangeCount > 1 ? 's' : ''} destroyed`;
                }
                eventDescription = `Tick ${tick} - ${echoDescription} at ${boardPos}`;
            }
            else if (projectileData) {
                // Only projectiles destroyed (projectile vs projectile collision)
                // Check if there's a shield block at this location and adjust projectile count
                const hasShieldBlock = state.shieldBlocks.some((block) => block.row === row && block.col === col);
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
        state.shieldBlocks.forEach((block) => {
            const boardPos = getBoardPosition(block.row, block.col);
            // Find which player's echo is at this location to determine the shield owner
            const shieldedEcho = state.echoes.find((echo) => echo.position.row === block.row && echo.position.col === block.col);
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
            const getTilePosition = (event) => {
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
            if (isShieldBlockA && !isShieldBlockB)
                return -1;
            if (!isShieldBlockA && isShieldBlockB)
                return 1;
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
const GamePage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    // Extract mode from URL parameters, default to 'hotseat'
    const modeParam = searchParams.get('mode');
    const [gameMode, setGameMode] = useState(modeParam || 'hotseat');
    const [state, dispatch] = useReducer(gameReducer, initialGameState);
    const [selectionMode, setSelectionMode] = useState('choosing');
    const currentPlayer = state.currentPlayer;
    const homeRow = getHomeRow(currentPlayer);
    // Find unoccupied home row tiles
    const highlightedTiles = Array.from({ length: 8 })
        .map((_, col) => ({ row: homeRow, col }))
        .filter(tile => !state.echoes.some(e => {
        const startPos = e.startingPosition || e.position;
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
    // Update gameMode when URL parameter changes
    useEffect(() => {
        const newModeParam = searchParams.get('mode');
        console.log('URL searchParams:', searchParams.toString());
        console.log('Mode parameter from URL:', newModeParam);
        console.log('Current gameMode state:', gameMode);
        const newMode = newModeParam || 'hotseat';
        console.log('Calculated new mode:', newMode);
        if (newMode !== gameMode) {
            console.log(`Game mode changing from ${gameMode} to ${newMode}`);
            setGameMode(newMode);
        }
        else {
            console.log('Game mode unchanged');
        }
    }, [searchParams, gameMode]);
    // Auto-set to new echo if no existing echoes
    useEffect(() => {
        if (selectionMode === 'choosing' && playerEchoes.length === 0) {
            setSelectionMode('new-echo');
        }
    }, [selectionMode, playerEchoes.length]);
    // Handle tile click for new echo
    const handleNewEchoTileClick = (row, col) => {
        if (!highlightedTiles.some(t => t.row === row && t.col === col))
            return;
        const newEcho = {
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
    const handleExtendEchoTileClick = (row, col) => {
        if (!existingEchoTiles.some(t => t.row === row && t.col === col))
            return;
        const existingEcho = playerEchoes.find(e => e.position.row === row && e.position.col === col);
        if (!existingEcho)
            return;
        // Create a copy of the existing echo for extension (keeping the same ID)
        const extendedEcho = {
            ...existingEcho,
            startingPosition: existingEcho.startingPosition || { ...existingEcho.position },
            actionPoints: 3, // 3 action points for extension
            // Keep the existing instructionList - new actions will be added to it
        };
        dispatch({ type: 'ADD_ECHO', echo: extendedEcho });
    };
    const handleFinalizeEcho = (finalEcho) => {
        // If startingPosition is missing, add it from position
        const echoWithStart = {
            ...finalEcho,
            startingPosition: finalEcho.startingPosition || { ...finalEcho.position },
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
    const [replayStates, setReplayStates] = useState([]);
    const [replayTick, setReplayTick] = useState(0);
    const replayTimer = useRef(null);
    const currentTickRef = useRef(0);
    useEffect(() => {
        if (state.phase === 'replay') {
            const sim = simulateReplay(state.echoes.map(e => ({ ...e, startingPosition: { row: e.position.row, col: e.position.col } })));
            setReplayStates(sim);
            setReplayTick(0);
            currentTickRef.current = 0; // Reset the ref
            if (replayTimer.current)
                clearInterval(replayTimer.current);
            if (sim.length > 0) {
                replayTimer.current = setInterval(() => {
                    currentTickRef.current += 1;
                    const newTick = currentTickRef.current;
                    setReplayTick(newTick);
                    if (newTick >= sim.length - 1) {
                        if (replayTimer.current)
                            clearInterval(replayTimer.current);
                    }
                }, 3000);
            }
        }
        else {
            setReplayStates([]);
            setReplayTick(0);
            currentTickRef.current = 0; // Reset the ref
            if (replayTimer.current)
                clearInterval(replayTimer.current);
        }
        return () => { if (replayTimer.current)
            clearInterval(replayTimer.current); };
    }, [state.phase, state.echoes]);
    const handleNextTurn = () => {
        // Record turn history before moving to next turn
        if (replayStates.length > 0) {
            const destroyedEchoIds = new Set();
            const allDestroyed = [];
            const allCollisions = [];
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
                if (replayTimer.current)
                    clearInterval(replayTimer.current);
            }
        }, 3000);
    }, [replayStates.length]);
    // Determine highlightedTiles and onTileClick based on selectionMode
    let boardHighlightedTiles = [];
    let boardOnTileClick = undefined;
    if (selectionMode === 'new-echo') {
        boardHighlightedTiles = highlightedTiles;
        boardOnTileClick = handleNewEchoTileClick;
    }
    else if (selectionMode === 'extend-echo') {
        boardHighlightedTiles = existingEchoTiles;
        boardOnTileClick = handleExtendEchoTileClick;
    }
    if (state.phase === 'replay') {
        const current = replayStates[replayTick] || { echoes: state.echoes, projectiles: [], tick: 0, destroyed: [], destroyedProjectiles: [], collisions: [], shieldBlocks: [] };
        // Map SimProjectile to ProjectilePreview for Board
        const projectilePreviews = current.projectiles.map(p => ({ row: p.position.row, col: p.position.col, type: p.type, direction: p.direction }));
        return (_jsxs("div", { style: { color: 'white', background: '#1a1a1a', minHeight: '100vh', padding: '2rem' }, children: [_jsx("button", { onClick: () => navigate('/home'), style: {
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
                    }, onMouseEnter: (e) => {
                        e.currentTarget.style.background = 'linear-gradient(145deg, #2196F3, #1976D2)';
                        e.currentTarget.style.borderColor = '#2196F3';
                        e.currentTarget.style.boxShadow = '0 0 20px #2196F3, 0 8px 16px rgba(33, 150, 243, 0.3)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.textShadow = '0 0 8px #2196F3';
                    }, onMouseLeave: (e) => {
                        e.currentTarget.style.background = 'linear-gradient(145deg, #333, #444)';
                        e.currentTarget.style.borderColor = '#666';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.textShadow = 'none';
                    }, children: "Home" }), _jsx(GameInfoPanel, { currentPlayer: currentPlayer, turnNumber: state.turnNumber, phase: state.phase, scores: state.scores, echoes: state.echoes, currentTick: current.tick, replayStates: replayStates, turnHistory: state.turnHistory }), _jsxs("div", { style: { width: BOARD_WIDTH, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }, children: [_jsxs("div", { style: { color: '#ff9800', fontWeight: 'bold', textShadow: '0 0 1px #fff', textAlign: 'left', fontSize: 22 }, children: ["Player 1 (Orange): ", _jsx("b", { children: state.scores.player1 })] }), _jsxs("div", { style: { color: 'blue', fontWeight: 'bold', textShadow: '0 0 1px #fff', textAlign: 'right', fontSize: 22 }, children: ["Player 2 (Blue): ", _jsx("b", { children: state.scores.player2 })] })] }), _jsx("div", { style: { width: BOARD_WIDTH, margin: '0 auto', textAlign: 'center', marginBottom: 0 }, children: _jsxs("h2", { style: { color: currentPlayer === 'player1' ? '#ff9800' : 'blue', textShadow: '0 0 1px #fff', margin: 0, fontSize: 28, textDecoration: 'underline' }, children: ["Current Turn: ", currentPlayer === 'player1' ? 'Player 1 (Orange)' : 'Player 2 (Blue)'] }) }), _jsx(Board, { echoes: current.echoes, projectiles: projectilePreviews, collisions: current.collisions, shieldBlocks: current.shieldBlocks }), _jsxs("div", { style: { textAlign: 'center', marginTop: '1rem', marginBottom: '1rem' }, children: [_jsx("button", { onClick: handleReset, style: {
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
                            }, onMouseEnter: (e) => {
                                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                                e.currentTarget.style.boxShadow = '0 4px 16px #f4433660, inset 0 1px 0 #f4433680';
                            }, onMouseLeave: (e) => {
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                e.currentTarget.style.boxShadow = '0 0 8px #f4433640, inset 0 1px 0 #f4433660';
                            }, children: "\uD83D\uDD04 Reset Game" }), _jsx("button", { onClick: handleReplay, style: {
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
                            }, onMouseEnter: (e) => {
                                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                                e.currentTarget.style.boxShadow = '0 4px 16px #2196F360, inset 0 1px 0 #2196F380';
                            }, onMouseLeave: (e) => {
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                e.currentTarget.style.boxShadow = '0 0 8px #2196F340, inset 0 1px 0 #2196F360';
                            }, children: "\u25B6\uFE0F Replay" }), _jsx("button", { onClick: handleNextTurn, style: {
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
                            }, onMouseEnter: (e) => {
                                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                                e.currentTarget.style.boxShadow = '0 4px 16px #4CAF5060, inset 0 1px 0 #4CAF5080';
                            }, onMouseLeave: (e) => {
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                e.currentTarget.style.boxShadow = '0 0 8px #4CAF5040, inset 0 1px 0 #4CAF5060';
                            }, children: "\u23ED\uFE0F Next Turn" })] }), _jsxs("div", { style: { background: '#222', color: '#eee', padding: '1rem', marginTop: '2rem', borderRadius: '8px', fontSize: '0.9rem' }, children: [_jsxs("h3", { style: { margin: '0 0 1rem 0', color: '#4CAF50' }, children: ["Debug Info - Turn ", state.turnNumber, " (Replay)"] }), _jsxs("div", { style: { marginBottom: '1rem' }, children: [_jsx("strong", { children: "Phase:" }), " ", state.phase, " | ", _jsx("strong", { children: "Replay Tick:" }), " ", current.tick, " | ", _jsx("strong", { children: "Total Ticks:" }), " ", replayStates.length] }), _jsxs("div", { style: { marginBottom: '1rem' }, children: [_jsx("strong", { children: "Scores:" }), " Player 1: ", state.scores.player1, " | Player 2: ", state.scores.player2] }), _jsxs("div", { style: { marginBottom: '1rem' }, children: [_jsxs("strong", { children: ["Current Echoes (", current.echoes.length, "):"] }), current.echoes.length === 0 ? (_jsx("div", { style: { color: '#888', fontStyle: 'italic' }, children: "No echoes" })) : (_jsx("div", { style: { marginLeft: '1rem' }, children: (() => {
                                        const echoNames = generateEchoNames(current.echoes);
                                        return current.echoes.map((echo, index) => (_jsxs("div", { style: { marginBottom: '0.5rem', padding: '0.5rem', background: '#333', borderRadius: '4px' }, children: [_jsxs("div", { style: { color: echo.playerId === 'player1' ? 'orange' : '#4ecdc4', fontWeight: 'bold' }, children: [echoNames.get(echo.id) || `Echo ${index + 1}`, " (", echo.playerId === 'player1' ? 'Player 1' : 'Player 2', ")"] }), _jsxs("div", { children: [_jsx("strong", { children: "Position:" }), " ", getBoardPosition(echo.position.row, echo.position.col), " | ", _jsx("strong", { children: "Alive:" }), " ", echo.alive ? 'Yes' : 'No'] }), _jsxs("div", { children: [_jsx("strong", { children: "Shielded:" }), " ", echo.isShielded ? 'Yes' : 'No'] })] }, echo.id)));
                                    })() }))] }), _jsxs("div", { style: { marginBottom: '1rem' }, children: [_jsxs("strong", { children: ["Projectiles (", current.projectiles.length, "):"] }), current.projectiles.length === 0 ? (_jsx("div", { style: { color: '#888', fontStyle: 'italic' }, children: "No projectiles" })) : (_jsx("div", { style: { marginLeft: '1rem' }, children: current.projectiles.map((proj, index) => (_jsxs("div", { style: { color: '#ccc', fontSize: '0.8rem' }, children: [proj.type, ": ", getBoardPosition(proj.position.row, proj.position.col), " \u2192 ", getDirectionName(proj.direction)] }, index))) }))] }), current.destroyed.length > 0 && (_jsxs("div", { style: { marginBottom: '1rem' }, children: [_jsxs("strong", { children: ["Destroyed This Tick (", current.destroyed.length, "):"] }), _jsx("div", { style: { marginLeft: '1rem' }, children: (() => {
                                        const echoNames = generateEchoNames(current.echoes);
                                        return current.destroyed.map((destroyed, index) => {
                                            const echoName = echoNames.get(destroyed.echoId) || `Echo ${destroyed.echoId.slice(0, 8)}`;
                                            return (_jsxs("div", { style: { color: 'orange', fontSize: '0.8rem' }, children: [echoName, " by ", destroyed.by || 'collision'] }, index));
                                        });
                                    })() })] })), current.collisions.length > 0 && (_jsxs("div", { style: { marginBottom: '1rem' }, children: [_jsxs("strong", { children: ["Collisions (", current.collisions.length, "):"] }), _jsx("div", { style: { marginLeft: '1rem' }, children: current.collisions.map((collision, index) => (_jsx("div", { style: { color: '#ffd93d', fontSize: '0.8rem' }, children: getBoardPosition(collision.row, collision.col) }, index))) })] })), current.shieldBlocks.length > 0 && (_jsxs("div", { style: { marginBottom: '1rem' }, children: [_jsxs("strong", { children: ["Shield Blocks (", current.shieldBlocks.length, "):"] }), _jsx("div", { style: { marginLeft: '1rem' }, children: current.shieldBlocks.map((shieldBlock, index) => (_jsxs("div", { style: { color: '#4CAF50', fontSize: '0.8rem' }, children: [getBoardPosition(shieldBlock.row, shieldBlock.col), " \u2192 ", getDirectionName(shieldBlock.projectileDirection)] }, index))) })] })), state.turnHistory.length > 0 && (_jsxs("div", { style: { marginBottom: '1rem' }, children: [_jsxs("strong", { children: ["Turn History (", state.turnHistory.length, " turns):"] }), _jsx("div", { style: { marginLeft: '1rem', maxHeight: '300px', overflowY: 'auto' }, children: state.turnHistory.slice().reverse().map((entry, index) => (_jsxs("div", { style: { marginBottom: '0.5rem', padding: '0.5rem', background: '#333', borderRadius: '4px', fontSize: '0.8rem' }, children: [_jsxs("div", { style: { fontWeight: 'bold', color: '#4CAF50' }, children: ["Turn ", entry.turnNumber] }), _jsxs("div", { children: [_jsx("strong", { children: "Scores:" }), " P1: ", entry.scores.player1, " | P2: ", entry.scores.player2] }), _jsxs("div", { children: [_jsx("strong", { children: "Echoes:" }), " P1: ", entry.player1Echoes.length, " | P2: ", entry.player2Echoes.length] }), entry.destroyedEchoes.length > 0 && (_jsxs("div", { children: [_jsx("strong", { children: "Destroyed:" }), " ", entry.destroyedEchoes.length, " echoes"] })), entry.destroyedProjectiles && entry.destroyedProjectiles.length > 0 && (_jsxs("div", { children: [_jsx("strong", { children: "Destroyed Projectiles:" }), " ", entry.destroyedProjectiles.length, " projectiles"] })), entry.collisions.length > 0 && (_jsxs("div", { children: [_jsx("strong", { children: "Collisions:" }), " ", entry.collisions.length, " events"] }))] }, entry.turnNumber))) })] }))] })] }));
    }
    // Game Over Phase
    if (state.phase === 'gameOver') {
        const winner = state.winner;
        const finalScores = state.scores;
        const player1Echoes = state.echoes.filter(e => e.playerId === 'player1' && e.alive);
        const player2Echoes = state.echoes.filter(e => e.playerId === 'player2' && e.alive);
        return (_jsxs("div", { style: { color: 'white', background: '#1a1a1a', minHeight: '100vh', padding: '2rem' }, children: [_jsx("button", { onClick: () => navigate('/home'), style: {
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
                    }, onMouseEnter: (e) => {
                        e.currentTarget.style.background = 'linear-gradient(145deg, #2196F3, #1976D2)';
                        e.currentTarget.style.borderColor = '#2196F3';
                        e.currentTarget.style.boxShadow = '0 0 20px #2196F3, 0 8px 16px rgba(33, 150, 243, 0.3)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.textShadow = '0 0 8px #2196F3';
                    }, onMouseLeave: (e) => {
                        e.currentTarget.style.background = 'linear-gradient(145deg, #333, #444)';
                        e.currentTarget.style.borderColor = '#666';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.textShadow = 'none';
                    }, children: "Home" }), _jsxs("div", { style: { textAlign: 'center', maxWidth: '600px', margin: '0 auto' }, children: [_jsx("h1", { style: { fontSize: '3rem', marginBottom: '2rem', color: winner === 'player1' ? 'orange' : '#4ecdc4' }, children: "\uD83C\uDFC6 Game Over! \uD83C\uDFC6" }), _jsxs("div", { style: {
                                background: '#333',
                                padding: '2rem',
                                borderRadius: '12px',
                                marginBottom: '2rem',
                                border: `3px solid ${winner === 'player1' ? 'orange' : '#4ecdc4'}`
                            }, children: [_jsxs("h2", { style: {
                                        fontSize: '2rem',
                                        marginBottom: '1rem',
                                        color: winner === 'player1' ? 'orange' : '#4ecdc4'
                                    }, children: [winner === 'player1' ? 'Player 1 (Orange)' : 'Player 2 (Blue)', " Wins!"] }), _jsx("div", { style: { fontSize: '1.2rem', marginBottom: '1rem' }, children: "Final Scores:" }), _jsxs("div", { style: { display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem' }, children: [_jsxs("div", { style: {
                                                padding: '1rem',
                                                background: winner === 'player1' ? 'orange' : '#666',
                                                borderRadius: '8px',
                                                minWidth: '120px'
                                            }, children: [_jsx("div", { style: { fontWeight: 'bold' }, children: "Player 1 (Orange)" }), _jsx("div", { style: { fontSize: '1.5rem' }, children: finalScores.player1 })] }), _jsxs("div", { style: {
                                                padding: '1rem',
                                                background: winner === 'player2' ? '#4ecdc4' : '#666',
                                                borderRadius: '8px',
                                                minWidth: '120px'
                                            }, children: [_jsx("div", { style: { fontWeight: 'bold' }, children: "Player 2 (Blue)" }), _jsx("div", { style: { fontSize: '1.5rem' }, children: finalScores.player2 })] })] }), _jsx("div", { style: { fontSize: '1rem', marginBottom: '1rem' }, children: "Final Echo Count:" }), _jsxs("div", { style: { display: 'flex', justifyContent: 'center', gap: '2rem' }, children: [_jsxs("div", { children: ["Player 1: ", player1Echoes.length, " echoes"] }), _jsxs("div", { children: ["Player 2: ", player2Echoes.length, " echoes"] })] })] }), _jsx("button", { onClick: handleReset, style: {
                                padding: '1rem 2rem',
                                fontSize: '1.2rem',
                                background: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }, children: "Play Again" }), _jsxs("div", { style: {
                                background: '#222',
                                color: '#eee',
                                padding: '1rem',
                                marginTop: '2rem',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                textAlign: 'left'
                            }, children: [_jsx("h3", { style: { margin: '0 0 1rem 0', color: '#4CAF50', textAlign: 'center' }, children: "Final Game Stats" }), _jsxs("div", { style: { marginBottom: '1rem' }, children: [_jsx("strong", { children: "Total Turns:" }), " ", state.turnNumber] }), _jsxs("div", { style: { marginBottom: '1rem' }, children: [_jsx("strong", { children: "Win Condition:" }), " ", finalScores.player1 >= 10 || finalScores.player2 >= 10 ? 'Points Victory (10+ points)' :
                                            player1Echoes.length === 0 || player2Echoes.length === 0 ? 'Opponent Destruction' :
                                                'Echo Count Victory (8 columns)'] }), state.turnHistory.length > 0 && (_jsxs("div", { children: [_jsxs("strong", { children: ["Turn History (", state.turnHistory.length, " turns):"] }), _jsx("div", { style: { marginLeft: '1rem', maxHeight: '200px', overflowY: 'auto' }, children: state.turnHistory.slice().reverse().map((entry, index) => (_jsxs("div", { style: { marginBottom: '0.5rem', padding: '0.5rem', background: '#333', borderRadius: '4px', fontSize: '0.8rem' }, children: [_jsxs("div", { style: { fontWeight: 'bold', color: '#4CAF50' }, children: ["Turn ", entry.turnNumber] }), _jsxs("div", { children: [_jsx("strong", { children: "Scores:" }), " P1: ", entry.scores.player1, " | P2: ", entry.scores.player2] }), _jsxs("div", { children: [_jsx("strong", { children: "Echoes:" }), " P1: ", entry.player1Echoes.length, " | P2: ", entry.player2Echoes.length] }), entry.destroyedEchoes.length > 0 && (_jsxs("div", { children: [_jsx("strong", { children: "Destroyed:" }), " ", entry.destroyedEchoes.length, " echoes"] }))] }, entry.turnNumber))) })] }))] })] })] }));
    }
    return (_jsxs("div", { style: { color: 'white', background: '#1a1a1a', minHeight: '100vh', padding: '2rem' }, children: [_jsx("button", { onClick: () => navigate('/home'), style: {
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
                }, onMouseEnter: (e) => {
                    e.currentTarget.style.background = 'linear-gradient(145deg, #2196F3, #1976D2)';
                    e.currentTarget.style.borderColor = '#2196F3';
                    e.currentTarget.style.boxShadow = '0 0 20px #2196F3, 0 8px 16px rgba(33, 150, 243, 0.3)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.textShadow = '0 0 8px #2196F3';
                }, onMouseLeave: (e) => {
                    e.currentTarget.style.background = 'linear-gradient(145deg, #333, #444)';
                    e.currentTarget.style.borderColor = '#666';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.textShadow = 'none';
                }, children: "Home" }), _jsx(GameInfoPanel, { currentPlayer: currentPlayer, turnNumber: state.turnNumber, phase: state.phase, scores: state.scores, echoes: state.echoes, currentTick: state.currentTick, replayStates: [], turnHistory: state.turnHistory }), _jsxs("div", { style: { width: BOARD_WIDTH, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }, children: [_jsxs("div", { style: { color: '#ff9800', fontWeight: 'bold', textShadow: '0 0 1px #fff', textAlign: 'left', fontSize: 22 }, children: ["Player 1 (Orange): ", _jsx("b", { children: state.scores.player1 })] }), _jsxs("div", { style: { color: 'blue', fontWeight: 'bold', textShadow: '0 0 1px #fff', textAlign: 'right', fontSize: 22 }, children: ["Player 2 (Blue): ", _jsx("b", { children: state.scores.player2 })] })] }), _jsx("div", { style: { width: BOARD_WIDTH, margin: '0 auto', textAlign: 'center', marginBottom: 0 }, children: _jsxs("h2", { style: { color: currentPlayer === 'player1' ? '#ff9800' : 'blue', textShadow: '0 0 1px #fff', margin: 0, fontSize: 28, textDecoration: 'underline' }, children: ["Current Turn: ", currentPlayer === 'player1' ? 'Player 1 (Orange)' : 'Player 2 (Blue)'] }) }), state.pendingEcho ? (_jsx(EchoActionAssignment, { pendingEcho: state.pendingEcho, onComplete: handleFinalizeEcho, allEchoes: state.echoes })) : gameMode === 'ai-training' ? (_jsxs("div", { style: { position: 'relative' }, children: [_jsx("div", { style: {
                            position: 'absolute',
                            left: '100px',
                            top: '0',
                            zIndex: 10
                        }, children: _jsx(AITrainingPanel, { gameState: state, currentPlayer: currentPlayer, onReset: handleReset, onNextTurn: handleNextTurn }) }), _jsx("div", { style: { display: 'flex', justifyContent: 'center' }, children: _jsx(Board, { echoes: state.echoes, highlightedTiles: [], onTileClick: undefined, fullWidth: false }) })] })) : (selectionMode === 'choosing' && playerEchoes.length > 0) ? (_jsxs("div", { style: { display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, children: [_jsx(EchoSelection, { currentPlayer: currentPlayer, existingEchoes: state.echoes, onNewEcho: handleNewEcho, onExtendEcho: handleExtendEcho }), _jsx("div", { style: { marginLeft: '60px' }, children: _jsx(Board, { echoes: state.echoes, highlightedTiles: boardHighlightedTiles, onTileClick: boardOnTileClick, fullWidth: false }) })] })) : (_jsxs("div", { children: [_jsx(Board, { echoes: state.echoes, highlightedTiles: boardHighlightedTiles, onTileClick: boardOnTileClick, fullWidth: true }), _jsx("div", { style: { marginTop: '2rem', textAlign: 'center' }, children: playerEchoes.length > 0 && (_jsx("button", { onClick: handleBackFromTileSelection, style: {
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
                            }, onMouseEnter: (e) => {
                                e.currentTarget.style.background = 'linear-gradient(145deg, #2196F3, #1976D2)';
                                e.currentTarget.style.borderColor = '#2196F3';
                                e.currentTarget.style.boxShadow = '0 0 20px #2196F3, 0 8px 16px rgba(33, 150, 243, 0.3)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.textShadow = '0 0 8px #2196F3';
                            }, onMouseLeave: (e) => {
                                e.currentTarget.style.background = 'linear-gradient(145deg, #333, #444)';
                                e.currentTarget.style.borderColor = '#666';
                                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.textShadow = 'none';
                            }, children: "\u2190 Back to Choose Echo Action" })) })] })), _jsx("div", { style: { textAlign: 'center', marginTop: '1rem', marginBottom: '1rem' }, children: _jsx("button", { onClick: handleReset, style: {
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
                    }, onMouseEnter: (e) => {
                        e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                        e.currentTarget.style.boxShadow = '0 4px 16px #f4433660, inset 0 1px 0 #f4433680';
                    }, onMouseLeave: (e) => {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = '0 0 8px #f4433640, inset 0 1px 0 #f4433660';
                    }, children: "\uD83D\uDD04 Reset Game" }) }), _jsxs("div", { style: { background: '#222', color: '#eee', padding: '1rem', marginTop: '2rem', borderRadius: '8px', fontSize: '0.9rem' }, children: [_jsxs("h3", { style: { margin: '0 0 1rem 0', color: '#4CAF50' }, children: ["Debug Info - Turn ", state.turnNumber] }), _jsxs("div", { style: { marginBottom: '1rem' }, children: [_jsx("strong", { children: "Phase:" }), " ", state.phase, " | ", _jsx("strong", { children: "Current Player:" }), " ", state.currentPlayer === 'player1' ? 'Player 1 (Orange)' : 'Player 2 (Blue)'] }), _jsxs("div", { style: { marginBottom: '1rem' }, children: [_jsx("strong", { children: "Scores:" }), " Player 1: ", state.scores.player1, " | Player 2: ", state.scores.player2] }), _jsxs("div", { style: { marginBottom: '1rem' }, children: [_jsxs("strong", { children: ["Echoes (", state.echoes.length, "):"] }), state.echoes.length === 0 ? (_jsx("div", { style: { color: '#888', fontStyle: 'italic' }, children: "No echoes" })) : (_jsx("div", { style: { marginLeft: '1rem' }, children: (() => {
                                    const echoNames = generateEchoNames(state.echoes);
                                    return state.echoes.map((echo, index) => (_jsxs("div", { style: { marginBottom: '0.5rem', padding: '0.5rem', background: '#333', borderRadius: '4px' }, children: [_jsxs("div", { style: { color: echo.playerId === 'player1' ? 'orange' : '#4ecdc4', fontWeight: 'bold' }, children: [echoNames.get(echo.id) || `Echo ${index + 1}`, " (", echo.playerId === 'player1' ? 'Player 1' : 'Player 2', ")"] }), _jsxs("div", { children: [_jsx("strong", { children: "Position:" }), " ", getBoardPosition(echo.position.row, echo.position.col), " | ", _jsx("strong", { children: "Alive:" }), " ", echo.alive ? 'Yes' : 'No'] }), _jsx("div", { children: _jsxs("strong", { children: ["Actions (", echo.instructionList.length, "):"] }) }), _jsx("div", { style: { marginLeft: '1rem', fontSize: '0.8rem' }, children: (() => {
                                                    let currentPos = { ...echo.position };
                                                    return echo.instructionList.map((action, actionIndex) => {
                                                        // Calculate position for this tick
                                                        let tickPosition = currentPos;
                                                        if (action.type === 'walk') {
                                                            tickPosition = {
                                                                row: currentPos.row + action.direction.y,
                                                                col: currentPos.col + action.direction.x
                                                            };
                                                        }
                                                        else if (action.type === 'dash') {
                                                            tickPosition = {
                                                                row: currentPos.row + action.direction.y * 2,
                                                                col: currentPos.col + action.direction.x * 2
                                                            };
                                                        }
                                                        // Update current position for next iteration
                                                        if (action.type === 'walk' || action.type === 'dash') {
                                                            currentPos = tickPosition;
                                                        }
                                                        return (_jsxs("div", { style: { color: '#ccc' }, children: ["Tick ", action.tick, ": ", action.type.toUpperCase(), " (", getDirectionName(action.direction), ") [Cost: ", action.cost, "] at ", getBoardPosition(tickPosition.row, tickPosition.col)] }, actionIndex));
                                                    });
                                                })() })] }, echo.id)));
                                })() }))] }), state.pendingEcho && (_jsxs("div", { style: { marginBottom: '1rem' }, children: [_jsx("strong", { children: "Pending Echo:" }), _jsxs("div", { style: { marginLeft: '1rem', padding: '0.5rem', background: '#333', borderRadius: '4px' }, children: [_jsxs("div", { style: { color: state.pendingEcho.playerId === 'player1' ? 'orange' : '#4ecdc4', fontWeight: 'bold' }, children: [state.pendingEcho.playerId === 'player1' ? 'Player 1' : 'Player 2', " - ", state.pendingEcho.actionPoints, " Action Points"] }), _jsxs("div", { children: [_jsx("strong", { children: "Position:" }), " ", getBoardPosition(state.pendingEcho.position.row, state.pendingEcho.position.col)] }), _jsxs("div", { children: [_jsx("strong", { children: "Actions:" }), " ", state.pendingEcho.instructionList.length] })] })] })), _jsxs("div", { style: { fontSize: '0.8rem', color: '#888' }, children: [_jsx("strong", { children: "Submitted Players:" }), " ", state.submittedPlayers.join(', ') || 'None'] }), state.turnHistory.length > 0 && (_jsxs("div", { style: { marginTop: '1rem' }, children: [_jsxs("strong", { children: ["Turn History (", state.turnHistory.length, " turns):"] }), _jsx("div", { style: { marginLeft: '1rem', maxHeight: '300px', overflowY: 'auto' }, children: state.turnHistory.slice().reverse().map((entry, index) => (_jsxs("div", { style: { marginBottom: '0.5rem', padding: '0.5rem', background: '#333', borderRadius: '4px', fontSize: '0.8rem' }, children: [_jsxs("div", { style: { fontWeight: 'bold', color: '#4CAF50' }, children: ["Turn ", entry.turnNumber] }), _jsxs("div", { children: [_jsx("strong", { children: "Scores:" }), " P1: ", entry.scores.player1, " | P2: ", entry.scores.player2] }), _jsxs("div", { children: [_jsx("strong", { children: "Echoes:" }), " P1: ", entry.player1Echoes.length, " | P2: ", entry.player2Echoes.length] }), entry.destroyedEchoes.length > 0 && (_jsxs("div", { children: [_jsx("strong", { children: "Destroyed:" }), " ", entry.destroyedEchoes.length, " echoes"] })), entry.destroyedProjectiles && entry.destroyedProjectiles.length > 0 && (_jsxs("div", { children: [_jsx("strong", { children: "Destroyed Projectiles:" }), " ", entry.destroyedProjectiles.length, " projectiles"] })), entry.collisions.length > 0 && (_jsxs("div", { children: [_jsx("strong", { children: "Collisions:" }), " ", entry.collisions.length, " events"] }))] }, entry.turnNumber))) })] }))] })] }));
};
export default GamePage;
