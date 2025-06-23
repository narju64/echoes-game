import React from 'react';
import type { PlayerId, Echo } from '../types/gameTypes';

interface EchoSelectionProps {
  currentPlayer: PlayerId;
  existingEchoes: Echo[];
  onNewEcho: () => void;
  onExtendEcho: () => void;
}

const EchoSelection: React.FC<EchoSelectionProps> = ({ 
  currentPlayer, 
  existingEchoes, 
  onNewEcho, 
  onExtendEcho 
}) => {
  // Filter to only show current player's alive echoes
  const playerEchoes = existingEchoes.filter(
    echo => echo.playerId === currentPlayer && echo.alive
  );

  const hasExistingEchoes = playerEchoes.length > 0;

  return (
    <div style={{ 
      color: 'white', 
      background: '#222', 
      padding: '2rem', 
      borderRadius: 12, 
      maxWidth: 400, 
      margin: '2rem auto',
      textAlign: 'center'
    }}>
      <h2>Choose Echo Action</h2>
      <p style={{ marginBottom: '2rem' }}>
        {currentPlayer === 'player1' ? 'Player 1 (Red)' : 'Player 2 (Blue)'}'s Turn
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <button
          onClick={onNewEcho}
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
          Create New Echo (5 Action Points)
        </button>
        
        {hasExistingEchoes && (
          <button
            onClick={onExtendEcho}
            style={{
              padding: '1rem 2rem',
              fontSize: '1.2rem',
              background: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Extend Existing Echo (3 Action Points)
          </button>
        )}
      </div>
      
      {hasExistingEchoes && (
        <p style={{ 
          marginTop: '1rem', 
          fontSize: '0.9rem', 
          color: '#ccc',
          fontStyle: 'italic'
        }}>
          You have {playerEchoes.length} existing echo{playerEchoes.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
};

export default EchoSelection; 