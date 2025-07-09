import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import type { Room } from '../services/api';
import { socketService } from '../services/socket';
import '../pages/HomePage.css';
import { playGlassImpact, playClickSound, backgroundMusic, setMenuThemeLoop } from '../assets/sounds/playSound';

// Echo animation constants (same as HomePage)
const ECHO_COUNT = 24; // Fewer echoes for sub-pages
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

const handleButtonHover = (e: React.MouseEvent<HTMLButtonElement>) => {
  playGlassImpact();
  e.currentTarget.style.background = 'linear-gradient(145deg, #2196F3, #1976D2)';
  e.currentTarget.style.borderColor = '#2196F3';
  e.currentTarget.style.boxShadow = '0 0 20px #2196F3, 0 8px 16px rgba(33, 150, 243, 0.3)';
  e.currentTarget.style.transform = 'translateY(-2px)';
  e.currentTarget.style.textShadow = '0 0 8px #2196F3';
};

const handleButtonLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.background = 'linear-gradient(145deg, #333, #444)';
  e.currentTarget.style.borderColor = '#666';
  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
  e.currentTarget.style.transform = 'translateY(0)';
  e.currentTarget.style.textShadow = 'none';
};

const JoinPage: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [musicStarted, setMusicStarted] = useState(false);
  const navigate = useNavigate();

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

  // Start background music when component mounts
  useEffect(() => {
    // Set custom loop overlap for seamless FL Studio loops
    setMenuThemeLoop(); // Uses MENU_THEME constant
    
    // Try to play menu music
    backgroundMusic.play('menuTheme', 0.4);
    return () => {
      // Don't stop music when leaving join page
    };
  }, []);

  // Handle user interaction to start music (bypass autoplay restrictions)
  useEffect(() => {
    const handleUserInteraction = () => {
      if (!musicStarted) {
        console.log('User interaction detected, starting menu music...');
        backgroundMusic.play('menuTheme', 0.4);
        setMusicStarted(true);
        
        // Remove event listeners after first interaction
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
        document.removeEventListener('touchstart', handleUserInteraction);
      }
    };

    // Add event listeners for user interaction
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [musicStarted]);

  const t = (now - startTime.current) * SPEED;
  const tFast = t * 1.15;

  useEffect(() => {
    loadRooms();
    const interval = setInterval(loadRooms, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadRooms = async () => {
    try {
      const availableRooms = await apiService.getRooms();
      setRooms(availableRooms);
    } catch (err) {
      console.error('Failed to load rooms:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRoom) {
      setError('Please select a room');
      return;
    }

    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsJoining(true);
    setError('');

    try {
      // Connect to socket
      socketService.connect();
      
      // Join room and get playerId from response
      const response = await apiService.joinRoom(selectedRoom.id, playerName);
      
      // Navigate to lobby with room info including playerId
      navigate(`/lobby?roomId=${selectedRoom.id}&playerName=${encodeURIComponent(playerName)}&isHost=false&playerId=${response.playerId || ''}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
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
        width: '100%',
        padding: '20px'
      }}>
        <h1>Join a Game</h1>
        
        <div className="menu">
          {isLoading ? (
            <div className="loading-message">
              Loading available rooms...
            </div>
          ) : rooms.length === 0 ? (
            <div className="no-rooms-message">
              No rooms available. <button 
                onClick={() => { playClickSound(); navigate('/host'); }}
                className="link-button"
              >
                Create one instead?
              </button>
            </div>
          ) : (
            <div className="rooms-section">
              <h2 className="rooms-title">Available Rooms</h2>
              <div className="rooms-list">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => { playClickSound(); setSelectedRoom(room); }}
                    className={`room-item ${selectedRoom?.id === room.id ? 'selected' : ''}`}
                  >
                    <div className="room-info">
                      <span className="room-id">Room {room.id}</span>
                      <span className="room-host">Hosted by {room.host}</span>
                    </div>
                    <div className="room-meta">
                      {room.playerCount}/2 players • {formatTime(room.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedRoom && (
            <form onSubmit={handleJoinRoom} className="menu-form">
              <div className="form-group">
                <label htmlFor="playerName" className="form-label">
                  Your Name
                </label>
                <input
                  type="text"
                  id="playerName"
                  value={playerName}
                  onChange={(e) => { playClickSound(); setPlayerName(e.target.value); }}
                  className="menu-input"
                  placeholder="Enter your name"
                  disabled={isJoining}
                  maxLength={12}
                />
              </div>

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isJoining}
                className="menu-button"
                onMouseEnter={handleButtonHover}
                onMouseLeave={handleButtonLeave}
                onClick={() => { if (!isJoining) playClickSound(); }}
              >
                {isJoining ? 'Joining Room...' : `Join Room ${selectedRoom.id}`}
              </button>
            </form>
          )}

          <div className="menu-actions">
            <button
              onClick={() => { playClickSound(); navigate('/home'); }}
              className="menu-button secondary"
              onMouseEnter={handleButtonHover}
              onMouseLeave={handleButtonLeave}
            >
              ← Back to Menu
            </button>
            <button
              onClick={() => { playClickSound(); loadRooms(); }}
              className="menu-button secondary"
              onMouseEnter={handleButtonHover}
              onMouseLeave={handleButtonLeave}
            >
              ↻ Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinPage; 
