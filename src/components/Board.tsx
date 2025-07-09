import React from 'react';
import type { Echo, Direction } from '../types/gameTypes';
import ExplosionAnimation from './ExplosionAnimation';

const BOARD_SIZE = 8;
const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const ROW_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8'];

// Responsive tile size calculation
const getTileSize = () => {
  if (typeof window !== 'undefined') {
    if (window.innerWidth <= 768) return 40; // mobile
    if (window.innerWidth <= 1024) return 60; // tablet
    return 80; // desktop
  }
  return 80; // default
};

const getRowLabelWidth = () => {
  if (typeof window !== 'undefined') {
    if (window.innerWidth <= 768) return 24; // mobile
    if (window.innerWidth <= 1024) return 28; // tablet
    return 32; // desktop
  }
  return 32; // default
};

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
  origin?: { row: number; col: number };
  onDirectionSelect?: (dir: Direction) => void;
  projectiles?: ProjectilePreview[];
  collisions?: { row: number; col: number }[];
  shieldBlocks?: { row: number; col: number; projectileDirection: Direction }[];
  previewEchoes?: Echo[];
  previewProjectiles?: ProjectilePreview[];
}

// Helper functions for board position formatting
const getColumnLetter = (col: number): string => {
  return String.fromCharCode(65 + col); // A, B, C, etc.
};

const getRowNumber = (row: number): string => {
  return String(8 - row); // 8, 7, 6, etc. (board is displayed bottom-to-top)
};

const getBoardPosition = (row: number, col: number): string => {
  return `${getColumnLetter(col)}${getRowNumber(row)}`;
};

const getDirectionName = (dir: Direction): string => {
  if (dir.x === 0 && dir.y === 1) return '↑'; // N
  if (dir.x === 1 && dir.y === 1) return '↗'; // NE
  if (dir.x === 1 && dir.y === 0) return '→'; // E
  if (dir.x === 1 && dir.y === -1) return '↘'; // SE
  if (dir.x === 0 && dir.y === -1) return '↓'; // S
  if (dir.x === -1 && dir.y === -1) return '↙'; // SW
  if (dir.x === -1 && dir.y === 0) return '←'; // W
  if (dir.x === -1 && dir.y === 1) return '↖'; // NW
  return '?';
};

// Simple hover popup component
const EchoActionPopup: React.FC<{ echo: Echo; position: { row: number; col: number } }> = ({ echo, position }) => {
  const tileSize = getTileSize();
  const rowLabelWidth = getRowLabelWidth();
  
  return (
    <div
      className="echo-popup"
      style={{
        position: 'absolute',
        top: `${(BOARD_SIZE - 1 - position.row) * tileSize + 16 - 120}px`,
        left: `${position.col * tileSize + 16 + rowLabelWidth}px`,
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
      }}
    >
      <div style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: echo.playerId === 'player1' ? 'orange' : '#4ecdc4' }}>
        Actions ({echo.instructionList.length}):
      </div>
      {echo.instructionList.length === 0 ? (
        <div style={{ color: '#888', fontStyle: 'italic' }}>No actions assigned</div>
      ) : (
        <div style={{ color: '#ccc' }}>
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
                <div key={actionIndex} style={{ marginBottom: '0.25rem' }}>
                  Tick {action.tick}: {action.type.toUpperCase()} ({getDirectionName(action.direction)}) at {getBoardPosition(tickPosition.row, tickPosition.col)}
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
};

const Board: React.FC<BoardProps> = ({ echoes, highlightedTiles = [], onTileClick, origin, onDirectionSelect, projectiles = [], collisions = [], shieldBlocks = [], previewEchoes = [], previewProjectiles = [] }) => {
  const [activeExplosions, setActiveExplosions] = React.useState<Set<string>>(new Set());
  const [activeShieldBlocks, setActiveShieldBlocks] = React.useState<Map<string, Direction>>(new Map());
  const [hoveredEcho, setHoveredEcho] = React.useState<Echo | null>(null);
  const [windowSize, setWindowSize] = React.useState({ width: window.innerWidth, height: window.innerHeight });

  // Handle window resize for responsive design
  React.useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get current responsive sizes
  const tileSize = getTileSize();
  const rowLabelWidth = getRowLabelWidth();

  // Calculate total board width (8 tiles + 1 label column + padding)
  const boardPixelWidth = (tileSize * 8) + rowLabelWidth + (windowSize.width <= 768 ? 16 : 32); // padding matches board container
  // Calculate scale factor for mobile
  let scale = 1;
  if (windowSize.width <= 768 && boardPixelWidth > windowSize.width) {
    scale = (windowSize.width - 8) / boardPixelWidth; // 8px margin
  }

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

  // Helper to get collision key
  const getCollisionKey = (row: number, col: number) => `${row},${col}`;

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

  const handleExplosionComplete = (row: number, col: number) => {
    const key = getCollisionKey(row, col);
    setActiveExplosions(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const handleShieldBlockComplete = (row: number, col: number) => {
    const key = getCollisionKey(row, col);
    setActiveShieldBlocks(prev => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  };

  return (
    <div
      className="game-board-responsive-container"
      style={{
        margin: '0 auto',
        position: 'relative',
        width: windowSize.width <= 400 ? '100vw' : 'auto',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          display: 'inline-block',
          background: 'black',
          padding: windowSize.width <= 768 ? 8 : 16,
          borderRadius: 12,
          position: 'relative',
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'top center',
          height: windowSize.width === 320 ? '320px' : undefined,
        }}
      >
        {/* Column labels */}
        <div style={{ display: 'flex', marginBottom: 4 }}>
          <div style={{ width: rowLabelWidth }} /> {/* Empty cell for row label alignment */}
          {COL_LABELS.map((label) => (
            <div key={label} className="board-label" style={{ width: tileSize, textAlign: 'center', color: 'blue', fontWeight: 'bold', textShadow: '0 0 2px #fff' }}>{label}</div>
          ))}
        </div>
        {/* Board grid (rows from bottom to top) */}
        {Array.from({ length: BOARD_SIZE }).map((_, displayRowIdx) => {
          const rowIdx = BOARD_SIZE - 1 - displayRowIdx;
          return (
            <div key={rowIdx} style={{ display: 'flex', alignItems: 'center' }}>
              {/* Row label */}
              <div className="board-label" style={{ width: rowLabelWidth, textAlign: 'left', color: '#ff9800', fontWeight: 'bold', textShadow: '0 0 2px #fff' }}>{ROW_LABELS[rowIdx]}</div>
              {/* Tiles */}
              {Array.from({ length: BOARD_SIZE }).map((_, colIdx) => {
                const echo = echoes.find(e => e.position.row === rowIdx && e.position.col === colIdx && e.alive);
                const previewEcho = previewEchoes.find(e => e.position.row === rowIdx && e.position.col === colIdx && e.alive);
                const highlighted = isHighlighted(rowIdx, colIdx);
                const originHere = isOrigin(rowIdx, colIdx);
                const projectile = getProjectile(rowIdx, colIdx);
                const previewProjectile = previewProjectiles.find(p => p.row === rowIdx && p.col === colIdx);
                return (
                  <div
                    key={colIdx}
                    className="board-tile board-tile-glow"
                    style={{
                      width: tileSize,
                      height: tileSize,
                      border: '1px solid',
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
                    onMouseEnter={() => {
                      // Only show popup for highlighted echoes when not in direction selection mode
                      if (echo && highlighted && !onDirectionSelect) {
                        setHoveredEcho(echo);
                      }
                    }}
                    onMouseLeave={() => {
                      if (!onDirectionSelect) {
                        setHoveredEcho(null);
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
                        {/* 3D, glowing, pulsing echo */}
                        <div
                          className={`echo-3d-pulse echo-${echo.playerId}`}
                          style={{
                            width: Math.max(20, tileSize * 0.5),
                            height: Math.max(20, tileSize * 0.5),
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            zIndex: 2,
                          }}
                        />
                        <style>
                          {`
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
                          `}
                        </style>
                        {/* Shield rendering */}
                        {echo.isShielded && echo.shieldDirection && (
                          <svg
                            width={Math.max(32, tileSize * 0.8)}
                            height={Math.max(32, tileSize * 0.8)}
                            viewBox="0 0 64 64"
                            style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: `translate(-50%, -50%) rotate(${getShieldRotation(echo.shieldDirection)}deg)`,
                              pointerEvents: 'none',
                              zIndex: 10,
                              filter: 'drop-shadow(0 0 8px #4CAF50)',
                              animation: 'shield-pulse 1.5s ease-in-out infinite',
                            }}
                          >
                            {/* Static electricity effect - small dashes along the arc */}
                            {Array.from({ length: 12 }).map((_, i) => {
                              const angle = (i * 15 - 180) * (Math.PI / 180); // Start from -90 degrees (left) to +90 degrees (right)
                              const radius = 28;
                              const dashLength = 8;
                              const startAngle = angle - (dashLength / radius) / 2;
                              const endAngle = angle + (dashLength / radius) / 2;
                              const x1 = 32 + radius * Math.cos(startAngle);
                              const y1 = 32 + radius * Math.sin(startAngle);
                              const x2 = 32 + radius * Math.cos(endAngle);
                              const y2 = 32 + radius * Math.sin(endAngle);
                              
                              return (
                                <line
                                  key={i}
                                  x1={x1}
                                  y1={y1}
                                  x2={x2}
                                  y2={y2}
                                  stroke="#4CAF50"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  opacity={0.6 + Math.random() * 0.4}
                                  style={{
                                    animation: `shield-particle ${0.6 + Math.random() * 0.8}s ease-in-out infinite`,
                                    animationDelay: `${Math.random() * 0.6}s`
                                  }}
                                />
                              );
                            })}
                          </svg>
                        )}
                      </>
                    )}
                    {projectile && (
                      <div
                        style={{
                          width: Math.max(8, tileSize * 0.2),
                          height: Math.max(8, tileSize * 0.2),
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
                        }}
                      />
                    )}
                    
                    {/* Preview echo rendering (semi-transparent grey) */}
                    {previewEcho && !echo && (
                      <>
                        <div
                          style={{
                            width: Math.max(20, tileSize * 0.5),
                            height: Math.max(20, tileSize * 0.5),
                            borderRadius: '50%',
                            background: 'rgba(128, 128, 128, 0.6)',
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            boxShadow: '0 0 8px 2px rgba(128, 128, 128, 0.3)',
                          }}
                        />
                        {/* Preview shield rendering */}
                        {previewEcho.isShielded && previewEcho.shieldDirection && (
                          <svg
                            width={Math.max(32, tileSize * 0.8)}
                            height={Math.max(32, tileSize * 0.8)}
                            viewBox="0 0 64 64"
                            style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: `translate(-50%, -50%) rotate(${getShieldRotation(previewEcho.shieldDirection)}deg)`,
                              pointerEvents: 'none',
                            }}
                          >
                            <path
                              d="M32,32 m-32,0 a32,32 0 0,1 64,0"
                              fill="none"
                              stroke="rgba(128, 128, 128, 0.6)"
                              strokeWidth="4"
                            />
                          </svg>
                        )}
                      </>
                    )}
                    
                    {/* Preview projectile rendering */}
                    {previewProjectile && (
                      <>
                        {previewProjectile.type === 'projectile' && (
                          <ProjectileTrail
                            row={previewProjectile.row}
                            col={previewProjectile.col}
                            direction={previewProjectile.direction}
                          />
                        )}
                        <div
                          style={{
                            width: Math.max(8, tileSize * 0.2),
                            height: Math.max(8, tileSize * 0.2),
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
                          }}
                        />
                      </>
                    )}
                    
                    {/* Explosion animation */}
                    {activeExplosions.has(getCollisionKey(rowIdx, colIdx)) && !activeShieldBlocks.has(getCollisionKey(rowIdx, colIdx)) && (
                      <ExplosionAnimation
                        _row={rowIdx}
                        _col={colIdx}
                        onComplete={() => handleExplosionComplete(rowIdx, colIdx)}
                      />
                    )}
                    
                    {/* Shield block animation */}
                    {activeShieldBlocks.has(getCollisionKey(rowIdx, colIdx)) && (
                      <ExplosionAnimation
                        _row={rowIdx}
                        _col={colIdx}
                        onComplete={() => handleShieldBlockComplete(rowIdx, colIdx)}
                        isShieldBlock={true}
                        projectileDirection={activeShieldBlocks.get(getCollisionKey(rowIdx, colIdx))}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
        
        {/* Action popup for hovered echo */}
        {hoveredEcho && (
          <EchoActionPopup echo={hoveredEcho} position={hoveredEcho.position} />
        )}
      </div>
      <style>{`
        @media (max-width: 400px) {
          .game-board-responsive-container {
            width: auto !important;
            max-width: 100vw !important;
            overflow-x: visible !important;
          }
        }
      `}</style>
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

  const tileSize = getTileSize();

  // Calculate start and end points (relative to current tile)
  const x1 = tileSize / 2 - direction.x * tileSize;
  const y1 = tileSize / 2 + direction.y * tileSize;
  const x2 = tileSize / 2;
  const y2 = tileSize / 2;

  // Unique gradient id per projectile position/direction
  const gradId = `trail-gradient-${row}-${col}-${direction.x}-${direction.y}`;

  return (
    <svg
      width={tileSize}
      height={tileSize}
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
        strokeWidth={Math.max(2, tileSize * 0.04)}
      />
    </svg>
  );
};

export default Board; 
