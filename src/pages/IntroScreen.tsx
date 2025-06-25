import React, { useEffect, useState, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useNavigate } from 'react-router-dom';

const introLines = [
  'All is an echo - ',
  'a trace of what endures.',
  '',
  'What enters was always there,',
  'and what fades never was.',
  '',
  'Memories are illusion,',
  'and death is the only means of change.'
];

const FADE_IN_DURATION = 5600; // ms per line (much slower)
const ECHO_COUNT = 36;
const FOREGROUND_ECHO_COUNT = Math.round(ECHO_COUNT * 0.8);
const ECHO_COLORS = [
  { main: '#ff9800', glow: '#ffd580' }, // orange
  { main: '#2196f3', glow: '#90caf9' }  // blue
];
const STANZA_COLORS = [
  { color: '#ff9800', glow: '#ffd580' }, // orange
  { color: '#2196f3', glow: '#90caf9' }  // blue
];

// Add outwardBias helper at the top level
function outwardBias(cx: number, cy: number, center: number, biasStrength: number) {
  const dx = cx - center;
  const dy = cy - center;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return { bx: cx, by: cy };
  const bias = 1 + biasStrength * (dist / center);
  return {
    bx: center + dx * bias,
    by: center + dy * bias,
  };
}

// Helper to generate random movement paths
function generateEchoes(count = ECHO_COUNT, sizeMultiplier = 1) {
  return Array.from({ length: count }).map((_, i) => {
    const color = ECHO_COLORS[i % 2];
    // Random center for each echo, scattered in a large ring/annulus
    const centerRadius = 400 + Math.random() * 400; // 400-800 px from screen center
    const centerAngle = Math.random() * 2 * Math.PI;
    const centerX = 1000 + Math.cos(centerAngle) * centerRadius;
    const centerY = 1000 + Math.sin(centerAngle) * centerRadius;
    const angle = Math.random() * 2 * Math.PI;
    const radius = 120 + Math.random() * 120; // local orbit radius (smaller)
    const size = sizeMultiplier * (72 + Math.random() * 8); // 100.8 to 112 px, scaled
    const freqX = 0.7 + Math.random() * 0.4; // 0.7 to 1.1
    const freqY = 0.7 + Math.random() * 0.4; // 0.7 to 1.1
    const phase = Math.random() * Math.PI * 2;
    return { color, angle, radius, size, freqX, freqY, phase, centerX, centerY };
  });
}

// Helper to split lines into stanzas (2 lines per stanza, separated by blank lines)
function getStanzaIndex(lineIdx: number) {
  // Stanza 0: lines 0,1; Stanza 1: lines 3,4; Stanza 2: lines 6,7
  if (lineIdx < 2) return 0;
  if (lineIdx < 5) return 1;
  return 2;
}

// Helper to highlight specific words in the intro text
function highlightWords(line: string, stanzaColor: { color: string, glow: string }, fadeOutFades = false) {
  const blueWords = ['echo', 'trace', 'illusion', 'death'];
  const orangeWords = ['always', 'fades'];
  // Regex to match any of the target words, case-insensitive
  const regex = new RegExp(`\\b(${[...blueWords, ...orangeWords].join('|')})\\b`, 'gi');
  const parts = line.split(regex);
  return parts.map((part, i) => {
    const lower = part.toLowerCase();
    if (blueWords.includes(lower)) {
      return <span key={i} style={{ color: '#1565c0', textShadow: '0 0 8px #fff, 0 0 16px #fff, 0 0 24px #fff' }}>{part}</span>;
    }
    if (orangeWords.includes(lower)) {
      // If this is the word 'fades' and fadeOutFades is true, apply the fade-out animation
      if (lower === 'fades' && fadeOutFades) {
        return <span key={i} style={{ color: '#fb8c00', textShadow: '0 0 8px #fff, 0 0 16px #fff, 0 0 24px #fff', animation: 'fades-fade-out 18s linear forwards', display: 'inline-block' }}>{part}</span>;
      }
      return <span key={i} style={{ color: '#fb8c00', textShadow: '0 0 8px #fff, 0 0 16px #fff, 0 0 24px #fff' }}>{part}</span>;
    }
    // Non-highlighted text gets the stanza glow
    return <span key={i} style={{ color: '#fff', textShadow: `0 0 16px ${stanzaColor.glow}, 0 0 32px ${stanzaColor.color}, 0 0 48px ${stanzaColor.glow}` }}>{part}</span>;
  });
}

const IntroScreen: React.FC = () => {
  const [visibleLines, setVisibleLines] = useState(0);
  const [ready, setReady] = useState(false);
  const [fadeOutFadesActive, setFadeOutFadesActive] = useState(false);
  const [exiting, setExiting] = useState(false);
  const navigate = useNavigate();
  const startTime = useRef(performance.now());
  const [showEchoes, setShowEchoes] = useState(true);
  const [now, setNow] = useState(() => performance.now());
  const [pulse, setPulse] = useState(1);
  const SPEED = 0.0001;
  useEffect(() => {
    if (!showEchoes) return;
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
  }, [showEchoes]);
  const t = (now - startTime.current) * SPEED;
  const tFast = t * 1.25;

  // Fade in lines one by one
  useEffect(() => {
    if (visibleLines < introLines.length) {
      if (introLines[visibleLines] === '') {
        setVisibleLines(visibleLines + 1);
        return;
      }
      const delay = visibleLines === 0 ? 2000 : FADE_IN_DURATION;
      const timeout = setTimeout(() => setVisibleLines(visibleLines + 1), delay);
      if (visibleLines === 4) {
        setTimeout(() => setFadeOutFadesActive(true), FADE_IN_DURATION);
      }
      return () => clearTimeout(timeout);
    } else {
      // Wait FADE_IN_DURATION before setting ready, so last line is fully rendered
      const timeout = setTimeout(() => setReady(true), FADE_IN_DURATION);
      return () => clearTimeout(timeout);
    }
  }, [visibleLines]);

  // Generate echoes once for animation
  const echoes = useRef(generateEchoes());
  const foregroundEchoes = useRef(generateEchoes(FOREGROUND_ECHO_COUNT, 1.3));

  // Proceed on any input (keypress, click, or touch) after all lines are shown
  const proceed = useCallback(() => {
    if (ready && !exiting) {
      setExiting(true);
      navigate('/home');
    }
  }, [ready, exiting, navigate]);

  useEffect(() => {
    if (!ready) return;
    const handler = (e: Event) => {
      proceed();
    };
    window.addEventListener('keydown', handler);
    window.addEventListener('mousedown', handler);
    window.addEventListener('touchstart', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('mousedown', handler);
      window.removeEventListener('touchstart', handler);
    };
  }, [ready, proceed]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: "'Orbitron', 'Rajdhani', 'Share Tech Mono', Arial, sans-serif",
      fontSize: '2rem',
      letterSpacing: '0.02em',
      lineHeight: 2.1,
      padding: '0 1.5rem',
      transition: 'background 1s',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <svg width="100vw" height="100vh" viewBox="0 0 2000 2000" style={{ width: '100vw', height: '170vh', display: 'block' }}>
          {showEchoes && <>
            {/* Background echoes */}
            {echoes.current.map((e, i) => {
              let cx = e.centerX + Math.cos(e.angle + t * e.freqX + e.phase) * e.radius;
              let cy = e.centerY + Math.sin(e.angle + t * e.freqY + e.phase) * e.radius;
              const { bx, by } = outwardBias(cx, cy, 1000, 0.85);
              const isOrange = e.color.main === '#ff9800';
              return (
                <foreignObject
                  key={i}
                  x={bx - e.size / 2}
                  y={by - e.size / 2}
                  width={e.size}
                  height={e.size}
                  style={{ overflow: 'visible', pointerEvents: 'none', opacity: 0.75 }}
                >
                  <div style={{ position: 'relative', width: e.size, height: e.size }}>
                    <div
                      className={`echo-3d-pulse ${isOrange ? 'echo-player1' : 'echo-player2'}`}
                      style={{ width: e.size, height: e.size, borderRadius: '50%', opacity: 0.75 }}
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
                        opacity: 0.32 + 0.32 * pulse,
                        zIndex: 3,
                        transition: 'opacity 0.2s linear',
                      }}
                    />
                  </div>
                </foreignObject>
              );
            })}
            {/* Foreground echoes */}
            {foregroundEchoes.current.map((e, i) => {
              const tFast = t * 1.25;
              let cx = e.centerX + Math.cos(e.angle + tFast * e.freqX + e.phase) * e.radius;
              let cy = e.centerY + Math.sin(e.angle + tFast * e.freqY + e.phase) * e.radius;
              const { bx, by } = outwardBias(cx, cy, 1000, 0.85);
              const isOrange = e.color.main === '#ff9800';
              return (
                <foreignObject
                  key={i + 1000}
                  x={bx - e.size / 2}
                  y={by - e.size / 2}
                  width={e.size}
                  height={e.size}
                  style={{ overflow: 'visible', pointerEvents: 'none', opacity: 0.93 }}
                >
                  <div style={{ position: 'relative', width: e.size, height: e.size }}>
                    <div
                      className={`echo-3d-pulse ${isOrange ? 'echo-player1' : 'echo-player2'}`}
                      style={{ width: e.size, height: e.size, borderRadius: '50%', opacity: 0.93 }}
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
                        opacity: 0.32 + 0.32 * pulse,
                        zIndex: 3,
                        transition: 'opacity 0.2s linear',
                      }}
                    />
                  </div>
                </foreignObject>
              );
            })}
          </>}
        </svg>
      </div>
      <div style={{ maxWidth: 800, textAlign: 'center', zIndex: 1, position: 'relative' }}>
        <style>{`
          @keyframes intro-fade-pulse {
            0% { opacity: 0; }
            1% { opacity: 0.01; }
            2% { opacity: 0.02; }
            3% { opacity: 0.03; }
            4% { opacity: 0.04; }
            5% { opacity: 0.05; }
            10% { opacity: 0.1; }
            15% { opacity: 0.15; }
            20% { opacity: 0.20; }
            25% { opacity: 0.25; }
            30% { opacity: 0.22; }
            35% { opacity: 0.19; }
            40% { opacity: 0.18; }
            45% { opacity: 0.20; }
            50% { opacity: 0.22; }
            55% { opacity: 0.27; }
            60% { opacity: 0.32; }
            65% { opacity: 0.37; }
            70% { opacity: 0.42; }
            75% { opacity: 0.49; }
            80% { opacity: 0.56; }
            85% { opacity: 0.63; }
            90% { opacity: 0.71; }
            95% { opacity: 0.78; }
            100% { opacity: 0.82; }
          }
          @keyframes fades-fade-out {
            0% { opacity: 1; }
            100% { opacity: 0; }
          }
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
        {introLines.map((line, i) => {
          const stanzaIdx = getStanzaIndex(i);
          const stanzaColor = STANZA_COLORS[stanzaIdx % 2];
          const isLastLine = i === introLines.length - 1;
          const isVisible = i < visibleLines;
          const animation = isVisible ? 'intro-fade-pulse 5600ms linear forwards' : undefined;
          // If this is the 'and what fades never was.' line, fade out 'fades' only when fadeOutFadesActive is true
          const fadeOutFades = i === 4 && fadeOutFadesActive;
          if (isLastLine) {
            return (
              <div
                key={i}
                style={{
                  opacity: isVisible ? 1 : 0,
                  marginBottom: line === '' ? '1.5rem' : '0.2rem',
                  whiteSpace: 'nowrap',
                  color: '#fff',
                  fontWeight: 600,
                  fontFamily: "'Orbitron', 'Rajdhani', 'Share Tech Mono', Arial, sans-serif",
                  display: 'inline-block',
                  maxWidth: 'none',
                  animation,
                }}
              >
                {highlightWords(line, stanzaColor, fadeOutFades)}
              </div>
            );
          }
          return (
            <div
              key={i}
              style={{
                opacity: isVisible ? 1 : 0,
                marginBottom: line === '' ? '1.5rem' : '0.2rem',
                whiteSpace: 'pre-line',
                color: line === '' ? undefined : '#fff',
                fontWeight: 600,
                fontFamily: "'Orbitron', 'Rajdhani', 'Share Tech Mono', Arial, sans-serif",
                animation,
              }}
            >
              {highlightWords(line, stanzaColor, fadeOutFades)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IntroScreen; 