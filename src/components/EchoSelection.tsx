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
  const canCreateNewEcho = playerEchoes.length < 8;

  return (
    <div style={{ 
      position: 'absolute',
      right: 'calc(100% + 60px)',
      top: '64px',
      color: 'white', 
      background: '#222', 
      padding: '1rem', 
      borderRadius: 12, 
      width: '430px', 
      height: '640px', 
      minWidth: 240, 
      maxWidth: 430, 
      overflowY: 'auto',
      zIndex: 10
    }}>
      <h2>Choose Echo Action</h2>
      <p style={{
        marginBottom: '2rem',
        color: currentPlayer === 'player1' ? '#ff9800' : 'blue',
        fontWeight: 'bold',
        textShadow: '0 0 1px #fff'
      }}>
        {currentPlayer === 'player1' ? 'Player 1 (Orange)' : 'Player 2 (Blue)'}'s Turn
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {canCreateNewEcho && (
          <button
            onClick={onNewEcho}
            style={{
              position: 'relative',
              background: 'linear-gradient(145deg, #4CAF5020, #4CAF5040)',
              color: 'white',
              border: '2px solid #4CAF50',
              padding: '1rem 2rem',
              fontSize: '1.2rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontFamily: 'Orbitron, monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 0 8px #4CAF5040, inset 0 1px 0 #4CAF5060',
              textShadow: '0 0 4px #4CAF50',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 4px 16px #4CAF5060, inset 0 1px 0 #4CAF5080';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 0 8px #4CAF5040, inset 0 1px 0 #4CAF5060';
            }}
          >
            <span style={{ fontSize: '1.4rem' }}>✨</span>
            <span>Create New Echo (5 Action Points)</span>
          </button>
        )}
        
        {hasExistingEchoes && (
          <button
            onClick={onExtendEcho}
            style={{
              position: 'relative',
              background: 'linear-gradient(145deg, #2196F320, #2196F340)',
              color: 'white',
              border: '2px solid #2196F3',
              padding: '1rem 2rem',
              fontSize: '1.2rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontFamily: 'Orbitron, monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 0 8px #2196F340, inset 0 1px 0 #2196F360',
              textShadow: '0 0 4px #2196F3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 4px 16px #2196F360, inset 0 1px 0 #2196F380';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 0 8px #2196F340, inset 0 1px 0 #2196F360';
            }}
          >
            <span style={{ fontSize: '1.4rem' }}>⚡</span>
            <span>Extend Existing Echo (3 Action Points)</span>
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