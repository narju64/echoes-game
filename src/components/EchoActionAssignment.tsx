import React, { useState } from 'react';
import type { Echo, Action, ActionType, Direction, PlayerId } from '../types/gameTypes';
import Board from './Board';
import { simulateAllyPreviewAtTick } from '../pages/GamePage';

const ACTIONS: { type: ActionType; label: string; cost: number; needsDirection: boolean }[] = [
  { type: 'walk', label: 'Walk', cost: 1, needsDirection: true },
  { type: 'dash', label: 'Dash', cost: 2, needsDirection: true },
  { type: 'fire', label: 'Fire', cost: 2, needsDirection: true },
  { type: 'mine', label: 'Mine', cost: 2, needsDirection: true },
  { type: 'shield', label: 'Shield', cost: 1, needsDirection: true },
];

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
}

interface SimulatedProjectile {
  position: { row: number; col: number };
  direction: Direction;
  type: 'projectile' | 'mine';
  spawnedTick: number;
}

const EchoActionAssignment: React.FC<EchoActionAssignmentProps> = ({ pendingEcho, onComplete, allEchoes }) => {
  const [actions, setActions] = useState<Action[]>([]);
  const [selectingDirection, setSelectingDirection] = useState<ActionType | null>(null);
  const [selectedActionType, setSelectedActionType] = useState<ActionType | null>(null);
  
  // Determine if this is a new echo or extended echo based on action points
  const isNewEcho = pendingEcho.actionPoints === 5;
  const maxActionPoints = pendingEcho.actionPoints;
  
  // For extended echoes, start from the tick after existing instructions
  const startingTick = isNewEcho ? 1 : pendingEcho.instructionList.length + 1;
  const [currentTick, setCurrentTick] = useState(startingTick);

  // Only show alive allies (not enemies)
  const allies = allEchoes.filter(e => e.playerId === pendingEcho.playerId && e.alive && e.id !== pendingEcho.id);

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
  const allyPreview = simulateAllyPreviewAtTick(allEchoes, pendingEcho.playerId, currentTick);

  // Calculate remaining action points
  const usedPoints = actions.reduce((sum, a) => sum + a.cost, 0);
  const remainingPoints = maxActionPoints - usedPoints;

  // Current tick for display (1-based)
  const displayTick = currentTick;

  // Check if the last action was a shield (either in existing instructions or new actions)
  const lastAction = actions.length > 0 ? actions[actions.length - 1] : 
                    pendingEcho.instructionList.length > 0 ? pendingEcho.instructionList[pendingEcho.instructionList.length - 1] : null;
  const lastActionWasShield = lastAction && lastAction.type === 'shield';

  // Filter actions to prevent consecutive shield actions
  const availableActions = ACTIONS.filter(a => {
    // Filter by cost
    if (a.cost > remainingPoints) return false;
    // Filter out shield if last action was shield
    if (a.type === 'shield' && lastActionWasShield) return false;
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

  return (
    <div style={{ color: 'white', background: '#222', padding: '2rem', borderRadius: 12, maxWidth: 400, margin: '2rem auto' }}>
      <h2>Assign Actions to Echo</h2>
      <p style={{ color: isNewEcho ? '#4CAF50' : '#2196F3', fontWeight: 'bold' }}>
        {isNewEcho ? 'New Echo' : 'Extended Echo'} ({maxActionPoints} Action Points)
      </p>
      <p>Current Tick: {displayTick}</p>
      <p>Remaining Action Points: {remainingPoints}</p>
      
      {/* Undo button */}
      {(actions.length > 0 || selectingDirection) && (
        <div style={{ marginBottom: '1rem' }}>
          <button 
            onClick={handleUndoLastAction}
            style={{
              background: '#ff5722',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            ↩ Undo Last Action
          </button>
        </div>
      )}
      
      {/* Show existing instructions for extended echoes */}
      {!isNewEcho && pendingEcho.instructionList.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontWeight: 'bold', color: '#ccc' }}>Existing Instructions:</p>
          <ol style={{ color: '#ccc', fontSize: '0.9rem' }}>
            {pendingEcho.instructionList.map((a, i) => (
              <li key={i}>{a.type.toUpperCase()} ({a.direction.x},{a.direction.y}) [Tick: {a.tick}]</li>
            ))}
          </ol>
        </div>
      )}
      
      {/* Show new actions being assigned */}
      {actions.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontWeight: 'bold', color: '#4CAF50' }}>New Actions:</p>
          <ol style={{ color: '#4CAF50' }}>
            {actions.map((a, i) => (
              <li key={i}>{a.type.toUpperCase()} ({a.direction.x},{a.direction.y}) [Tick: {a.tick}, Cost: {a.cost}]</li>
            ))}
          </ol>
        </div>
      )}
      
      {selectingDirection ? (
        <div>
          <p>Select direction by clicking a highlighted adjacent tile:</p>
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
          <p>Select an action:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {availableActions.map(a => (
              <button key={a.type} onClick={() => handleActionSelect(a.type, a.cost)}>{a.label} ({a.cost})</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EchoActionAssignment; 