import React from 'react';
import type { Action, ActionType, Echo } from '../types/gameTypes';
import { playGlassImpact } from '../assets/sounds/playSound';

interface EchoActionSidebarProps {
  isNewEcho: boolean;
  maxActionPoints: number;
  displayTick: number;
  remainingPoints: number;
  actions: Action[];
  selectingDirection: ActionType | null;
  pendingEcho: Echo;
  availableActions: { type: ActionType; label: string; cost: number; needsDirection: boolean }[];
  handleActionSelect: (actionType: ActionType, cost: number) => void;
  handleUndoLastAction: () => void;
}

const EchoActionSidebar: React.FC<EchoActionSidebarProps> = ({
  isNewEcho,
  maxActionPoints,
  displayTick,
  remainingPoints,
  actions,
  selectingDirection,
  pendingEcho,
  availableActions,
  handleActionSelect,
  handleUndoLastAction,
}) => {
  return (
    <div style={{ color: 'white', background: '#222', padding: '2rem', borderRadius: 12, maxWidth: 340, margin: '2rem 0' }}>
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
      <p>Select an action:</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {availableActions.map(a => (
          <button
            key={a.type}
            onClick={() => handleActionSelect(a.type, a.cost)}
            onMouseEnter={() => playGlassImpact()}
          >
            {a.label} ({a.cost})
          </button>
        ))}
      </div>
    </div>
  );
};

export default EchoActionSidebar; 
