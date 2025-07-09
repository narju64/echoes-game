import React, { useState, useEffect } from 'react';
import { backgroundMusic, setMenuThemeLoop } from '../assets/sounds/playSound';

const AITournamentPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'standings' | 'bracket'>('standings');
  const [showGameViewer, setShowGameViewer] = useState(false);
  const [musicStarted, setMusicStarted] = useState(false);

  // Start background music when component mounts
  useEffect(() => {
    // Set custom loop overlap for seamless FL Studio loops
    setMenuThemeLoop(); // Uses MENU_THEME constant
    
    // Try to play menu music
    backgroundMusic.play('menuTheme', 0.4);
    return () => {
      // Don't stop music when leaving AI tournament page
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#14171c' }}>
      {/* Tournament Setup Controls */}
      <div style={{ width: '100%', maxWidth: 1600, margin: '0 auto', padding: '1.5rem 2rem 1rem 2rem', background: '#181c22', color: '#fff', display: 'flex', alignItems: 'center', gap: '2rem', borderBottom: '1px solid #222', boxSizing: 'border-box' }}>
        <div style={{ fontWeight: 700, fontSize: '1.3rem', letterSpacing: '0.02em' }}>Tournament Setup</div>
        <button style={{ padding: '0.5rem 1.2rem', borderRadius: 6, border: 'none', background: '#2196f3', color: '#fff', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}>Start Tournament</button>
        <button style={{ padding: '0.5rem 1.2rem', borderRadius: 6, border: 'none', background: '#444', color: '#fff', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}>Reset</button>
        <div style={{ marginLeft: 'auto', color: '#aaa', fontSize: '1rem' }}>[Agent selection & format controls coming soon]</div>
      </div>
      {/* Main Content Area */}
      <div style={{ flex: 1, width: '100%', maxWidth: 1600, margin: '0 auto', display: 'flex', flexDirection: 'row', alignItems: 'stretch', justifyContent: 'center', gap: '2rem', padding: '2rem', boxSizing: 'border-box' }}>
        {/* Match List/History */}
        <div style={{ minWidth: 320, maxWidth: 400, flex: '0 0 350px', background: '#181c22', borderRadius: 12, padding: '2rem 1.5rem', color: '#fff', boxShadow: '0 2px 12px #0002', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Match List</h2>
          <div style={{ color: '#aaa', fontSize: '1.1rem', textAlign: 'center' }}>
            No matches to display.<br />Start a tournament to see matches here.
          </div>
        </div>
        {/* Center Panel: Tabs for Bracket and Standings */}
        <div style={{ flex: 1, background: '#23272f', borderRadius: 12, padding: '2rem', color: '#fff', boxShadow: '0 2px 12px #0002', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <button onClick={() => setActiveTab('standings')} style={{ padding: '0.5rem 1.5rem', borderRadius: 6, border: 'none', background: activeTab === 'standings' ? '#2196f3' : '#222', color: '#fff', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}>Standings</button>
            <button onClick={() => setActiveTab('bracket')} style={{ padding: '0.5rem 1.5rem', borderRadius: 6, border: 'none', background: activeTab === 'bracket' ? '#2196f3' : '#222', color: '#fff', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}>Bracket</button>
          </div>
          {activeTab === 'standings' ? (
            <div>
              <div style={{ fontWeight: 600, fontSize: '1.2rem', marginBottom: '1rem' }}>Leaderboard / Standings</div>
              <div style={{ color: '#aaa', fontSize: '1.1rem' }}>[Standings table will appear here]</div>
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: 600, fontSize: '1.2rem', marginBottom: '1rem' }}>Tournament Bracket</div>
              <div style={{ color: '#aaa', fontSize: '1.1rem' }}>[Bracket visualization will appear here]</div>
            </div>
          )}
        </div>
        {/* Logs Panel */}
        <div style={{ minWidth: 320, maxWidth: 400, flex: '0 0 350px', background: '#181c22', borderRadius: 12, padding: '2rem 1.5rem', color: '#fff', boxShadow: '0 2px 12px #0002', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Logs</h2>
          <div style={{ flex: 1, background: '#11141a', borderRadius: 8, padding: '1rem', color: '#b0b0b0', fontFamily: 'monospace', fontSize: '1rem', overflowY: 'auto', minHeight: 200, maxHeight: 400 }}>
            [Tournament logs, debug output, and errors will appear here.]
          </div>
          <button style={{ marginTop: '1rem', alignSelf: 'flex-end', padding: '0.4rem 1.1rem', borderRadius: 6, border: 'none', background: '#333', color: '#fff', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer' }}>Clear Logs</button>
        </div>
      </div>
      {/* Game Viewer Modal (only visible if a match is being watched) */}
      {showGameViewer && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(20,22,28,0.92)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#23272f', borderRadius: 16, padding: '2.5rem', minWidth: 600, minHeight: 600, boxShadow: '0 4px 32px #0008', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button onClick={() => setShowGameViewer(false)} style={{ position: 'absolute', top: 18, right: 18, background: '#222', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}>Close</button>
            <div style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 700, marginBottom: '1.5rem' }}>Game Viewer</div>
            <div style={{ color: '#aaa', fontSize: '1.1rem' }}>[Game board and controls will appear here when a match is selected.]</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AITournamentPage; 
