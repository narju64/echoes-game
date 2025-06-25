import React from 'react';
import type { Echo, PlayerId } from '../types/gameTypes';

interface GameInfoPanelProps {
  currentPlayer: PlayerId;
  turnNumber: number;
  phase: string;
  scores: { player1: number; player2: number };
  echoes: Echo[];
  currentTick?: number;
}

const GameInfoPanel: React.FC<GameInfoPanelProps> = ({
  currentPlayer,
  turnNumber,
  phase,
  scores,
  echoes,
  currentTick
}) => {
  // Filter echoes by player
  const player1Echoes = echoes.filter(e => e.playerId === 'player1' && e.alive);
  const player2Echoes = echoes.filter(e => e.playerId === 'player2' && e.alive);

  // Generate echo names for display
  const generateEchoNames = (echoes: Echo[]): Map<string, string> => {
    const nameMap = new Map<string, string>();
    let newEchoCount = 0;
    
    echoes.forEach(echo => {
      const startPos = (echo as any).startingPosition || echo.position;
      const columnLetter = String.fromCharCode(65 + startPos.col);
      
      const isNewEcho = !nameMap.has(echo.id);
      if (isNewEcho) {
        newEchoCount++;
        nameMap.set(echo.id, `Echo ${newEchoCount}${columnLetter}`);
      }
    });
    
    return nameMap;
  };

  const echoNames = generateEchoNames(echoes);

  return (
    <div style={{ 
      position: 'absolute',
      top: '140px',
      right: '100px',
      color: 'white', 
      background: '#222', 
      padding: '1rem', 
      borderRadius: 12, 
      width: '400px', 
      height: '640px', 
      minWidth: 240, 
      maxWidth: 400, 
      overflowY: 'auto',
      zIndex: 1000
    }}>
      <h2 style={{ margin: '0 0 0.5rem 0' }}>Game Information</h2>
      
      {/* Turn Number and Phase */}
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ margin: '0 0 0.5rem 0' }}>Turn Number: {turnNumber}</p>
        <p style={{ margin: '0 0 0.5rem 0' }}>Phase: {phase}</p>
        {phase === 'replay' && currentTick !== undefined && (
          <p style={{ margin: '0 0 0.5rem 0' }}>Current Tick: {currentTick}</p>
        )}
      </div>

      {/* Echo Status */}
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#4CAF50' }}>Echo Status</h3>
        
        {/* Player 1 Echoes */}
        <div style={{ marginBottom: '0.5rem' }}>
          <p style={{ color: '#ff9800', fontWeight: 'bold', margin: '0 0 0.25rem 0' }}>
            Player 1 Echoes ({player1Echoes.length}/8):
          </p>
          {player1Echoes.length === 0 ? (
            <p style={{ color: '#888', fontStyle: 'italic', fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>
              No active echoes
            </p>
          ) : (
            <div style={{ marginLeft: '0.5rem', fontSize: '0.9rem' }}>
              {player1Echoes.map((echo, index) => (
                <div key={echo.id} style={{ 
                  marginBottom: '0.25rem', 
                  padding: '0.25rem', 
                  background: '#333', 
                  borderRadius: '4px',
                  fontSize: '0.8rem'
                }}>
                  <span style={{ color: '#ff9800', fontWeight: 'bold' }}>
                    {echoNames.get(echo.id) || `Echo ${index + 1}`}
                  </span>
                  <span style={{ color: '#ccc' }}>
                    {' '}at {String.fromCharCode(65 + echo.position.col)}{8 - echo.position.row}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Player 2 Echoes */}
        <div>
          <p style={{ color: '#2196F3', fontWeight: 'bold', margin: '0 0 0.25rem 0' }}>
            Player 2 Echoes ({player2Echoes.length}/8):
          </p>
          {player2Echoes.length === 0 ? (
            <p style={{ color: '#888', fontStyle: 'italic', fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>
              No active echoes
            </p>
          ) : (
            <div style={{ marginLeft: '0.5rem', fontSize: '0.9rem' }}>
              {player2Echoes.map((echo, index) => (
                <div key={echo.id} style={{ 
                  marginBottom: '0.25rem', 
                  padding: '0.25rem', 
                  background: '#333', 
                  borderRadius: '4px',
                  fontSize: '0.8rem'
                }}>
                  <span style={{ color: '#2196F3', fontWeight: 'bold' }}>
                    {echoNames.get(echo.id) || `Echo ${index + 1}`}
                  </span>
                  <span style={{ color: '#ccc' }}>
                    {' '}at {String.fromCharCode(65 + echo.position.col)}{8 - echo.position.row}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameInfoPanel; 