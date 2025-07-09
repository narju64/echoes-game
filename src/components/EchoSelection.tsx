import React from 'react';
import type { PlayerId, Echo } from '../types/gameTypes';
import { playGlassImpact } from '../assets/sounds/playSound';

interface EchoSelectionProps {
  currentPlayer: PlayerId;
  existingEchoes: Echo[];
  onNewEcho: () => void;
  onExtendEcho: () => void;
  disabled?: boolean;
}

const EchoSelection: React.FC<EchoSelectionProps> = ({ 
  currentPlayer, 
  existingEchoes, 
  onNewEcho, 
  onExtendEcho,
  disabled = false
}) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  
  // Filter to only show current player's alive echoes
  const playerEchoes = existingEchoes.filter(
    echo => echo.playerId === currentPlayer && echo.alive
  );

  const hasExistingEchoes = playerEchoes.length > 0;
  const canCreateNewEcho = playerEchoes.length < 8;

  return (
    <div style={{ 
      position: 'absolute',
      ...(isMobile ? {
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
      fontSize: isMobile ? '0.8rem' : '1rem'
    }}>
      <h2 style={{ fontSize: isMobile ? '0.8rem' : '1.5rem' }}>Choose Echo Action</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.5rem' : '1rem' }}>
        {canCreateNewEcho && (
          <button
            onClick={disabled ? undefined : onNewEcho}
            disabled={disabled}
            style={{
              position: 'relative',
              background: disabled 
                ? 'linear-gradient(145deg, #66620, #66640)' 
                : 'linear-gradient(145deg, #4CAF5020, #4CAF5040)',
              color: disabled ? '#888' : 'white',
              border: `2px solid ${disabled ? '#666' : '#4CAF50'}`,
              padding: isMobile ? '1px 4px' : '1rem 2rem',
              fontSize: isMobile ? '0.7rem' : '1.2rem',
              borderRadius: isMobile ? '4px' : '8px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontFamily: 'Orbitron, monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: disabled 
                ? '0 0 8px #66640, inset 0 1px 0 #66660' 
                : '0 0 8px #4CAF5040, inset 0 1px 0 #4CAF5060',
              textShadow: disabled ? 'none' : '0 0 4px #4CAF50',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isMobile ? '4px' : '8px',
              opacity: disabled ? 0.6 : 1
            }}
            onMouseEnter={disabled ? undefined : (e) => {
              playGlassImpact();
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 4px 16px #4CAF5060, inset 0 1px 0 #4CAF5080';
            }}
            onMouseLeave={disabled ? undefined : (e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 0 8px #4CAF5040, inset 0 1px 0 #4CAF5060';
            }}
          >
            <span style={{ fontSize: isMobile ? '1rem' : '1.4rem' }}>✨</span>
            <span>Create New Echo (5 Action Points)</span>
          </button>
        )}
        
        {hasExistingEchoes && (
          <button
            onClick={disabled ? undefined : onExtendEcho}
            disabled={disabled}
            style={{
              position: 'relative',
              background: disabled 
                ? 'linear-gradient(145deg, #66620, #66640)' 
                : 'linear-gradient(145deg, #2196F320, #2196F340)',
              color: disabled ? '#888' : 'white',
              border: `2px solid ${disabled ? '#666' : '#2196F3'}`,
              padding: isMobile ? '1px 4px' : '1rem 2rem',
              fontSize: isMobile ? '0.7rem' : '1.2rem',
              borderRadius: isMobile ? '4px' : '8px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontFamily: 'Orbitron, monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: disabled 
                ? '0 0 8px #66640, inset 0 1px 0 #66660' 
                : '0 0 8px #2196F340, inset 0 1px 0 #2196F360',
              textShadow: disabled ? 'none' : '0 0 4px #2196F3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isMobile ? '4px' : '8px',
              opacity: disabled ? 0.6 : 1
            }}
            onMouseEnter={disabled ? undefined : (e) => {
              playGlassImpact();
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 4px 16px #2196F360, inset 0 1px 0 #2196F380';
            }}
            onMouseLeave={disabled ? undefined : (e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 0 8px #2196F340, inset 0 1px 0 #2196F360';
            }}
          >
            <span style={{ fontSize: isMobile ? '1rem' : '1.4rem' }}>⚡</span>
            <span>Extend Existing Echo (3 Action Points)</span>
          </button>
        )}
      </div>
      
      {hasExistingEchoes && (
        <p style={{ 
          marginTop: isMobile ? '0.5rem' : '1rem', 
          fontSize: isMobile ? '0.7rem' : '0.9rem', 
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
