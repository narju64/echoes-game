import React from 'react';
import type { Echo, PlayerId, TurnHistoryEntry } from '../types/gameTypes';

interface GameInfoPanelProps {
  currentPlayer: PlayerId;
  turnNumber: number;
  phase: string;
  scores: { player1: number; player2: number };
  echoes: Echo[];
  currentTick?: number;
  replayStates?: { echoes: Echo[]; projectiles: any[]; tick: number; destroyed: { echoId: string; by: PlayerId|null; position: { row: number; col: number }; playerId: PlayerId }[]; destroyedProjectiles: { id: string; type: 'projectile' | 'mine'; position: { row: number; col: number } }[]; collisions: { row: number; col: number }[]; shieldBlocks: { row: number; col: number; projectileDirection: any }[] }[];
  turnHistory?: TurnHistoryEntry[];
}

const GameInfoPanel: React.FC<GameInfoPanelProps> = ({
  currentPlayer,
  turnNumber,
  phase,
  scores,
  echoes,
  currentTick,
  replayStates = [],
  turnHistory
}) => {
  // Helper function to convert row/col to board position (e.g., "D5")
  const getBoardPosition = (row: number, col: number): string => {
    const columnLetter = String.fromCharCode(65 + col);
    const rowNumber = row + 1; // Convert 0-7 to 1-8 (inverted coordinate system)
    return `${columnLetter}${rowNumber}`;
  };

  // Generate event log from replay states or turn history
  const generateEventLog = () => {
    const events: string[] = [];
    
    // If in replay mode, use replay states
    if (phase === 'replay' && replayStates && replayStates.length > 0) {
      // Group events by tick
      const eventsByTick = new Map<number, string[]>();
      
      replayStates.forEach((state, tickIndex) => {
        const tick = state.tick;
        const tickEvents: string[] = [];
        
        // Process destroyed echoes with their positions
        const destroyedEchoesByPosition = new Map<string, { blueCount: number; orangeCount: number }>();
        state.destroyed.forEach(destroyed => {
          const posKey = `${destroyed.position.row},${destroyed.position.col}`;
          const existing = destroyedEchoesByPosition.get(posKey);
          
          // Use the actual playerId of the destroyed echo
          if (existing) {
            if (destroyed.playerId === 'player1') {
              existing.orangeCount++;
            } else {
              existing.blueCount++;
            }
          } else {
            destroyedEchoesByPosition.set(posKey, {
              blueCount: destroyed.playerId === 'player2' ? 1 : 0,
              orangeCount: destroyed.playerId === 'player1' ? 1 : 0
            });
          }
        });
        
        // Process destroyed projectiles with their positions
        const destroyedProjectilesByPosition = new Map<string, { projectiles: number; mines: number }>();
        state.destroyedProjectiles.forEach(destroyed => {
          const posKey = `${destroyed.position.row},${destroyed.position.col}`;
          const existing = destroyedProjectilesByPosition.get(posKey);
          if (existing) {
            if (destroyed.type === 'projectile') {
              existing.projectiles++;
            } else {
              existing.mines++;
            }
          } else {
            destroyedProjectilesByPosition.set(posKey, {
              projectiles: destroyed.type === 'projectile' ? 1 : 0,
              mines: destroyed.type === 'mine' ? 1 : 0
            });
          }
        });
        
        // Create events for each unique position
        const allPositions = new Set([
          ...destroyedEchoesByPosition.keys(),
          ...destroyedProjectilesByPosition.keys()
        ]);
        
        allPositions.forEach(posKey => {
          const [row, col] = posKey.split(',').map(Number);
          const boardPos = getBoardPosition(row, col);
          
          const echoData = destroyedEchoesByPosition.get(posKey);
          const projectileData = destroyedProjectilesByPosition.get(posKey);
          
          let eventDescription = '';
          
          if (echoData && projectileData) {
            // Both echoes and projectiles destroyed at same location
            
            // Check if there's a shield block at this location and adjust projectile count
            const hasShieldBlock = state.shieldBlocks.some(block => 
              block.row === row && block.col === col
            );
            
            let adjustedProjectiles = projectileData.projectiles;
            let adjustedMines = projectileData.mines;
            
            if (hasShieldBlock && adjustedProjectiles > 0) {
              adjustedProjectiles -= 1; // Subtract 1 projectile that was blocked
            }
            
            // Determine what destroyed the echo
            let destroyer = '';
            if (adjustedProjectiles > 0 && adjustedMines > 0) {
              destroyer = 'projectile and mine';
            } else if (adjustedProjectiles > 0) {
              destroyer = 'projectile';
            } else if (adjustedMines > 0) {
              destroyer = 'mine';
            }
            
            // Build echo description
            let echoDescription = '';
            if (echoData.blueCount > 0 && echoData.orangeCount > 0) {
              // Both types of echoes destroyed
              echoDescription = `${echoData.blueCount} Blue and ${echoData.orangeCount} Orange echo${echoData.blueCount + echoData.orangeCount > 1 ? 's' : ''} destroyed by ${destroyer}`;
            } else if (echoData.blueCount > 0) {
              // Only Blue echoes destroyed
              echoDescription = `${echoData.blueCount} Blue echo${echoData.blueCount > 1 ? 's' : ''} destroyed by ${destroyer}`;
            } else if (echoData.orangeCount > 0) {
              // Only Orange echoes destroyed
              echoDescription = `${echoData.orangeCount} Orange echo${echoData.orangeCount > 1 ? 's' : ''} destroyed by ${destroyer}`;
            }
            
            eventDescription = `Tick ${tick} - ${echoDescription} at ${boardPos}`;
          } else if (echoData) {
            // Only echoes destroyed (echo vs echo collision)
            let echoDescription = '';
            
            if (echoData.blueCount > 0 && echoData.orangeCount > 0) {
              // Both types of echoes destroyed
              echoDescription = `${echoData.blueCount} Blue and ${echoData.orangeCount} Orange echo${echoData.blueCount + echoData.orangeCount > 1 ? 's' : ''} destroyed`;
            } else if (echoData.blueCount > 0) {
              // Only Blue echoes destroyed
              echoDescription = `${echoData.blueCount} Blue echo${echoData.blueCount > 1 ? 's' : ''} destroyed`;
            } else if (echoData.orangeCount > 0) {
              // Only Orange echoes destroyed
              echoDescription = `${echoData.orangeCount} Orange echo${echoData.orangeCount > 1 ? 's' : ''} destroyed`;
            }
            
            eventDescription = `Tick ${tick} - ${echoDescription} at ${boardPos}`;
          } else if (projectileData) {
            // Only projectiles destroyed (projectile vs projectile collision)
            
            // Check if there's a shield block at this location and adjust projectile count
            const hasShieldBlock = state.shieldBlocks.some(block => 
              block.row === row && block.col === col
            );
            
            let adjustedProjectiles = projectileData.projectiles;
            let adjustedMines = projectileData.mines;
            
            if (hasShieldBlock && adjustedProjectiles > 0) {
              adjustedProjectiles -= 1; // Subtract 1 projectile that was blocked
            }
            
            let parts = [];
            if (adjustedProjectiles > 0) {
              parts.push(`${adjustedProjectiles} projectile${adjustedProjectiles > 1 ? 's' : ''}`);
            }
            if (adjustedMines > 0) {
              parts.push(`${adjustedMines} mine${adjustedMines > 1 ? 's' : ''}`);
            }
            
            // Only create event if there are actually entities to report
            if (parts.length > 0) {
              eventDescription = `Tick ${tick} - ${parts.join(' and ')} destroyed at ${boardPos}`;
            }
          }
          
          if (eventDescription) {
            tickEvents.push(eventDescription);
          }
        });
        
        // Add shield blocks (these are separate from collisions)
        state.shieldBlocks.forEach(block => {
          const boardPos = getBoardPosition(block.row, block.col);
          // Find which player's echo is at this location to determine the shield owner
          const shieldedEcho = state.echoes.find(echo => 
            echo.position.row === block.row && echo.position.col === block.col
          );
          const playerNumber = shieldedEcho?.playerId === 'player1' ? '1' : '2';
          tickEvents.push(`Tick ${tick} - Player ${playerNumber} shield blocks at ${boardPos}`);
        });
        
        if (tickEvents.length > 0) {
          eventsByTick.set(tick, tickEvents);
        }
      });
      
      // Convert to sorted array
      const sortedTicks = Array.from(eventsByTick.keys()).sort((a, b) => a - b);
      sortedTicks.forEach((tick, index) => {
        const tickEvents = eventsByTick.get(tick) || [];
        
        // Sort events within each tick by tile position and type
        const sortedTickEvents = tickEvents.sort((a, b) => {
          // Extract tile position from event strings
          const getTilePosition = (event: string) => {
            const match = event.match(/at ([A-H][1-8])/);
            return match ? match[1] : '';
          };
          
          const tileA = getTilePosition(a);
          const tileB = getTilePosition(b);
          
          // First sort by tile position (A1, A2, ..., H8)
          if (tileA !== tileB) {
            return tileA.localeCompare(tileB);
          }
          
          // If same tile, put shield blocks before collisions
          const isShieldBlockA = a.includes('shield blocks');
          const isShieldBlockB = b.includes('shield blocks');
          
          if (isShieldBlockA && !isShieldBlockB) return -1;
          if (!isShieldBlockA && isShieldBlockB) return 1;
          
          return 0;
        });
        
        // Add a blank line between different ticks (except before the first tick)
        if (index > 0) {
          events.push('');
        }
        sortedTickEvents.forEach(event => {
          events.push(event);
        });
      });
    } else if (turnHistory && turnHistory.length > 0) {
      // Show previous turn's events when not in replay mode
      const previousTurn = turnHistory[turnHistory.length - 1];
      
      if (previousTurn && previousTurn.eventLog) {
        // Simply use the stored event log
        return previousTurn.eventLog;
      }
    }
    
    return events;
  };

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
      {/* Turn Number and Phase */}
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0', color: '#4CAF50' }}>Turn {turnNumber}</h2>
        <p style={{ margin: '0 0 0.5rem 0', color: '#ccc' }}>
          {phase === 'input' ? 'Input Phase' : phase === 'replay' ? 'Replay Phase' : phase}
        </p>
        {phase === 'replay' && currentTick !== undefined && (
          <p style={{ margin: '0 0 0.5rem 0', color: '#ccc' }}>Current Tick: {currentTick}</p>
        )}
      </div>

      {/* Turn Event Log */}
      {(phase === 'replay' || (turnHistory && turnHistory.length > 0)) && (
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#4CAF50' }}>
            {phase === 'replay' ? 'Event Log' : `Event Log (Turn ${turnHistory && turnHistory.length > 0 ? turnHistory[turnHistory.length - 1].turnNumber : '?'})`}
          </h3>
          <div style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
            {generateEventLog().map((event, index) => {
              // Determine color based on event content
              let color = '#ccc'; // default color
              
              if (event === '') {
                return <div key={index} style={{ marginBottom: '0.5rem' }}></div>;
              }
              
              if (event.includes('shield blocks')) {
                color = '#4CAF50'; // green
              } else if (event.includes('Blue') && event.includes('Orange')) {
                color = '#9C27B0'; // purple for mixed echo destruction
              } else if (event.includes('Orange echo')) {
                color = '#2196F3'; // blue
              } else if (event.includes('Blue echo')) {
                color = '#ff9800'; // orange
              } else if (event.includes('projectile') || event.includes('mine')) {
                color = '#f44336'; // red
              }
              
              // Extract tile position for grouping
              const getTilePosition = (eventText: string) => {
                const match = eventText.match(/at ([A-H][1-8])/);
                return match ? match[1] : '';
              };
              
              const currentTile = getTilePosition(event);
              const events = generateEventLog();
              
              // Check if this event is part of a group at the same tile
              let isGroupStart = false;
              let isGroupEnd = false;
              let groupStyle = {};
              
              if (currentTile) {
                // Check if previous event is at different tile (group start)
                if (index === 0 || getTilePosition(events[index - 1]) !== currentTile) {
                  isGroupStart = true;
                }
                
                // Check if next event is at different tile (group end)
                if (index === events.length - 1 || getTilePosition(events[index + 1]) !== currentTile) {
                  isGroupEnd = true;
                }
                
                // If this is part of a group (not alone), add grouping styles
                if (isGroupStart || isGroupEnd || (index > 0 && getTilePosition(events[index - 1]) === currentTile)) {
                  groupStyle = {
                    borderLeft: '2px solid rgba(255, 255, 255, 0.2)',
                    borderRight: '2px solid rgba(255, 255, 255, 0.2)',
                    paddingLeft: '8px',
                    paddingRight: '8px',
                    marginLeft: '4px',
                    marginRight: '4px',
                    ...(isGroupStart && { borderTopLeftRadius: '4px', borderTopRightRadius: '4px' }),
                    ...(isGroupEnd && { borderBottomLeftRadius: '4px', borderBottomRightRadius: '4px' }),
                    ...(isGroupStart && isGroupEnd && { borderRadius: '4px' }),
                    ...(isGroupStart && { borderTop: '1px solid rgba(255, 255, 255, 0.1)' }),
                    ...(isGroupEnd && { borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }),
                    ...(isGroupStart && { paddingTop: '4px' }),
                    ...(isGroupEnd && { paddingBottom: '4px' }),
                  };
                }
              }
              
              return (
                <div key={index} style={{ 
                  marginBottom: '0.2rem', 
                  color,
                  ...groupStyle
                }}>
                  {event}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default GameInfoPanel; 