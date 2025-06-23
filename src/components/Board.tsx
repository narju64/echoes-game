import React from 'react';
import type { Echo, Direction } from '../types/gameTypes';

const BOARD_SIZE = 8;
const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const ROW_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8'];

interface ProjectilePreview {
  row: number;
  col: number;
  type: 'projectile' | 'mine';
  direction: Direction;
}

interface BoardProps {
  echoes: Echo[];
  highlightedTiles?: { row: number; col: number }[];
  onTileClick?: (row: number, col: number) => void;
  // For direction selection mode:
  origin?: { row: number; col: number };
  onDirectionSelect?: (dir: Direction) => void;
  projectiles?: ProjectilePreview[];
}

const TILE_SIZE = 48; // px
const TRAIL_LENGTH = 3;
const BASE_OPACITY = 0.3;

const Board: React.FC<BoardProps> = ({ echoes, highlightedTiles = [], onTileClick, origin, onDirectionSelect, projectiles = [] }) => {
  // Helper to check if a tile is highlighted
  const isHighlighted = (row: number, col: number) =>
    highlightedTiles.some(t => t.row === row && t.col === col);

  // Helper to check if a tile is the origin
  const isOrigin = (row: number, col: number) =>
    origin && origin.row === row && origin.col === col;

  // Helper to get direction vector from origin to target
  const getDirection = (from: { row: number; col: number }, to: { row: number; col: number }): Direction => {
    const dx = Math.sign(to.col - from.col) as -1 | 0 | 1;
    const dy = Math.sign(to.row - from.row) as -1 | 0 | 1;
    return { x: dx, y: dy };
  };

  // Helper to find projectile/mine at a tile
  const getProjectile = (row: number, col: number) =>
    projectiles.find(p => p.row === row && p.col === col);

  return (
    <div style={{ display: 'inline-block', background: 'black', padding: 16, borderRadius: 12 }}>
      {/* Column labels */}
      <div style={{ display: 'flex', marginLeft: TILE_SIZE, marginBottom: 4 }}>
        {COL_LABELS.map((label) => (
          <div key={label} style={{ width: TILE_SIZE, textAlign: 'center', color: 'white', fontWeight: 'bold' }}>{label}</div>
        ))}
      </div>
      {/* Board grid (rows from bottom to top) */}
      {Array.from({ length: BOARD_SIZE }).map((_, displayRowIdx) => {
        const rowIdx = BOARD_SIZE - 1 - displayRowIdx;
        return (
          <div key={rowIdx} style={{ display: 'flex', alignItems: 'center' }}>
            {/* Row label */}
            <div style={{ width: TILE_SIZE, textAlign: 'center', color: 'white', fontWeight: 'bold' }}>{ROW_LABELS[rowIdx]}</div>
            {/* Tiles */}
            {Array.from({ length: BOARD_SIZE }).map((_, colIdx) => {
              const echo = echoes.find(e => e.position.row === rowIdx && e.position.col === colIdx && e.alive);
              const highlighted = isHighlighted(rowIdx, colIdx);
              const originHere = isOrigin(rowIdx, colIdx);
              const projectile = getProjectile(rowIdx, colIdx);
              return (
                <div
                  key={colIdx}
                  style={{
                    width: TILE_SIZE,
                    height: TILE_SIZE,
                    border: '1px solid white',
                    boxSizing: 'border-box',
                    position: 'relative',
                    background: highlighted ? '#333d' : 'black',
                    cursor: highlighted ? 'pointer' : 'default',
                    transition: 'background 0.2s',
                    outline: originHere ? '2px solid #61dafb' : undefined,
                  }}
                  onClick={() => {
                    if (highlighted) {
                      if (onDirectionSelect && origin) {
                        const dir = getDirection(origin, { row: rowIdx, col: colIdx });
                        onDirectionSelect(dir);
                      } else if (onTileClick) {
                        onTileClick(rowIdx, colIdx);
                      }
                    }
                  }}
                >
                  {/* Projectile trail rendering (for projectiles only) */}
                  {projectile && projectile.type === 'projectile' && (
                    <ProjectileTrail
                      row={projectile.row}
                      col={projectile.col}
                      direction={projectile.direction}
                    />
                  )}
                  {echo && (
                    <>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: echo.playerId === 'player1' ? 'red' : 'blue',
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          boxShadow: '0 0 8px 2px rgba(255,255,255,0.3)',
                        }}
                      />
                      {/* Shield rendering */}
                      {echo.isShielded && echo.shieldDirection && (
                        <svg
                          width={32}
                          height={32}
                          viewBox="0 0 32 32"
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: `translate(-50%, -50%) rotate(${getShieldRotation(echo.shieldDirection)}deg)`,
                            pointerEvents: 'none',
                          }}
                        >
                          <path
                            d="M16,16 m-16,0 a16,16 0 0,1 32,0"
                            fill="none"
                            stroke="white"
                            strokeWidth="4"
                          />
                        </svg>
                      )}
                    </>
                  )}
                  {projectile && (
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: projectile.type === 'projectile' ? 'white' : 'transparent',
                        border: projectile.type === 'mine' ? '2px solid white' : undefined,
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        boxShadow: projectile.type === 'projectile' ? '0 0 6px 2px #fff8' : undefined,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

function getShieldRotation(dir: Direction | undefined) {
  // Accepts a Direction {x, y} and returns degrees
  if (!dir) return 0;
  if (dir.x === 0 && dir.y === 1) return 0; // N
  if (dir.x === 1 && dir.y === 1) return 45; // NE
  if (dir.x === 1 && dir.y === 0) return 90; // E
  if (dir.x === 1 && dir.y === -1) return 135; // SE
  if (dir.x === 0 && dir.y === -1) return 180; // S
  if (dir.x === -1 && dir.y === -1) return 225; // SW
  if (dir.x === -1 && dir.y === 0) return 270; // W
  if (dir.x === -1 && dir.y === 1) return 315; // NW
  return 0;
}

const ProjectileTrail: React.FC<{ row: number; col: number; direction: Direction }> = ({ row, col, direction }) => {
  const prevRow = row - direction.y;
  const prevCol = col - direction.x;
  if (prevRow < 0 || prevRow > 7 || prevCol < 0 || prevCol > 7) return null;

  // Calculate start and end points (relative to current tile)
  const x1 = TILE_SIZE / 2 - direction.x * TILE_SIZE;
  const y1 = TILE_SIZE / 2 + direction.y * TILE_SIZE;
  const x2 = TILE_SIZE / 2;
  const y2 = TILE_SIZE / 2;

  // Unique gradient id per projectile position/direction
  const gradId = `trail-gradient-${row}-${col}-${direction.x}-${direction.y}`;

  return (
    <svg
      width={TILE_SIZE}
      height={TILE_SIZE}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      <defs>
        <linearGradient id={gradId} x1={x1} y1={y1} x2={x2} y2={y2} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="100%" stopColor="white" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={`url(#${gradId})`}
        strokeWidth={3}
      />
    </svg>
  );
};

export default Board; 