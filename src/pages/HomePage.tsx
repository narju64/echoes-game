import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

// Echo animation constants
const ECHO_COUNT = 48; // More echoes for menu
const FOREGROUND_ECHO_COUNT = Math.round(ECHO_COUNT * 0.7);
const ECHO_COLORS = [
  { main: '#ff9800', glow: '#ffd580' }, // orange
  { main: '#2196f3', glow: '#90caf9' }  // blue
];

// Helper to generate random movement paths
function generateEchoes(count = ECHO_COUNT, sizeMultiplier = 1) {
  return Array.from({ length: count }).map((_, i) => {
    const color = ECHO_COLORS[i % 2];
    
    // Generate position across entire screen with center bias
    const screenWidth = 2000;
    const screenHeight = 2000;
    
    // Use polar coordinates with radius bias for center concentration
    const maxRadius = Math.sqrt(screenWidth * screenWidth + screenHeight * screenHeight) * 0.8; // Increased to 80% of diagonal
    const radius = Math.random() * maxRadius;
    const angle = Math.random() * 2 * Math.PI;
    
    // Apply bias - more likely to be closer to center, but allow more spread
    const biasedRadius = radius * Math.pow(Math.random(), 0.15); // Much less aggressive bias for more even spread
    
    const centerX = screenWidth / 2 + Math.cos(angle) * biasedRadius;
    const centerY = screenHeight / 2 + Math.sin(angle) * biasedRadius;
    
    // Local orbit parameters
    const orbitRadius = 80 + Math.random() * 100; // Smaller local orbits
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

const HomePage: React.FC = () => {
  const startTime = useRef(performance.now());
  const [now, setNow] = useState(() => performance.now());
  const [pulse, setPulse] = useState(1);
  const SPEED = 0.00008; // Slower speed for menu
  const [echoes, setEchoes] = useState(() => generateEchoes());
  const [foregroundEchoes, setForegroundEchoes] = useState(() => generateEchoes(FOREGROUND_ECHO_COUNT, 1.2));

  // Animation loop
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

  return (
    <div className="home-page">
      {/* Floating Echoes Background */}
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
        <h1>Echoes</h1>
        <div className="menu">
          <Link to="/game" className="menu-button">Single Player</Link>
          <Link to="/game" className="menu-button">Multiplayer</Link>
          <Link to="/rules" className="menu-button">Rules</Link>
          <Link to="/leaderboard" className="menu-button">Leaderboard</Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage; 