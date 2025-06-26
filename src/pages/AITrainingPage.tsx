import React, { useState } from 'react';
import { HeadlessGameRunner } from '../simulation/HeadlessGameRunner';
import { RandomAgent } from '../ai/agents/rule-based/RandomAgent';

const AITrainingPage: React.FC = () => {
  // For now, no game is selected
  const [selectedGame, setSelectedGame] = useState(null);
  const [showGameViewer, setShowGameViewer] = useState(false);
  const [simulationLog, setSimulationLog] = useState<string[]>([]);

  const handleRunTestSimulation = () => {
    const agent1 = new RandomAgent('p1', 'RandomAgent1');
    const agent2 = new RandomAgent('p2', 'RandomAgent2');
    const runner = new HeadlessGameRunner();
    const result = runner.runGame(agent1, agent2);
    setSimulationLog(result.log);
  };

  const handleClearLogs = () => setSimulationLog([]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#14171c' }}>
      {/* Training Controls */}
      <div style={{ width: '100%', padding: '1.5rem 2rem 1rem 2rem', background: '#181c22', color: '#fff', display: 'flex', alignItems: 'center', gap: '2rem', borderBottom: '1px solid #222' }}>
        <div style={{ fontWeight: 700, fontSize: '1.3rem', letterSpacing: '0.02em' }}>AI Training Controls</div>
        <button style={{ padding: '0.5rem 1.2rem', borderRadius: 6, border: 'none', background: '#2196f3', color: '#fff', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}>Start Training</button>
        <button style={{ padding: '0.5rem 1.2rem', borderRadius: 6, border: 'none', background: '#ff9800', color: '#fff', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}>Pause</button>
        <button style={{ padding: '0.5rem 1.2rem', borderRadius: 6, border: 'none', background: '#444', color: '#fff', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}>Stop</button>
        <button onClick={handleRunTestSimulation} style={{ padding: '0.5rem 1.2rem', borderRadius: 6, border: 'none', background: '#4CAF50', color: '#fff', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}>Run Test Simulation</button>
        <div style={{ marginLeft: 'auto', color: '#aaa', fontSize: '1rem' }}>[Agent/Parameter selectors coming soon]</div>
      </div>
      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'stretch', justifyContent: 'center', gap: '2rem', padding: '2rem' }}>
        {/* Games List */}
        <div style={{ minWidth: 320, maxWidth: 400, flex: '0 0 350px', background: '#181c22', borderRadius: 12, padding: '2rem 1.5rem', color: '#fff', boxShadow: '0 2px 12px #0002', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Training Games</h2>
          <div style={{ color: '#aaa', fontSize: '1.1rem', textAlign: 'center' }}>
            No games to display.<br />Start a training session to see games here.
          </div>
        </div>
        {/* Stats/Agent Info */}
        <div style={{ flex: 1, background: '#23272f', borderRadius: 12, padding: '2rem', color: '#fff', boxShadow: '0 2px 12px #0002', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ fontWeight: 600, fontSize: '1.2rem', marginBottom: '1rem' }}>Training Stats & Agent Info</div>
          <div style={{ color: '#aaa', fontSize: '1.1rem' }}>
            [Win rates, average scores, agent details, and analytics will appear here.]
          </div>
        </div>
        {/* Logs Panel */}
        <div style={{ minWidth: 600, maxWidth: 600, flex: '0 0 600px', background: '#181c22', borderRadius: 12, padding: '2rem 1.5rem', color: '#fff', boxShadow: '0 2px 12px #0002', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Logs</h2>
          <div style={{ flex: 1, background: '#11141a', borderRadius: 8, padding: '1rem', color: '#b0b0b0', fontFamily: 'monospace', fontSize: '1rem', overflowY: 'auto', minHeight: 200, maxHeight: 400 }}>
            {simulationLog.length === 0 ? '[Game logs, debug output, and errors will appear here.]' : simulationLog.map((line, idx) => <div key={idx}>{line}</div>)}
          </div>
          <button onClick={handleClearLogs} style={{ marginTop: '1rem', alignSelf: 'flex-end', padding: '0.4rem 1.1rem', borderRadius: 6, border: 'none', background: '#333', color: '#fff', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer' }}>Clear Logs</button>
        </div>
      </div>
      {/* Game Viewer Modal (only visible if a game is selected) */}
      {showGameViewer && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(20,22,28,0.92)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#23272f', borderRadius: 16, padding: '2.5rem', minWidth: 600, minHeight: 600, boxShadow: '0 4px 32px #0008', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button onClick={() => setShowGameViewer(false)} style={{ position: 'absolute', top: 18, right: 18, background: '#222', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}>Close</button>
            <div style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 700, marginBottom: '1.5rem' }}>Game Viewer</div>
            <div style={{ color: '#aaa', fontSize: '1.1rem' }}>[Game board and controls will appear here when a game is selected.]</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AITrainingPage; 