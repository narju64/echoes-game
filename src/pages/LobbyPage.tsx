import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { socketService } from '../services/socket';
import LeaveConfirmationModal from '../components/LeaveConfirmationModal';
import type { PlayerId } from '../types/gameTypes';
import '../pages/HomePage.css';

// Echo animation constants (same as HomePage)
const ECHO_COUNT = 24;
const FOREGROUND_ECHO_COUNT = Math.round(ECHO_COUNT * 0.7);
const ECHO_COLORS = [
  { main: '#ff9800', glow: '#ffd580' }, // orange
  { main: '#2196f3', glow: '#90caf9' }  // blue
];

// Helper to generate random movement paths (same as HomePage)
function generateEchoes(count = ECHO_COUNT, sizeMultiplier = 1) {
  return Array.from({ length: count }).map((_, i) => {
    const color = ECHO_COLORS[i % 2];
    
    const screenWidth = 2000;
    const screenHeight = 2000;
    
    const maxRadius = Math.sqrt(screenWidth * screenWidth + screenHeight * screenHeight) * 0.8;
    const radius = Math.random() * maxRadius;
    const angle = Math.random() * 2 * Math.PI;
    
    const biasedRadius = radius * Math.pow(Math.random(), 0.15);
    
    const centerX = screenWidth / 2 + Math.cos(angle) * biasedRadius;
    const centerY = screenHeight / 2 + Math.sin(angle) * biasedRadius;
    
    const orbitRadius = 80 + Math.random() * 100;
    const orbitAngle = Math.random() * 2 * Math.PI;
    const size = sizeMultiplier * (60 + Math.random() * 8);
    const freqX = 0.5 + Math.random() * 0.3;
    const freqY = 0.5 + Math.random() * 0.3;
    const phase = Math.random() * Math.PI * 2;
    
    return { 
      color, 
      angle: orbitAngle, 
      radius: orbitRadius, 
      size, 
      freqX, 
      freqY, 
      phase, 
      centerX, 
      centerY 
    };
  });
}

interface Player {
  id: string;
  name: string;
  isHost: boolean;
  gamePlayerId?: PlayerId; // 'player1' or 'player2'
}

const LobbyPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get('roomId');
  const playerName = searchParams.get('playerName');
  const isHost = searchParams.get('isHost') === 'true';
  const playerId = searchParams.get('playerId');
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [error, setError] = useState('');
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // Animation setup (same as HomePage)
  const startTime = useRef(performance.now());
  const [now, setNow] = useState(() => performance.now());
  const [pulse, setPulse] = useState(1);
  const SPEED = 0.00008;
  const [echoes, _setEchoes] = useState(() => generateEchoes());
  const [foregroundEchoes, _setForegroundEchoes] = useState(() => generateEchoes(FOREGROUND_ECHO_COUNT, 1.2));

  // Animation loop (same as HomePage)
  useEffect(() => {
    let running = true;
    function animate() {
      if (!running) return;
      setNow(performance.now());
      const tAnim = (performance.now() - startTime.current) / 2400;
      setPulse(0.7 + 0.3 * (0.5 + 0.5 * Math.sin(2 * Math.PI * tAnim)));
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
    return () => { running = false; };
  }, []);

  const t = (now - startTime.current) * SPEED;
  const tFast = t * 1.15;

  useEffect(() => {
    if (!roomId || !playerName) {
      setError('Missing room information');
      return;
    }

    // Initialize players list with current player
    const currentPlayer: Player = {
      id: isHost ? 'host' : 'guest',
      name: playerName,
      isHost: isHost,
      gamePlayerId: isHost ? 'player1' : undefined // Host is always player1, guest will be assigned player2
    };
    setPlayers([currentPlayer]);

    // Connect to socket if not already connected
    if (!socketService.isSocketConnected()) {
      socketService.connect();
    }

    // Listen for player updates
    const handlePlayerJoined = (data: any) => {
      console.log('Player joined event:', data);
      
      // Handle the actual data format being sent: {player: {...}, room: {...}}
      if (data && data.room && data.room.players && Array.isArray(data.room.players)) {
        let updatedPlayers = data.room.players;
        
        // Assign player2 role to the guest when second player joins
        if (updatedPlayers.length === 2) {
          updatedPlayers = updatedPlayers.map((player: Player) => {
            if (!player.gamePlayerId) {
              // This is the guest player, assign them player2
              return { ...player, gamePlayerId: 'player2' as PlayerId };
            }
            return player;
          });
        }
        
        setPlayers(updatedPlayers);
        
        // Store both player names in sessionStorage for multiplayer display
        const p1 = updatedPlayers.find((p: Player) => p.gamePlayerId === 'player1');
        const p2 = updatedPlayers.find((p: Player) => p.gamePlayerId === 'player2');
        if (roomId && p1 && p2) {
          sessionStorage.setItem(`room_${roomId}_player1_name`, p1.name);
          sessionStorage.setItem(`room_${roomId}_player2_name`, p2.name);
        }
        
        // Auto-start game when second player joins
        if (updatedPlayers.length === 2) {
          setTimeout(() => {
            setGameStarted(true);
            const currentPlayer = updatedPlayers.find((p: Player) => p.name === playerName);
            const gamePlayerIdParam = currentPlayer?.gamePlayerId ? `&gamePlayerId=${currentPlayer.gamePlayerId}` : '';
            const playerIdParam = playerId ? `&playerId=${playerId}` : '';
            navigate(`/game?mode=multiplayer&roomId=${roomId}&playerName=${encodeURIComponent(playerName)}&isHost=${isHost}${playerIdParam}${gamePlayerIdParam}`);
          }, 1000); // Small delay for smooth transition
        }
      } else if (data && data.players && Array.isArray(data.players)) {
        // Fallback for the expected format
        let updatedPlayers = data.players;
        
        // Assign player2 role to the guest when second player joins
        if (updatedPlayers.length === 2) {
          updatedPlayers = updatedPlayers.map((player: Player) => {
            if (!player.gamePlayerId) {
              // This is the guest player, assign them player2
              return { ...player, gamePlayerId: 'player2' as PlayerId };
            }
            return player;
          });
        }
        
        setPlayers(updatedPlayers);
        
        // Store both player names in sessionStorage for multiplayer display
        const p1 = updatedPlayers.find((p: Player) => p.gamePlayerId === 'player1');
        const p2 = updatedPlayers.find((p: Player) => p.gamePlayerId === 'player2');
        if (roomId && p1 && p2) {
          sessionStorage.setItem(`room_${roomId}_player1_name`, p1.name);
          sessionStorage.setItem(`room_${roomId}_player2_name`, p2.name);
        }
        
        // Auto-start game when second player joins
        if (updatedPlayers.length === 2) {
          setTimeout(() => {
            setGameStarted(true);
            const currentPlayer = updatedPlayers.find((p: Player) => p.name === playerName);
            const gamePlayerIdParam = currentPlayer?.gamePlayerId ? `&gamePlayerId=${currentPlayer.gamePlayerId}` : '';
            const playerIdParam = playerId ? `&playerId=${playerId}` : '';
            navigate(`/game?mode=multiplayer&roomId=${roomId}&playerName=${encodeURIComponent(playerName)}&isHost=${isHost}${playerIdParam}${gamePlayerIdParam}`);
          }, 1000); // Small delay for smooth transition
        }
      } else {
        console.error('Invalid player data received:', data);
      }
    };

    const handleRoomJoined = (data: { room: any }) => {
      console.log('Room joined event:', data);
      if (data && data.room && data.room.players && Array.isArray(data.room.players)) {
        let updatedPlayers = data.room.players;
        
        // Assign player roles if not already assigned
        if (updatedPlayers.length === 2) {
          updatedPlayers = updatedPlayers.map((player: Player) => {
            if (!player.gamePlayerId) {
              // Assign roles based on host status
              return { ...player, gamePlayerId: player.isHost ? 'player1' : 'player2' as PlayerId };
            }
            return player;
          });
        }
        
        setPlayers(updatedPlayers);
        
        // Store both player names in sessionStorage for multiplayer display
        const p1 = updatedPlayers.find((p: Player) => p.gamePlayerId === 'player1');
        const p2 = updatedPlayers.find((p: Player) => p.gamePlayerId === 'player2');
        if (roomId && p1 && p2) {
          sessionStorage.setItem(`room_${roomId}_player1_name`, p1.name);
          sessionStorage.setItem(`room_${roomId}_player2_name`, p2.name);
        }
        
        // Auto-start game when both players are present
        if (updatedPlayers.length === 2) {
          setTimeout(() => {
            setGameStarted(true);
            const currentPlayer = updatedPlayers.find((p: Player) => p.name === playerName);
            const gamePlayerIdParam = currentPlayer?.gamePlayerId ? `&gamePlayerId=${currentPlayer.gamePlayerId}` : '';
            const playerIdParam = playerId ? `&playerId=${playerId}` : '';
            navigate(`/game?mode=multiplayer&roomId=${roomId}&playerName=${encodeURIComponent(playerName)}&isHost=${isHost}${playerIdParam}${gamePlayerIdParam}`);
          }, 1000); // Small delay for smooth transition
        }
      } else {
        console.error('Invalid room data received:', data);
      }
    };

    const handlePlayerLeft = (data: any) => {
      console.log('Player left event:', data);
      
      // Handle the actual data format being sent: {player: {...}, room: {...}}
      if (data && data.room && data.room.players && Array.isArray(data.room.players)) {
        setPlayers(data.room.players);
      } else if (data && data.players && Array.isArray(data.players)) {
        // Fallback for the expected format
        setPlayers(data.players);
      } else {
        console.error('Invalid player data received:', data);
      }
    };

    const handleGameStart = () => {
      console.log('handleGameStart called with playerId:', playerId);
      setGameStarted(true);
      // Store both player names in sessionStorage for multiplayer display
      const p1 = players.find((p: Player) => p.gamePlayerId === 'player1');
      const p2 = players.find((p: Player) => p.gamePlayerId === 'player2');
      if (roomId && p1 && p2) {
        sessionStorage.setItem(`room_${roomId}_player1_name`, p1.name);
        sessionStorage.setItem(`room_${roomId}_player2_name`, p2.name);
      }
      const currentPlayer = players.find((p: Player) => p.name === playerName);
      const gamePlayerIdParam = currentPlayer?.gamePlayerId ? `&gamePlayerId=${currentPlayer.gamePlayerId}` : '';
      const playerIdParam = playerId ? `&playerId=${playerId}` : '';
      const gameUrl = `/game?mode=multiplayer&roomId=${roomId}&playerName=${encodeURIComponent(playerName)}&isHost=${isHost}${playerIdParam}${gamePlayerIdParam}`;
      console.log('Navigating to game with URL:', gameUrl);
      navigate(gameUrl);
    };

    const handleRoomClosed = () => {
      setError('Room was closed by the host');
    };

    // Get socket and subscribe to events
    const socket = socketService.getSocket();
    if (socket) {
      socket.on('playerJoined', handlePlayerJoined);
      socket.on('roomJoined', handleRoomJoined);
      socket.on('playerLeft', handlePlayerLeft);
      socket.on('gameStart', handleGameStart);
      socket.on('roomClosed', handleRoomClosed);

      // Join the room via socket
      socket.emit('joinRoom', { roomId, playerName, isHost, playerId });
      
      // Debug: Log socket connection status
      console.log('Socket connected:', socket.connected);
      console.log('Joining room with data:', { roomId, playerName, isHost, playerId });
    } else {
      console.error('Socket not available');
    }

    // Fallback: Poll room status every 2 seconds if socket events don't work
    const pollInterval = setInterval(async () => {
      try {
        // This would need to be implemented in your backend API
        // For now, just log that we're polling
        console.log('Polling room status...');
      } catch (error) {
        console.error('Error polling room status:', error);
      }
    }, 2000);

    return () => {
      if (socket) {
        socket.off('playerJoined');
        socket.off('roomJoined');
        socket.off('playerLeft');
        socket.off('gameStart');
        socket.off('roomClosed');
      }
      clearInterval(pollInterval);
    };
  }, [roomId, playerName, isHost, navigate, playerId]);

  // Handle beforeunload event (page refresh, close tab, browser back)
  useEffect(() => {
    // Set a flag to detect if this is a fresh page load vs a reload
    const isReload = sessionStorage.getItem('lobbyReloading');
    
    if (isReload) {
      // This is a reload, redirect to home immediately
      sessionStorage.removeItem('lobbyReloading');
      window.location.href = '/home';
      return;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Set flag to indicate we're about to reload
      sessionStorage.setItem('lobbyReloading', 'true');
      
      // Show custom message for reload
      e.preventDefault();
      e.returnValue = 'Reloading will end your lobby session. Are you sure?';
      return 'Reloading will end your lobby session. Are you sure?';
    };

    const handlePopState = (e: PopStateEvent) => {
      // Always show modal for all lobby sessions
      e.preventDefault();
      setShowLeaveModal(true);
      // Push the current state back to prevent navigation
      window.history.pushState(null, '', window.location.href);
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    
    // Push initial state to enable popstate detection
    window.history.pushState(null, '', window.location.href);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []); // Remove any dependencies so it works in all modes

  const handleLeaveRoom = () => {
    setShowLeaveModal(true);
  };

  const handleConfirmLeave = () => {
    if (roomId) {
      socketService.leaveRoom(roomId, playerId || undefined);
    }
    setShowLeaveModal(false);
    navigate('/home');
  };

  const handleCancelLeave = () => {
    setShowLeaveModal(false);
  };

  const copyRoomCode = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
    }
  };

  return (
    <>
      <div className="home-page">
        {/* Floating Echoes Background (same as HomePage) */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          <svg width="100vw" height="100vh" viewBox="0 0 2000 2000" style={{ width: '100vw', height: '100vh', display: 'block', position: 'absolute', inset: 0 }}>
            {/* Background echoes */}
            {echoes.map((e, i) => {
              let cx = e.centerX + Math.cos(e.angle + t * e.freqX + e.phase) * e.radius;
              let cy = e.centerY + Math.sin(e.angle + t * e.freqY + e.phase) * e.radius;
              const isOrange = e.color.main === '#ff9800';
              return (
                <foreignObject
                  key={i}
                  x={cx - e.size / 2}
                  y={cy - e.size / 2}
                  width={e.size}
                  height={e.size}
                  style={{ overflow: 'visible', pointerEvents: 'none', opacity: 0.6 }}
                >
                  <div style={{ position: 'relative', width: e.size, height: e.size }}>
                    <div
                      className={`echo-3d-pulse ${isOrange ? 'echo-player1' : 'echo-player2'}`}
                      style={{ width: e.size, height: e.size, borderRadius: '50%', opacity: 0.6 }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: `-${e.size * 0.175}px`,
                        left: `-${e.size * 0.175}px`,
                        width: e.size * 1.35,
                        height: e.size * 1.35,
                        borderRadius: '50%',
                        pointerEvents: 'none',
                        background: 'radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.18) 55%, rgba(255,255,255,0.04) 85%, transparent 100%)',
                        filter: 'blur(12px)',
                        opacity: 0.25 + 0.25 * pulse,
                        zIndex: 3,
                        transition: 'opacity 0.2s linear',
                      }}
                    />
                  </div>
                </foreignObject>
              );
            })}
            {/* Foreground echoes */}
            {foregroundEchoes.map((e, i) => {
              let cx = e.centerX + Math.cos(e.angle + tFast * e.freqX + e.phase) * e.radius;
              let cy = e.centerY + Math.sin(e.angle + tFast * e.freqY + e.phase) * e.radius;
              const isOrange = e.color.main === '#ff9800';
              return (
                <foreignObject
                  key={i + 1000}
                  x={cx - e.size / 2}
                  y={cy - e.size / 2}
                  width={e.size}
                  height={e.size}
                  style={{ overflow: 'visible', pointerEvents: 'none', opacity: 0.8 }}
                >
                  <div style={{ position: 'relative', width: e.size, height: e.size }}>
                    <div
                      className={`echo-3d-pulse ${isOrange ? 'echo-player1' : 'echo-player2'}`}
                      style={{ width: e.size, height: e.size, borderRadius: '50%', opacity: 0.8 }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: `-${e.size * 0.175}px`,
                        left: `-${e.size * 0.175}px`,
                        width: e.size * 1.35,
                        height: e.size * 1.35,
                        borderRadius: '50%',
                        pointerEvents: 'none',
                        background: 'radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.18) 55%, rgba(255,255,255,0.04) 85%, transparent 100%)',
                        filter: 'blur(12px)',
                        opacity: 0.3 + 0.3 * pulse,
                        zIndex: 3,
                        transition: 'opacity 0.2s linear',
                      }}
                    />
                  </div>
                </foreignObject>
              );
            })}
          </svg>
          <style>{`
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
            @keyframes echo-pulse {
              0% { box-shadow: 0 0 8px 3px var(--echo-glow-color, #fff5), 0 2px 8px 0 rgba(0,0,0,0.4), 0 0 0 3px rgba(255,255,255,0.05) inset; }
              50% { box-shadow: 0 0 12px 5px var(--echo-glow-color, #fff3), 0 3px 10px 0 rgba(0,0,0,0.45), 0 0 0 4px rgba(255,255,255,0.06) inset; }
              100% { box-shadow: 0 0 8px 3px var(--echo-glow-color, #fff5), 0 2px 8px 0 rgba(0,0,0,0.4), 0 0 0 3px rgba(255,255,255,0.05) inset; }
            }
          `}</style>
        </div>

        {/* Menu Content */}
        <div style={{ 
          position: 'relative', 
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100%'
        }}>
          <h1>Game Lobby</h1>
          
          <div className="menu">
            {error && (
              <div className="error-message" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <div style={{ 
              background: 'rgba(0, 0, 0, 0.3)', 
              padding: '2rem', 
              borderRadius: '12px', 
              marginBottom: '2rem',
              minWidth: '300px'
            }}>
              <h2 style={{ marginTop: 0, marginBottom: '1rem', textAlign: 'center' }}>Room Code</h2>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <code style={{ 
                  background: 'rgba(255, 255, 255, 0.1)', 
                  padding: '0.5rem 1rem', 
                  borderRadius: '6px',
                  fontSize: '1.2rem',
                  fontFamily: 'monospace'
                }}>
                  {roomId}
                </code>
                <button 
                  onClick={copyRoomCode}
                  className="menu-button"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                >
                  Copy
                </button>
              </div>
              <p style={{ textAlign: 'center', margin: 0, opacity: 0.8 }}>
                Share this code with your friend to join the game
              </p>
            </div>

            <div style={{ 
              background: 'rgba(0, 0, 0, 0.3)', 
              padding: '2rem', 
              borderRadius: '12px', 
              marginBottom: '2rem',
              minWidth: '300px'
            }}>
              <h2 style={{ marginTop: 0, marginBottom: '1rem', textAlign: 'center' }}>Players</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {players && players.map((player, index) => (
                  <div key={player.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem',
                    padding: '0.5rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px'
                  }}>
                    <div style={{ 
                      width: '12px', 
                      height: '12px', 
                      borderRadius: '50%',
                      background: index === 0 ? '#ff9800' : '#2196f3'
                    }} />
                    <span style={{ flex: 1 }}>{player.name}</span>
                    {player.gamePlayerId && (
                      <span style={{ 
                        background: player.gamePlayerId === 'player1' ? '#ff9800' : '#2196f3', 
                        color: 'white', 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold'
                      }}>
                        {player.gamePlayerId === 'player1' ? 'Player 1' : 'Player 2'}
                      </span>
                    )}
                    {player.isHost && (
                      <span style={{ 
                        background: '#ff9800', 
                        color: 'black', 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold'
                      }}>
                        Host
                      </span>
                    )}
                  </div>
                ))}
                {(!players || players.length === 1) && (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '1rem',
                    opacity: 0.6,
                    fontStyle: 'italic'
                  }}>
                    Waiting for second player...
                  </div>
                )}
              </div>
            </div>

            {gameStarted && (
              <div style={{ 
                background: 'rgba(76, 175, 80, 0.2)', 
                padding: '1rem', 
                borderRadius: '8px',
                marginBottom: '1rem',
                textAlign: 'center',
                color: '#4caf50'
              }}>
                Starting game...
              </div>
            )}

            <button
              onClick={handleLeaveRoom}
              className="menu-button secondary"
              disabled={gameStarted}
            >
              Leave Room
            </button>
          </div>
        </div>
      </div>

      <LeaveConfirmationModal
        isOpen={showLeaveModal}
        onConfirm={handleConfirmLeave}
        onCancel={handleCancelLeave}
        title="Leave Lobby?"
        message="Leaving the lobby will end your game session. Are you sure you want to continue?"
      />
    </>
  );
};

export default LobbyPage; 