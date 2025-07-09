import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './LeaderboardPage.css';
import { playGlassImpact, playClickSound } from '../assets/sounds/playSound';

// Echo animation constants (same as HomePage)
const ECHO_COUNT = 48;
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

// Mock leaderboard data
const mockLeaderboardData = [
  { rank: 1, player: "narju", score: 3150, wins: 47, losses: 0, winRate: "100%" },
  { rank: 2, player: "altplus4", score: 2720, wins: 43, losses: 7, winRate: "86%" },
  { rank: 3, player: "Echo Warrior", score: 2580, wins: 39, losses: 11, winRate: "78%" },
  { rank: 4, player: "Resonance", score: 2450, wins: 36, losses: 14, winRate: "72%" },
  { rank: 5, player: "Not_AFK", score: 2320, wins: 33, losses: 17, winRate: "66%" },
  { rank: 6, player: "Zak Gambler", score: 2180, wins: 30, losses: 20, winRate: "60%" },
  { rank: 7, player: "Pulse", score: 2050, wins: 27, losses: 23, winRate: "54%" },
  { rank: 8, player: "Toxic by Choice", score: 1920, wins: 24, losses: 26, winRate: "48%" },
  { rank: 9, player: "10yearoldkid", score: 1790, wins: 21, losses: 29, winRate: "42%" },
  { rank: 10, player: "TFink", score: 1260, wins: 7, losses: 43, winRate: "14%" },
];

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 480);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
};

const LeaderboardPage: React.FC = () => {
  const navigate = useNavigate();
  const startTime = useRef(performance.now());
  const [now, setNow] = useState(() => performance.now());
  const [pulse, setPulse] = useState(1);
  const SPEED = 0.00008;
  const [echoes, _setEchoes] = useState(() => generateEchoes());
  const [foregroundEchoes, _setForegroundEchoes] = useState(() => generateEchoes(FOREGROUND_ECHO_COUNT, 1.2));
  const isMobile = useIsMobile();

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

  return (
    <div className="home-page">
      {/* Home button */}
      <button
        onClick={() => { playClickSound(); navigate('/home'); }}
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          background: 'linear-gradient(145deg, #333, #444)',
          color: 'white',
          border: '2px solid #666',
          padding: '10px 20px',
          fontSize: '1rem',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontFamily: 'Orbitron, monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
          zIndex: 1000
        }}
        onMouseEnter={handleButtonHover}
        onMouseLeave={handleButtonLeave}
      >
        Home
      </button>

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

      {/* Content */}
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
        <h1>Leaderboard</h1>
        {!import.meta.env.DEV && (
          <div style={{ 
            fontSize: '1.2rem', 
            color: '#888', 
            marginTop: '-10px', 
            marginBottom: '20px',
            fontFamily: "'Orbitron', 'Rajdhani', 'Share Tech Mono', Arial, sans-serif",
            textAlign: 'center'
          }}>
            (Coming in Alpha v3)
          </div>
        )}
        
        {/* Leaderboard Table */}
        <div className="leaderboard-table">
          {isMobile ? (
            <>
              <div className="leaderboard-header grouped">
                <div className="leaderboard-header-group">Player</div>
                <div className="leaderboard-header-group">Record</div>
                <div className="leaderboard-header-group">Score</div>
              </div>
              {mockLeaderboardData.map((entry, index) => (
                <div
                  key={entry.rank}
                  className={`leaderboard-row grouped ${index % 2 === 0 ? 'even' : 'odd'}`}
                >
                  <div className="leaderboard-group rank-player">
                    <span className={`leaderboard-rank ${entry.rank === 1 ? 'gold' : entry.rank >= 2 && entry.rank <= 5 ? 'blue' : ''}`}>#{entry.rank}</span>
                    <span className="leaderboard-player">{entry.player}</span>
                  </div>
                  <div className="leaderboard-group wins-losses">
                    <span className="leaderboard-wins">{entry.wins}</span>
                    -
                    <span className="leaderboard-losses">{entry.losses}</span>
                  </div>
                  <div className="leaderboard-group score">
                    <span className="leaderboard-score">{entry.score}</span>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="leaderboard-header">
                <div className="leaderboard-header-rank">Rank</div>
                <div className="leaderboard-header-player">Player</div>
                <div className="leaderboard-header-score">Score</div>
                <div className="leaderboard-header-wins">Wins</div>
                <div className="leaderboard-header-losses">Losses</div>
                <div className="leaderboard-header-winrate">Win Rate</div>
              </div>
              {mockLeaderboardData.map((entry, index) => (
                <div
                  key={entry.rank}
                  className={`leaderboard-row ${index % 2 === 0 ? 'even' : 'odd'}`}
                >
                  <div className={`leaderboard-rank ${entry.rank === 1 ? 'gold' : entry.rank >= 2 && entry.rank <= 5 ? 'blue' : ''}`}>#{entry.rank}</div>
                  <div className="leaderboard-player">{entry.player}</div>
                  <div className="leaderboard-score">{entry.score}</div>
                  <div className="leaderboard-wins">{entry.wins}</div>
                  <div className="leaderboard-losses">{entry.losses}</div>
                  <div className="leaderboard-winrate">{entry.winRate}</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage; 
