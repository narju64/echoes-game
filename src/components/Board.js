import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
import ExplosionAnimation from './ExplosionAnimation';
const BOARD_SIZE = 8;
const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const ROW_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8'];
const TILE_SIZE = 80; // px
const TRAIL_LENGTH = 3;
const BASE_OPACITY = 0.3;
const ROW_LABEL_WIDTH = 32;
// Helper functions for board position formatting
const getColumnLetter = (col) => {
    return String.fromCharCode(65 + col); // A, B, C, etc.
};
const getRowNumber = (row) => {
    return String(8 - row); // 8, 7, 6, etc. (board is displayed bottom-to-top)
};
const getBoardPosition = (row, col) => {
    return `${getColumnLetter(col)}${getRowNumber(row)}`;
};
const getDirectionName = (dir) => {
    if (dir.x === 0 && dir.y === 1)
        return '↑'; // N
    if (dir.x === 1 && dir.y === 1)
        return '↗'; // NE
    if (dir.x === 1 && dir.y === 0)
        return '→'; // E
    if (dir.x === 1 && dir.y === -1)
        return '↘'; // SE
    if (dir.x === 0 && dir.y === -1)
        return '↓'; // S
    if (dir.x === -1 && dir.y === -1)
        return '↙'; // SW
    if (dir.x === -1 && dir.y === 0)
        return '←'; // W
    if (dir.x === -1 && dir.y === 1)
        return '↖'; // NW
    return '?';
};
// Simple hover popup component
const EchoActionPopup = ({ echo, position }) => {
    return (_jsxs("div", { style: {
            position: 'absolute',
            top: `${(BOARD_SIZE - 1 - position.row) * TILE_SIZE + 16 - 120}px`,
            left: `${position.col * TILE_SIZE + 16 + 32}px`,
            background: '#222',
            color: '#eee',
            padding: '0.75rem',
            borderRadius: '8px',
            fontSize: '0.8rem',
            zIndex: 1000,
            minWidth: '200px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.8)',
            border: '1px solid #444',
            pointerEvents: 'none',
        }, children: [_jsxs("div", { style: { marginBottom: '0.5rem', fontWeight: 'bold', color: echo.playerId === 'player1' ? 'orange' : '#4ecdc4' }, children: ["Actions (", echo.instructionList.length, "):"] }), echo.instructionList.length === 0 ? (_jsx("div", { style: { color: '#888', fontStyle: 'italic' }, children: "No actions assigned" })) : (_jsx("div", { style: { color: '#ccc' }, children: (() => {
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
                        return (_jsxs("div", { style: { marginBottom: '0.25rem' }, children: ["Tick ", action.tick, ": ", action.type.toUpperCase(), " (", getDirectionName(action.direction), ") at ", getBoardPosition(tickPosition.row, tickPosition.col)] }, actionIndex));
                    });
                })() }))] }));
};
const Board = ({ echoes, highlightedTiles = [], onTileClick, origin, onDirectionSelect, projectiles = [], collisions = [], shieldBlocks = [], previewEchoes = [], previewProjectiles = [], fullWidth = false }) => {
    const [activeExplosions, setActiveExplosions] = React.useState(new Set());
    const [activeShieldBlocks, setActiveShieldBlocks] = React.useState(new Map());
    const [hoveredEcho, setHoveredEcho] = React.useState(null);
    // Helper to check if a tile is highlighted
    const isHighlighted = (row, col) => highlightedTiles.some(t => t.row === row && t.col === col);
    // Helper to check if a tile is the origin
    const isOrigin = (row, col) => origin && origin.row === row && origin.col === col;
    // Helper to get direction vector from origin to target
    const getDirection = (from, to) => {
        const dx = Math.sign(to.col - from.col);
        const dy = Math.sign(to.row - from.row);
        return { x: dx, y: dy };
    };
    // Helper to find projectile/mine at a tile
    const getProjectile = (row, col) => projectiles.find(p => p.row === row && p.col === col);
    // Helper to check if a tile has a collision
    const hasCollision = (row, col) => collisions.some(c => c.row === row && c.col === col);
    // Helper to get collision key
    const getCollisionKey = (row, col) => `${row},${col}`;
    // Trigger explosion animations for collisions
    React.useEffect(() => {
        collisions.forEach(collision => {
            const key = getCollisionKey(collision.row, collision.col);
            if (!activeExplosions.has(key)) {
                setActiveExplosions(prev => new Set(prev).add(key));
            }
        });
    }, [collisions]);
    // Trigger shield block animations
    React.useEffect(() => {
        shieldBlocks.forEach(shieldBlock => {
            const key = getCollisionKey(shieldBlock.row, shieldBlock.col);
            if (!activeShieldBlocks.has(key)) {
                setActiveShieldBlocks(prev => new Map(prev).set(key, shieldBlock.projectileDirection));
            }
        });
    }, [shieldBlocks]);
    const handleExplosionComplete = (row, col) => {
        const key = getCollisionKey(row, col);
        setActiveExplosions(prev => {
            const next = new Set(prev);
            next.delete(key);
            return next;
        });
    };
    const handleShieldBlockComplete = (row, col) => {
        const key = getCollisionKey(row, col);
        setActiveShieldBlocks(prev => {
            const next = new Map(prev);
            next.delete(key);
            return next;
        });
    };
    return (_jsx("div", { style: { display: 'flex', justifyContent: 'center', alignItems: 'center', width: fullWidth ? '95vw' : 'auto', paddingTop: 10 }, children: _jsxs("div", { style: { display: 'inline-block', background: 'black', padding: 16, borderRadius: 12, position: 'relative' }, children: [_jsxs("div", { style: { display: 'flex', marginBottom: 4 }, children: [_jsx("div", { style: { width: ROW_LABEL_WIDTH } }), " ", COL_LABELS.map((label) => (_jsx("div", { style: { width: TILE_SIZE, textAlign: 'center', color: 'blue', fontWeight: 'bold', textShadow: '0 0 2px #fff', fontSize: 28 }, children: label }, label)))] }), Array.from({ length: BOARD_SIZE }).map((_, displayRowIdx) => {
                    const rowIdx = BOARD_SIZE - 1 - displayRowIdx;
                    return (_jsxs("div", { style: { display: 'flex', alignItems: 'center' }, children: [_jsx("div", { style: { width: ROW_LABEL_WIDTH, textAlign: 'left', color: '#ff9800', fontWeight: 'bold', textShadow: '0 0 2px #fff', fontSize: 28 }, children: ROW_LABELS[rowIdx] }), Array.from({ length: BOARD_SIZE }).map((_, colIdx) => {
                                const echo = echoes.find(e => e.position.row === rowIdx && e.position.col === colIdx && e.alive);
                                const previewEcho = previewEchoes.find(e => e.position.row === rowIdx && e.position.col === colIdx && e.alive);
                                const highlighted = isHighlighted(rowIdx, colIdx);
                                const originHere = isOrigin(rowIdx, colIdx);
                                const projectile = getProjectile(rowIdx, colIdx);
                                const previewProjectile = previewProjectiles.find(p => p.row === rowIdx && p.col === colIdx);
                                return (_jsxs("div", { className: "board-tile-glow", style: {
                                        width: TILE_SIZE,
                                        height: TILE_SIZE,
                                        border: '1px solid',
                                        boxSizing: 'border-box',
                                        position: 'relative',
                                        background: highlighted ? '#333d' : 'black',
                                        cursor: highlighted ? 'pointer' : 'default',
                                        transition: 'background 0.2s',
                                        outline: originHere ? '2px solid #61dafb' : undefined,
                                    }, onClick: () => {
                                        if (highlighted) {
                                            if (onDirectionSelect && origin) {
                                                const dir = getDirection(origin, { row: rowIdx, col: colIdx });
                                                onDirectionSelect(dir);
                                            }
                                            else if (onTileClick) {
                                                onTileClick(rowIdx, colIdx);
                                            }
                                        }
                                    }, onMouseEnter: () => {
                                        // Only show popup for highlighted echoes when not in direction selection mode
                                        if (echo && highlighted && !onDirectionSelect) {
                                            setHoveredEcho(echo);
                                        }
                                    }, onMouseLeave: () => {
                                        if (!onDirectionSelect) {
                                            setHoveredEcho(null);
                                        }
                                    }, children: [projectile && projectile.type === 'projectile' && (_jsx(ProjectileTrail, { row: projectile.row, col: projectile.col, direction: projectile.direction })), echo && (_jsxs(_Fragment, { children: [_jsx("div", { className: `echo-3d-pulse echo-${echo.playerId}`, style: {
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: '50%',
                                                        position: 'absolute',
                                                        top: '50%',
                                                        left: '50%',
                                                        transform: 'translate(-50%, -50%)',
                                                        zIndex: 2,
                                                    } }), _jsx("style", { children: `
                            .echo-3d-pulse {
                              box-shadow:
                                0 0 8px 3px var(--echo-glow-color, #fff5),
                                0 2px 8px 0 rgba(0,0,0,0.4),
                                0 0 0 3px rgba(255,255,255,0.05) inset;
                              background: radial-gradient(circle at 60% 30%, #fff6 0%, transparent 60%),
                                          radial-gradient(circle at 40% 70%, #fff2 0%, transparent 70%);
                              animation: echo-pulse 2.4s infinite cubic-bezier(0.4,0,0.2,1);
                            }
                            .echo-player1 {
                              --echo-glow-color: #ffd580;
                              background-color: #a65c00;
                              background-image:
                                radial-gradient(circle, #ffb347 0%, #ff9800 40%,rgb(117, 65, 0) 80%, #000000 100%),
                                linear-gradient(145deg, #ffb347 0%, #ff9800 60%, #a65c00 100%);
                            }
                            .echo-player2 {
                              --echo-glow-color: #90caf9;
                              background-color: #0d326d;
                              background-image:
                                radial-gradient(circle, #6ec6ff 0%, #2196f3 40%,rgb(44, 82, 143) 80%,rgb(38, 70, 100) 100%),
                                linear-gradient(145deg, #6ec6ff 0%, #2196f3 60%, #0d326d 100%);
                            }
                            .board-tile-glow {
                              border-color: #fff;
                              position: relative;
                              z-index: 1;
                              animation: board-tile-glow-pulse 6s infinite linear;
                            }
                            .board-tile-glow::before {
                              content: '';
                              position: absolute;
                              top: -2px; left: -2px; right: -2px; bottom: -2px;
                              border-radius: 6px;
                              pointer-events: none;
                              z-index: 0;
                              box-shadow: 0 0 0 0 rgba(255,152,0,0.10), 0 0 0 0 rgba(33,150,243,0.10);
                              transition: box-shadow 0.3s;
                              animation: board-tile-glow-radial 6s infinite linear;
                            }
                            @keyframes board-tile-glow-pulse {
                              0%   { border-color: #fff; }
                              20%  { border-color:rgb(252, 205, 148); }
                              50%  { border-color: #fff; }
                              70%  { border-color:rgb(169, 216, 255); }
                              100% { border-color: #fff; }
                            }
                            @keyframes echo-pulse {
                              0% { box-shadow: 0 0 8px 3px var(--echo-glow-color, #fff5), 0 2px 8px 0 rgba(0,0,0,0.4), 0 0 0 3px rgba(255,255,255,0.05) inset; }
                              50% { box-shadow: 0 0 12px 5px var(--echo-glow-color, #fff3), 0 3px 10px 0 rgba(0,0,0,0.45), 0 0 0 4px rgba(255,255,255,0.06) inset; }
                              100% { box-shadow: 0 0 8px 3px var(--echo-glow-color, #fff5), 0 2px 8px 0 rgba(0,0,0,0.4), 0 0 0 3px rgba(255,255,255,0.05) inset; }
                            }
                            @keyframes board-tile-glow-radial {
                              0%   { box-shadow: 0 0 0 0 rgba(235,188,118,0.04), 0 0 0 0 rgba(100,181,246,0.04); }
                              20%  { box-shadow: 0 0 32px 12px rgba(235,188,118,0.09); }
                              50%  { box-shadow: 0 0 0 0 rgba(235,188,118,0.04), 0 0 0 0 rgba(100,181,246,0.04); }
                              70%  { box-shadow: 0 0 32px 12px rgba(100,181,246,0.09); }
                              100% { box-shadow: 0 0 0 0 rgba(235,188,118,0.04), 0 0 0 0 rgba(100,181,246,0.04); }
                            }
                            @keyframes shield-pulse {
                              0% { filter: drop-shadow(0 0 8px #4CAF50); }
                              50% { filter: drop-shadow(0 0 12px #4CAF50); }
                              100% { filter: drop-shadow(0 0 8px #4CAF50); }
                            }
                            @keyframes shield-particle {
                              0% { opacity: 0.3; stroke-width: 2; }
                              25% { opacity: 1; stroke-width: 4; }
                              50% { opacity: 0.7; stroke-width: 3; }
                              75% { opacity: 0.9; stroke-width: 3; }
                              100% { opacity: 0.3; stroke-width: 2; }
                            }
                          ` }), echo.isShielded && echo.shieldDirection && (_jsx("svg", { width: 64, height: 64, viewBox: "0 0 64 64", style: {
                                                        position: 'absolute',
                                                        top: '50%',
                                                        left: '50%',
                                                        transform: `translate(-50%, -50%) rotate(${getShieldRotation(echo.shieldDirection)}deg)`,
                                                        pointerEvents: 'none',
                                                        zIndex: 10,
                                                        filter: 'drop-shadow(0 0 8px #4CAF50)',
                                                        animation: 'shield-pulse 1.5s ease-in-out infinite',
                                                    }, children: Array.from({ length: 12 }).map((_, i) => {
                                                        const angle = (i * 15 - 180) * (Math.PI / 180); // Start from -90 degrees (left) to +90 degrees (right)
                                                        const radius = 28;
                                                        const dashLength = 8;
                                                        const startAngle = angle - (dashLength / radius) / 2;
                                                        const endAngle = angle + (dashLength / radius) / 2;
                                                        const x1 = 32 + radius * Math.cos(startAngle);
                                                        const y1 = 32 + radius * Math.sin(startAngle);
                                                        const x2 = 32 + radius * Math.cos(endAngle);
                                                        const y2 = 32 + radius * Math.sin(endAngle);
                                                        return (_jsx("line", { x1: x1, y1: y1, x2: x2, y2: y2, stroke: "#4CAF50", strokeWidth: "3", strokeLinecap: "round", opacity: 0.6 + Math.random() * 0.4, style: {
                                                                animation: `shield-particle ${0.6 + Math.random() * 0.8}s ease-in-out infinite`,
                                                                animationDelay: `${Math.random() * 0.6}s`
                                                            } }, i));
                                                    }) }))] })), projectile && (_jsx("div", { style: {
                                                width: 16,
                                                height: 16,
                                                borderRadius: '50%',
                                                background: projectile.type === 'projectile' ? 'white' : 'transparent',
                                                border: projectile.type === 'mine' ? '2px solid white' : undefined,
                                                position: 'absolute',
                                                top: '50%',
                                                left: '50%',
                                                transform: 'translate(-50%, -50%)',
                                                boxShadow: projectile.type === 'projectile'
                                                    ? '0 0 6px 2px #fff, 0 0 12px 4px rgba(255, 255, 255, 0.4)'
                                                    : undefined,
                                            } })), previewEcho && !echo && (_jsxs(_Fragment, { children: [_jsx("div", { style: {
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: '50%',
                                                        background: 'rgba(128, 128, 128, 0.6)',
                                                        position: 'absolute',
                                                        top: '50%',
                                                        left: '50%',
                                                        transform: 'translate(-50%, -50%)',
                                                        boxShadow: '0 0 8px 2px rgba(128, 128, 128, 0.3)',
                                                    } }), previewEcho.isShielded && previewEcho.shieldDirection && (_jsx("svg", { width: 64, height: 64, viewBox: "0 0 64 64", style: {
                                                        position: 'absolute',
                                                        top: '50%',
                                                        left: '50%',
                                                        transform: `translate(-50%, -50%) rotate(${getShieldRotation(previewEcho.shieldDirection)}deg)`,
                                                        pointerEvents: 'none',
                                                    }, children: _jsx("path", { d: "M32,32 m-32,0 a32,32 0 0,1 64,0", fill: "none", stroke: "rgba(128, 128, 128, 0.6)", strokeWidth: "4" }) }))] })), previewProjectile && (_jsxs(_Fragment, { children: [previewProjectile.type === 'projectile' && (_jsx(ProjectileTrail, { row: previewProjectile.row, col: previewProjectile.col, direction: previewProjectile.direction })), _jsx("div", { style: {
                                                        width: 16,
                                                        height: 16,
                                                        borderRadius: '50%',
                                                        background: previewProjectile.type === 'projectile' ? 'rgba(128, 128, 128, 0.6)' : 'transparent',
                                                        border: previewProjectile.type === 'mine' ? '2px solid rgba(128, 128, 128, 0.6)' : undefined,
                                                        position: 'absolute',
                                                        top: '50%',
                                                        left: '50%',
                                                        transform: 'translate(-50%, -50%)',
                                                        boxShadow: previewProjectile.type === 'projectile'
                                                            ? '0 0 6px 2px rgba(128, 128, 128, 0.6), 0 0 12px 4px rgba(128, 128, 128, 0.3)'
                                                            : undefined,
                                                    } })] })), activeExplosions.has(getCollisionKey(rowIdx, colIdx)) && !activeShieldBlocks.has(getCollisionKey(rowIdx, colIdx)) && (_jsx(ExplosionAnimation, { row: rowIdx, col: colIdx, onComplete: () => handleExplosionComplete(rowIdx, colIdx) })), activeShieldBlocks.has(getCollisionKey(rowIdx, colIdx)) && (_jsx(ExplosionAnimation, { row: rowIdx, col: colIdx, onComplete: () => handleShieldBlockComplete(rowIdx, colIdx), isShieldBlock: true, projectileDirection: activeShieldBlocks.get(getCollisionKey(rowIdx, colIdx)) }))] }, colIdx));
                            })] }, rowIdx));
                }), hoveredEcho && (_jsx(EchoActionPopup, { echo: hoveredEcho, position: hoveredEcho.position }))] }) }));
};
function getShieldRotation(dir) {
    // Accepts a Direction {x, y} and returns degrees
    if (!dir)
        return 0;
    if (dir.x === 0 && dir.y === 1)
        return 0; // N
    if (dir.x === 1 && dir.y === 1)
        return 45; // NE
    if (dir.x === 1 && dir.y === 0)
        return 90; // E
    if (dir.x === 1 && dir.y === -1)
        return 135; // SE
    if (dir.x === 0 && dir.y === -1)
        return 180; // S
    if (dir.x === -1 && dir.y === -1)
        return 225; // SW
    if (dir.x === -1 && dir.y === 0)
        return 270; // W
    if (dir.x === -1 && dir.y === 1)
        return 315; // NW
    return 0;
}
const ProjectileTrail = ({ row, col, direction }) => {
    const prevRow = row - direction.y;
    const prevCol = col - direction.x;
    if (prevRow < 0 || prevRow > 7 || prevCol < 0 || prevCol > 7)
        return null;
    // Calculate start and end points (relative to current tile)
    const x1 = TILE_SIZE / 2 - direction.x * TILE_SIZE;
    const y1 = TILE_SIZE / 2 + direction.y * TILE_SIZE;
    const x2 = TILE_SIZE / 2;
    const y2 = TILE_SIZE / 2;
    // Unique gradient id per projectile position/direction
    const gradId = `trail-gradient-${row}-${col}-${direction.x}-${direction.y}`;
    return (_jsxs("svg", { width: TILE_SIZE, height: TILE_SIZE, style: {
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
            zIndex: 1,
        }, children: [_jsx("defs", { children: _jsxs("linearGradient", { id: gradId, x1: x1, y1: y1, x2: x2, y2: y2, gradientUnits: "userSpaceOnUse", children: [_jsx("stop", { offset: "0%", stopColor: "white", stopOpacity: "0" }), _jsx("stop", { offset: "100%", stopColor: "white", stopOpacity: "0.4" })] }) }), _jsx("line", { x1: x1, y1: y1, x2: x2, y2: y2, stroke: `url(#${gradId})`, strokeWidth: 3 })] }));
};
export default Board;
