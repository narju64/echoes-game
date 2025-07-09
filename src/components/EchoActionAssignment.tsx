import React, { useState } from 'react';
import type { Echo, Action, ActionType, Direction } from '../types/gameTypes';
import Board from './Board';
import { simulateAllyPreviewAtTick } from '../pages/GamePage';
import { playGlassImpact, playClickSound } from '../assets/sounds/playSound';

const ACTIONS: { type: ActionType; label: string; cost: number; needsDirection: boolean }[] = [
  { type: 'walk', label: 'Walk', cost: 1, needsDirection: true },
  { type: 'dash', label: 'Dash', cost: 2, needsDirection: true },
  { type: 'fire', label: 'Fire', cost: 2, needsDirection: true },
  { type: 'mine', label: 'Mine', cost: 2, needsDirection: true },
  { type: 'shield', label: 'Shield', cost: 1, needsDirection: true },
];

// Action Button Component with futuristic styling
interface ActionButtonProps {
  action: { type: ActionType; label: string; cost: number; needsDirection: boolean };
  onClick: () => void;
  disabled?: boolean;
  selected?: boolean;
  onMouseEnter?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({ action, onClick, disabled = false, selected = false, onMouseEnter }) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const getActionColor = (type: ActionType) => {
    switch (type) {
      case 'walk': return '#4CAF50'; // Green
      case 'dash': return '#FF9800'; // Orange
      case 'fire': return '#F44336'; // Red
      case 'mine': return '#9C27B0'; // Purple
      case 'shield': return '#2196F3'; // Blue
      default: return '#666';
    }
  };

  const getActionIcon = (type: ActionType) => {
    switch (type) {
      case 'walk': return '👣';
      case 'dash': return '⚡';
      case 'fire': return '🔥';
      case 'mine': return '💣';
      case 'shield': return '🛡️';
      default: return '❓';
    }
  };

  const color = getActionColor(action.type);
  const icon = getActionIcon(action.type);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        position: 'relative',
        background: disabled ? '#333' : selected ? `linear-gradient(145deg, ${color}40, ${color}60)` : `linear-gradient(145deg, ${color}20, ${color}40)`,
        color: disabled ? '#666' : 'white',
        border: `2px solid ${disabled ? '#444' : selected ? `${color}80` : color}`,
        padding: isMobile ? '2px 4px' : '8px 10px',
        borderRadius: '8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: isMobile ? '0.6rem' : '0.7rem',
        fontWeight: 'bold',
        fontFamily: 'Orbitron, monospace',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        minWidth: isMobile ? '48px' : '50px',
        width: isMobile ? '56px' : '76px',
        maxWidth: isMobile ? '64px' : '90px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: disabled ? 'none' : selected ? `0 0 16px ${color}80, inset 0 1px 0 ${color}90` : `0 0 8px ${color}40, inset 0 1px 0 ${color}60`,
        textShadow: disabled ? 'none' : selected ? `0 0 8px ${color}` : `0 0 4px ${color}`,
        overflow: 'hidden',
        transform: selected ? 'scale(1.05)' : 'scale(1)',
        margin: isMobile ? '2px' : '0',
      }}
      onMouseEnter={(e) => {
        if (onMouseEnter) onMouseEnter(e);
        if (!disabled) {
          e.currentTarget.style.transform = selected ? 'scale(1.05) translateY(-2px)' : 'translateY(-2px) scale(1.02)';
          e.currentTarget.style.boxShadow = selected ? `0 4px 20px ${color}90, inset 0 1px 0 ${color}90` : `0 4px 16px ${color}60, inset 0 1px 0 ${color}80`;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = selected ? 'scale(1.05)' : 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = selected ? `0 0 16px ${color}80, inset 0 1px 0 ${color}90` : `0 0 8px ${color}40, inset 0 1px 0 ${color}60`;
        }
      }}
    >
      {/* Glowing background effect */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: disabled ? 'none' : `radial-gradient(circle at 50% 50%, ${color}20 0%, transparent 70%)`,
          opacity: 0,
          transition: 'opacity 0.3s',
          pointerEvents: 'none',
        }}
        className="action-button-glow"
      />
      
      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? '1px' : '4px' }}>
        <span style={{ fontSize: isMobile ? '0.9rem' : '1.2rem' }}>{icon}</span>
        <span style={{ fontSize: isMobile ? '0.6rem' : '0.7rem' }}>{action.label}</span>
        <span style={{ 
          fontSize: isMobile ? '0.6rem' : '0.8rem',
          opacity: 0.8,
          background: disabled ? '#444' : `${color}40`,
          padding: isMobile ? '1px 4px' : '2px 6px',
          borderRadius: '4px',
          border: `1px solid ${disabled ? '#555' : color}`
        }}>
          {action.cost} AP
        </span>
      </div>

      {/* CSS for glow animation and responsive tweaks */}
      <style>
        {`
          @keyframes action-button-pulse {
            0% { opacity: 0; }
            50% { opacity: 0.3; }
            100% { opacity: 0; }
          }
          .action-button-glow {
            animation: action-button-pulse 2s infinite;
          }
          @media (max-width: 399px) {
            .echo-action-buttons-container button {
              font-size: 2.8vw !important;
              min-width: 14vw !important;
              width: 16vw !important;
              max-width: 20vw !important;
              padding: 1vw 1.5vw !important;
            }
            .echo-action-buttons-container span {
              font-size: 2.8vw !important;
            }
            .echo-action-buttons-container span:first-child {
              font-size: 4vw !important;
            }
          }
          @media (max-width: 340px) {
            .echo-action-buttons-container button {
              font-size: 2.2vw !important;
              min-width: 12vw !important;
              width: 14vw !important;
              max-width: 18vw !important;
              padding: 0.5vw 1vw !important;
            }
            .echo-action-buttons-container span {
              font-size: 2.2vw !important;
            }
            .echo-action-buttons-container span:first-child {
              font-size: 3vw !important;
            }
          }
        `}
      </style>
    </button>
  );
};

const ORTHOGONAL_DIRS: Direction[] = [
  { x: 0, y: 1 }, // N
  { x: 1, y: 0 }, // E
  { x: 0, y: -1 }, // S
  { x: -1, y: 0 }, // W
];
const ALL_DIRS: Direction[] = [
  { x: 0, y: 1 }, // N
  { x: 1, y: 1 }, // NE
  { x: 1, y: 0 }, // E
  { x: 1, y: -1 }, // SE
  { x: 0, y: -1 }, // S
  { x: -1, y: -1 }, // SW
  { x: -1, y: 0 }, // W
  { x: -1, y: 1 }, // NW
];

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

function getValidDirectionTiles(pos: { row: number; col: number }, dirs: Direction[], dash: boolean = false) {
  const tiles = [];
  const { row, col } = pos;
  for (const d of dirs) {
    const r = row + d.y * (dash ? 2 : 1);
    const c = col + d.x * (dash ? 2 : 1);
    if (r >= 0 && r < 8 && c >= 0 && c < 8) {
      tiles.push({ row: r, col: c });
    }
  }
  return tiles;
}

interface EchoActionAssignmentProps {
  pendingEcho: Echo;
  onComplete: (finalEcho: Echo) => void;
  allEchoes: Echo[];
  gameMode: string;
}

interface SimulatedProjectile {
  position: { row: number; col: number };
  direction: Direction;
  type: 'projectile' | 'mine';
  spawnedTick: number;
}

const EchoActionAssignment: React.FC<EchoActionAssignmentProps> = ({ pendingEcho, onComplete, allEchoes, gameMode }) => {
  const [actions, setActions] = useState<Action[]>([]);
  const [selectingDirection, setSelectingDirection] = useState<ActionType | null>(null);
  const [selectedActionType, setSelectedActionType] = useState<ActionType | null>(null);
  
  // Determine if this is a new echo or extended echo based on action points
  const isNewEcho = pendingEcho.actionPoints === 5;
  const maxActionPoints = pendingEcho.actionPoints;
  
  // For extended echoes, start from the tick after existing instructions
  const startingTick = isNewEcho ? 1 : pendingEcho.instructionList.length + 1;
  const [currentTick, setCurrentTick] = useState(startingTick);

  // Helper to simulate echo and projectiles up to a given number of actions
  function simulate(actionsToSim: Action[]) {
    let simPos = { ...pendingEcho.position };
    let simProjectiles: SimulatedProjectile[] = [];
    
    // For extended echoes, simulate existing instructions first
    const allInstructions = [...pendingEcho.instructionList, ...actionsToSim];
    
    for (let i = 0; i < allInstructions.length; i++) {
      // 1. Move all projectiles spawned in previous ticks
      simProjectiles = simProjectiles.map(p => {
        if (p.type === 'projectile' && p.spawnedTick < i) {
          return {
            ...p,
            position: {
              row: p.position.row + p.direction.y,
              col: p.position.col + p.direction.x,
            },
          };
        }
        return p;
      });
      // 2. Process the echo's action for this tick
      const a = allInstructions[i];
      if (a.type === 'walk') {
        simPos = { row: simPos.row + a.direction.y, col: simPos.col + a.direction.x };
      } else if (a.type === 'dash') {
        simPos = { row: simPos.row + a.direction.y * 2, col: simPos.col + a.direction.x * 2 };
      } else if (a.type === 'fire') {
        simProjectiles.push({ position: { row: simPos.row + a.direction.y, col: simPos.col + a.direction.x }, direction: a.direction, type: 'projectile', spawnedTick: i });
      } else if (a.type === 'mine') {
        simProjectiles.push({ position: { row: simPos.row + a.direction.y, col: simPos.col + a.direction.x }, direction: a.direction, type: 'mine', spawnedTick: i });
      }
      // Shield does not move or spawn anything
    }
    return { simPos, simProjectiles };
  }

  // For direction selection, simulate up to previous action
  const simForDirection = simulate(actions);
  // For idle/summary, simulate all actions
  const simForIdle = simulate(actions);

  // Prepare preview echoes and projectiles for the board
  const previewEchoes = [
    { ...pendingEcho, ...simForIdle.simPos, position: simForIdle.simPos, instructionList: [...pendingEcho.instructionList, ...actions] },
  ];
  const previewProjectiles = simForIdle.simProjectiles.map((p) => ({
    row: p.position.row,
    col: p.position.col,
    type: p.type,
    direction: p.direction,
  }));

  // For direction selection, use the pre-action state
  const dirEchoes = [
    { ...pendingEcho, ...simForDirection.simPos, position: simForDirection.simPos, instructionList: [...pendingEcho.instructionList, ...actions] },
  ];
  const dirProjectiles = simForDirection.simProjectiles.map((p) => ({
    row: p.position.row,
    col: p.position.col,
    type: p.type,
    direction: p.direction,
  }));

  // Calculate ally previews at current tick
  const otherAllies = allEchoes.filter(e => e.playerId === pendingEcho.playerId && e.id !== pendingEcho.id && e.alive);
  const allyPreview = simulateAllyPreviewAtTick(otherAllies, pendingEcho.playerId, currentTick);

  // Calculate remaining action points
  const usedPoints = actions.reduce((sum, a) => sum + a.cost, 0);
  const remainingPoints = maxActionPoints - usedPoints;

  // Current tick for display (1-based)
  const displayTick = currentTick;

  // Check if the last action was a shield (either in existing instructions or new actions)
  const lastAction = actions.length > 0 ? actions[actions.length - 1] : 
                    pendingEcho.instructionList.length > 0 ? pendingEcho.instructionList[pendingEcho.instructionList.length - 1] : null;
  const lastActionWasShield = lastAction && lastAction.type === 'shield';

  // Check if a mine action has already been assigned in this turn
  const mineAlreadyUsed = actions.some(a => a.type === 'mine') || pendingEcho.instructionList.some(a => a.type === 'mine');

  // Filter actions to prevent consecutive shield actions and only one mine per turn
  const availableActions = ACTIONS.filter(a => {
    // Filter by cost
    if (a.cost > remainingPoints) return false;
    // Filter out shield if last action was shield
    if (a.type === 'shield' && lastActionWasShield) return false;
    // Filter out mine if already used
    if (a.type === 'mine' && mineAlreadyUsed) return false;
    return true;
  });

  // Handle action selection
  const handleActionSelect = (actionType: ActionType, cost: number) => {
    if (remainingPoints < cost) return;
    setSelectedActionType(actionType);
    setSelectingDirection(actionType);
  };

  // Handle direction selection via board
  const handleDirectionSelect = (dir: Direction) => {
    playClickSound();
    if (!selectedActionType) return;
    const cost = ACTIONS.find(a => a.type === selectedActionType)!.cost;
    
    // Calculate the correct tick number for this action
    const actionTick = pendingEcho.instructionList.length + actions.length + 1;
    
    setActions([...actions, { type: selectedActionType, direction: dir, tick: actionTick, cost }]);
    setCurrentTick(currentTick + 1);
    setSelectingDirection(null);
    setSelectedActionType(null);
  };

  // Handle undoing the last action
  const handleUndoLastAction = () => {
    // If currently selecting direction, just cancel that selection
    if (selectingDirection) {
      setSelectingDirection(null);
      setSelectedActionType(null);
      return;
    }
    
    // Otherwise, undo the last completed action
    if (actions.length === 0) return;
    
    const newActions = actions.slice(0, -1);
    setActions(newActions);
    setCurrentTick(currentTick - 1);
    setSelectingDirection(null);
    setSelectedActionType(null);
  };

  // When all points are spent, finalize
  React.useEffect(() => {
    if (remainingPoints === 0) {
      // Combine existing instructions with new actions
      const combinedInstructions = [...pendingEcho.instructionList, ...actions];
      onComplete({
        ...pendingEcho,
        instructionList: combinedInstructions,
        startingPosition: (pendingEcho as any).startingPosition || { ...pendingEcho.position },
      } as Echo & { startingPosition: { row: number; col: number } });
    }
    // eslint-disable-next-line
  }, [remainingPoints]);

  // Determine which directions are valid for the selected action
  let validDirs: Direction[] = [];
  let dash = false;
  if (selectingDirection) {
    if (selectingDirection === 'dash') {
      validDirs = ORTHOGONAL_DIRS;
      dash = true;
    } else {
      validDirs = ALL_DIRS;
    }
  }
  const highlightedTiles = selectingDirection
    ? getValidDirectionTiles(simForDirection.simPos, validDirs, dash)
    : [];

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      {/* Sidebar positioned relative to board */}
      <div style={{ position: 'relative' }}>
        <div style={{ 
          position: 'absolute',
          ...(isMobile && gameMode === 'multiplayer' ? {
            left: '50%',
            transform: 'translateX(-50%)',
            top: 'calc(100% + 4px)',
            width: '95vw',
            maxWidth: '430px',
            height: 'auto',
            maxHeight: '60vh'
          } : isMobile ? {
            left: '50%',
            transform: 'translateX(-50%)',
            top: 'calc(100% + 20px)',
            width: '95vw',
            maxWidth: '430px',
            height: 'auto',
            maxHeight: '60vh'
          } : {
          right: 'calc(100% + 60px)',
          top: '64px',
            width: '430px',
            height: '640px'
          }),
          color: 'white', 
          background: '#222', 
          padding: isMobile ? '0.5rem' : '1rem', 
          borderRadius: 12, 
          minWidth: 240, 
          overflowY: 'auto',
          zIndex: 10,
          fontSize: isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? '0.7rem' : (isMobile ? '0.8rem' : '1rem')
        }}>
          {isMobile ? (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              marginBottom: '0.5rem'
            }}>
              <div>
                <h2 style={{ margin: '0 0 0.5rem 0', fontSize: isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? '0.8rem' : '1.5rem' }}>Assign Actions to Echo</h2>
                <p style={{ color: isNewEcho ? '#4CAF50' : '#2196F3', fontWeight: 'bold', margin: '0 0 0.5rem 0', fontSize: isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? '0.7rem' : '1rem' }}>
                  {isNewEcho ? 'New Echo' : 'Extended Echo'} ({maxActionPoints} Action Points)
                </p>
                {/* Current Tick and Remaining Action Points */}
                {isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? (
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.7rem', textAlign: 'center' }}>
                    Current Tick: {displayTick} | Remaining AP: {remainingPoints}
                  </p>
                ) : (
                  <>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? '0.7rem' : '1rem' }}>Current Tick: {displayTick}</p>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? '0.7rem' : '1rem' }}>Remaining Action Points: {remainingPoints}</p>
                  </>
                )}
              </div>
              {/* Undo button - positioned in top right on mobile */}
              {(actions.length > 0 || selectingDirection) && (
                <button 
                  onClick={handleUndoLastAction}
                  style={{
                    position: 'relative',
                    background: 'linear-gradient(145deg, #ff572220, #ff572240)',
                    color: 'white',
                    border: '2px solid #ff5722',
                    padding: '4px 8px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.6rem',
                    fontWeight: 'bold',
                    fontFamily: 'Orbitron, monospace',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 0 8px #ff572240, inset 0 1px 0 #ff572260',
                    textShadow: '0 0 4px #ff5722',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    playGlassImpact();
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 4px 16px #ff572260, inset 0 1px 0 #ff572280';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = '0 0 8px #ff572240, inset 0 1px 0 #ff572260';
                  }}
                >
                  <span style={{ fontSize: '0.9rem' }}>↩</span>
                </button>
              )}
            </div>
          ) : (
            <>
              <h2 style={{ margin: '0 0 0.5rem 0', fontSize: isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? '0.8rem' : '1.5rem' }}>Assign Actions to Echo</h2>
              <p style={{ color: isNewEcho ? '#4CAF50' : '#2196F3', fontWeight: 'bold', margin: '0 0 0.5rem 0', fontSize: isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? '0.7rem' : '1rem' }}>
            {isNewEcho ? 'New Echo' : 'Extended Echo'} ({maxActionPoints} Action Points)
          </p>
              {/* Current Tick and Remaining Action Points */}
              {isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? (
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.7rem', textAlign: 'center' }}>
                  Current Tick: {displayTick} | Remaining AP: {remainingPoints}
                </p>
              ) : (
                <>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? '0.7rem' : '1rem' }}>Current Tick: {displayTick}</p>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: isMobile && typeof window !== 'undefined' && window.innerWidth === 320 ? '0.7rem' : '1rem' }}>Remaining Action Points: {remainingPoints}</p>
                </>
              )}
              {/* Undo button - original position for desktop */}
          {(actions.length > 0 || selectingDirection) && (
            <div style={{ marginBottom: '0.5rem' }}>
              <button 
                onClick={handleUndoLastAction}
                style={{
                  position: 'relative',
                  background: 'linear-gradient(145deg, #ff572220, #ff572240)',
                  color: 'white',
                  border: '2px solid #ff5722',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  fontFamily: 'Orbitron, monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 0 8px #ff572240, inset 0 1px 0 #ff572260',
                  textShadow: '0 0 4px #ff5722',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  playGlassImpact();
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 4px 16px #ff572260, inset 0 1px 0 #ff572280';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 0 8px #ff572240, inset 0 1px 0 #ff572260';
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>↩</span>
                <span>Undo Last Action</span>
              </button>
            </div>
              )}
            </>
          )}
          {/* Show existing instructions for extended echoes */}
          {!isNewEcho && pendingEcho.instructionList.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <p style={{ fontWeight: 'bold', color: '#ccc' }}>Existing Instructions:</p>
              <ol style={{ color: '#ccc', fontSize: '0.9rem' }}>
                {pendingEcho.instructionList.map((a, i) => (
                  <li key={i}>{a.type.toUpperCase()} ({a.direction.x},{a.direction.y}) [Tick: {a.tick}]</li>
                ))}
              </ol>
            </div>
          )}
          {!isMobile && <p style={{ fontSize: '1rem' }}>Select an action:</p>}
          <div className="echo-action-buttons-container" style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: isMobile ? 4 : 4,
            justifyContent: 'center',
            width: isMobile ? '100%' : 'auto',
            margin: isMobile ? '0 auto 0 auto' : undefined,
            maxWidth: isMobile ? '100vw' : 'none',
          }}>
            {availableActions.map(a => (
              <ActionButton
                key={a.type}
                action={a}
                onClick={() => {
                  if (a.type === selectedActionType) return;
                  playClickSound();
                  handleActionSelect(a.type, a.cost);
                }}
                disabled={a.cost > remainingPoints}
                selected={a.type === selectedActionType}
              />
            ))}
          </div>
          {/* Show new actions being assigned - moved to bottom */}
          {actions.length > 0 && (
            <div style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
              <p style={{ fontWeight: 'bold', color: '#4CAF50', fontSize: isMobile ? '0.8rem' : '1rem' }}>New Actions:</p>
              <div style={{ color: '#4CAF50', fontFamily: 'monospace', fontSize: isMobile ? '0.7rem' : '0.9rem' }}>
                {/* Show tick 0 (spawned) */}
                <div style={{ display: 'grid', gridTemplateColumns: '15px 10px 1fr', gap: '8px', alignItems: 'center' }}>
                  <span>0.</span>
                  <span>{getBoardPosition(pendingEcho.position.row, pendingEcho.position.col)}</span>
                  <span>: SPAWNED</span>
                </div>
                {/* Show each action with position and cardinal direction */}
                {actions.map((a, i) => {
                  // Calculate position for this tick
                  let currentPos = { ...pendingEcho.position };
                  for (let j = 0; j <= i; j++) {
                    const action = actions[j];
                    if (action.type === 'walk') {
                      currentPos = { 
                        row: currentPos.row + action.direction.y, 
                        col: currentPos.col + action.direction.x 
                      };
                    } else if (action.type === 'dash') {
                      currentPos = { 
                        row: currentPos.row + action.direction.y * 2, 
                        col: currentPos.col + action.direction.x * 2 
                      };
                    }
                  }
                  
                  // Convert direction to cardinal format
                  const getCardinalDirection = (dir: Direction) => {
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
                  
                  return (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '15px 10px 70px 30px 15px 50px', gap: '8px', alignItems: 'center' }}>
                      <span>{a.tick}.</span>
                      <span>{getBoardPosition(currentPos.row, currentPos.col)}</span>
                      <span>: {a.type.toUpperCase()}</span>
                      <span>({getCardinalDirection(a.direction)})</span>
                      <span>-</span>
                      <span>{a.cost} AP</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        {/* Board - centered */}
        <div className="echo-action-board">
          {selectingDirection ? (
            <div>
              <Board
                echoes={dirEchoes}
                highlightedTiles={highlightedTiles}
                origin={simForDirection.simPos}
                onDirectionSelect={handleDirectionSelect}
                projectiles={dirProjectiles}
                previewEchoes={allyPreview.echoes}
                previewProjectiles={allyPreview.projectiles}
              />
            </div>
          ) : (
            <div>
              <Board
                echoes={previewEchoes}
                highlightedTiles={[]}
                projectiles={previewProjectiles}
                previewEchoes={allyPreview.echoes}
                previewProjectiles={allyPreview.projectiles}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EchoActionAssignment; 
