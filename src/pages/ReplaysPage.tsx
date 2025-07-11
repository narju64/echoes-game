import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { playClickSound } from '../assets/sounds/playSound';
import Board from '../components/Board';
import type { Echo, TurnHistoryEntry } from '../types/gameTypes';
import { simulateReplay, type ReplayState } from '../simulation/ReplaySimulator';
import './ReplaysPage.css';

// API base URL is controlled by VITE_API_BASE_URL in your .env file. Example:
// VITE_API_BASE_URL=https://echoesbackend.narju.net

interface Match {
  matchId: string;
  startTime: number;
  endTime?: number;
  gameMode: string;
  players: string[];
  playerNames?: { [key: string]: string };
  winner?: string;
  winCondition?: string;
  duration?: number;
  events?: any[];
  eventCount?: number;
  turnCount?: number;
  initialState?: any;
  finalState?: any;
  finalScore?: { [key: string]: number };
  loggedAt?: number;
  serverVersion?: string;
}

const ReplaysPage: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [fullMatchData, setFullMatchData] = useState<{ [key: string]: Match }>({});
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Replay viewer state
  const [currentReplayTurn, setCurrentReplayTurn] = useState(0);
  const [currentReplayTick, setCurrentReplayTick] = useState(0);
  const [replayStates, setReplayStates] = useState<ReplayState[]>([]);
  const [reconstructedEchoes, setReconstructedEchoes] = useState<Echo[]>([]);
  const [replayProjectiles, setReplayProjectiles] = useState<any[]>([]);
  const [replayCollisions, setReplayCollisions] = useState<{ row: number; col: number }[]>([]);
  const [replayShieldBlocks, setReplayShieldBlocks] = useState<{ row: number; col: number; projectileDirection: any }[]>([]);

  // Add state for play/pause
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = React.useRef<number | null>(null);

  // Add backend status state
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  // Backend status check on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL;
        const resp = await fetch(`${API_BASE}/api/matches`, { method: 'GET' });
        if (resp.ok) {
          setBackendStatus('online');
        } else {
          setBackendStatus('offline');
        }
      } catch {
        setBackendStatus('offline');
      }
    };
    checkBackend();
  }, []);

  useEffect(() => {
    fetchMatches();
  }, []);

  // Effect to handle play/pause
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = window.setInterval(() => {
        // If at last tick of turn
        if (currentReplayTick >= replayStates.length - 1) {
          // If at last turn, pause
          if (
            !selectedMatch?.finalState?.turnHistory ||
            currentReplayTurn >= selectedMatch.finalState.turnHistory.length - 1
          ) {
            setIsPlaying(false);
            return;
          }
          // Otherwise, go to next turn
          handleNextTurn();
        } else {
          handleNextTick();
        }
      }, 600);
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    };
  }, [isPlaying, currentReplayTick, replayStates.length, currentReplayTurn, selectedMatch]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      // Use environment variable for API base URL
      const API_BASE = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${API_BASE}/api/matches`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('Fetched matches:', data);
      if (data.matches && Array.isArray(data.matches)) {
        setMatches(data.matches);
      } else {
        console.error('Invalid matches data format:', data);
        setError('Invalid data format received from server');
      }
    } catch (err) {
      console.error('Failed to fetch matches:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch matches');
    } finally {
      setLoading(false);
    }
  };

  const handleMatchSelect = async (match: Match) => {
    playClickSound();
    console.log('Selected match:', match);
    setSelectedMatch(match);

    // Fetch full match details
    try {
      // Use environment variable for API base URL
      const API_BASE = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${API_BASE}/api/matches/${match.matchId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const responseData = await response.json();
      console.log('Full match data:', responseData);
      
      // Extract the actual match data from the response
      const fullMatchData = responseData.match || responseData;
      console.log('Extracted match data:', fullMatchData);
      console.log('Full match fields:', Object.keys(fullMatchData));
      
      // Store the full match data so we can use it in the table
      setFullMatchData(prev => ({
        ...prev,
        [match.matchId]: fullMatchData
      }));
      
      setSelectedMatch(fullMatchData);
      
      // Initialize replay viewer with first turn
      setCurrentReplayTurn(0);
      setCurrentReplayTick(0);
      initializeReplayForTurn(fullMatchData, 0);
    } catch (err) {
      console.error('Failed to fetch match details:', err);
      // Continue with basic match data if detailed fetch fails
    }
  };

  const initializeReplayForTurn = (match: Match, turnIndex: number) => {
    if (!match.finalState?.turnHistory || turnIndex >= match.finalState.turnHistory.length) {
      return;
    }

    const turnHistory = match.finalState.turnHistory as TurnHistoryEntry[];
    const turnData = turnHistory[turnIndex];
    
    // Combine player1 and player2 echoes and add startingPosition
    const allEchoes = [...turnData.player1Echoes, ...turnData.player2Echoes].map(echo => ({
      ...echo,
      startingPosition: { ...echo.position }
    }));
    
    console.log('Initializing replay for turn', turnIndex, 'with echoes:', allEchoes);
    
    // Simulate the replay for this turn
    const sim = simulateReplay(allEchoes);
    console.log('Replay simulation result:', sim);
    
    setReplayStates(sim);
    setCurrentReplayTick(0);
    
    // Update the board with the first tick state
    if (sim.length > 0) {
      const firstState = sim[0];
      setReconstructedEchoes(firstState.echoes);
      setReplayProjectiles(firstState.projectiles.map(p => ({
        row: p.position.row,
        col: p.position.col,
        type: p.type,
        direction: p.direction
      })));
      setReplayCollisions(firstState.collisions);
      setReplayShieldBlocks(firstState.shieldBlocks);
    }
  };

  const updateReplayDisplay = (tickIndex: number) => {
    if (tickIndex >= replayStates.length) return;
    
    const state = replayStates[tickIndex];
    setReconstructedEchoes(state.echoes);
    setReplayProjectiles(state.projectiles.map(p => ({
      row: p.position.row,
      col: p.position.col,
      type: p.type,
      direction: p.direction
    })));
    setReplayCollisions(state.collisions);
    setReplayShieldBlocks(state.shieldBlocks);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A';
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatWinCondition = (winCondition?: string) => {
    if (!winCondition) return 'N/A';
    
    switch (winCondition) {
      case '10_points':
        return 'Points';
      case '8_columns':
        return 'Echoes';
      case 'opponent_destroyed':
        return 'Destruction';
      default:
        return winCondition;
    }
  };

  const clearAllMatches = async () => {
    // Show confirmation dialog
    if (!window.confirm('Are you sure you want to delete ALL matches? This action cannot be undone.')) {
      return;
    }

    try {
      // Make DELETE request to backend
      const API_BASE = import.meta.env.VITE_API_BASE_URL;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Include admin key as required by backend
      const adminKey = import.meta.env.VITE_ADMIN_KEY;
      if (adminKey) {
        headers['x-admin-key'] = adminKey;
        console.log('Admin key found and included in headers');
      } else {
        throw new Error('Admin key not configured. Please set VITE_ADMIN_KEY in your .env file.');
      }
      
      console.log('Request headers:', headers);
      console.log('Making DELETE request to:', `${API_BASE}/api/matches`);
      
      const response = await fetch(`${API_BASE}/api/matches`, {
        method: 'DELETE',
        headers
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Show success message
      alert(`✅ Successfully cleared ${data.deletedCount} matches!`);
      
      // Refresh the matches list
      fetchMatches();
      
    } catch (error) {
      console.error('Error clearing matches:', error);
      alert(`❌ Error clearing matches: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handlePreviousTurn = () => {
    if (!selectedMatch || currentReplayTurn <= 0) return;
    const newTurn = currentReplayTurn - 1;
    setCurrentReplayTurn(newTurn);
    setCurrentReplayTick(0);
    initializeReplayForTurn(selectedMatch, newTurn);
  };

  const handleNextTurn = () => {
    if (!selectedMatch || !selectedMatch.finalState?.turnHistory || 
        currentReplayTurn >= selectedMatch.finalState.turnHistory.length - 1) return;
    const newTurn = currentReplayTurn + 1;
    setCurrentReplayTurn(newTurn);
    setCurrentReplayTick(0);
    initializeReplayForTurn(selectedMatch, newTurn);
  };



  const handlePreviousTick = () => {
    if (currentReplayTick > 0) {
      const newTick = currentReplayTick - 1;
      setCurrentReplayTick(newTick);
      updateReplayDisplay(newTick);
    }
  };

  const handleNextTick = () => {
    if (currentReplayTick < replayStates.length - 1) {
      const newTick = currentReplayTick + 1;
      setCurrentReplayTick(newTick);
      updateReplayDisplay(newTick);
    }
  };



  if (loading) {
    return (
      <div className="replays-page">
        <div className="loading">Loading matches...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="replays-page">
        <div className="error">
          <h2>Error Loading Matches</h2>
          <p>{error}</p>
          <button onClick={fetchMatches} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="replays-page">
      <div className="replays-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1>Match Replays</h1>
          {/* Backend status indicator */}
          <span style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '0.95rem',
            background: backendStatus === 'online' ? '#1e4620' : (backendStatus === 'offline' ? '#4a1e1e' : '#333'),
            color: backendStatus === 'online' ? '#4caf50' : (backendStatus === 'offline' ? '#f44336' : '#ccc'),
            border: backendStatus === 'online' ? '2px solid #4caf50' : (backendStatus === 'offline' ? '2px solid #f44336' : '2px solid #888'),
            marginLeft: '8px',
            letterSpacing: '1px',
            transition: 'all 0.2s',
          }}>
            Backend: {backendStatus === 'checking' ? 'Checking...' : backendStatus === 'online' ? 'Online' : 'Offline'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={clearAllMatches}
            className="clear-all-button"
          >
            🗑️ Clear All Matches
          </button>
          <Link to="/" className="back-button" onClick={playClickSound}>
            ← Back to Menu
          </Link>
        </div>
      </div>

      <div className="replays-layout">
        {/* Left Panel - Match List */}
        <div className="match-list-panel">
          <h2>Available Matches ({matches.length})</h2>
          <div className="matches-table-container">
            <table className="matches-table">
              <thead>
                <tr>
                  <th>Match ID</th>
                  <th>Date</th>
                  <th>Game Mode</th>
                  <th>Players</th>
                  <th>Duration</th>
                  <th>Winner</th>
                  <th>Win Condition</th>
                  <th>Events</th>
                  <th>Turns</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match, index) => (
                  <tr 
                    key={match.matchId || `match-${index}`} 
                    className={selectedMatch?.matchId === match.matchId ? 'selected' : ''}
                    onClick={() => handleMatchSelect(match)}
                  >
                    <td>{match.matchId ? match.matchId.split('_').pop() || 'Unknown' : 'Unknown'}</td>
                    <td>{match.startTime ? formatDate(match.startTime) : 'Unknown'}</td>
                    <td>
                      <span className={`game-mode-badge ${match.gameMode?.toLowerCase() || ''}`}>
                        {fullMatchData[match.matchId]?.gameMode || match.gameMode || 'Unknown'}
                      </span>
                    </td>
                    <td>
                      {match.playerNames ? 
                        `${match.playerNames.player1 || 'Player 1'} vs ${match.playerNames.player2 || 'Player 2'}` : 
                        match.players?.join(' vs ') || 'Unknown'
                      }
                    </td>
                    <td>{formatDuration(match.duration)}</td>
                    <td>
                      {match.winner ? (
                        <span className={`winner-badge ${match.winner.toLowerCase()}`}>{match.winner}</span>
                      ) : (
                        <span className="no-winner">N/A</span>
                      )}
                    </td>
                    <td>
                      <span className={`win-condition-badge ${formatWinCondition(match.winCondition)?.toLowerCase()}`}>
                        {formatWinCondition(match.winCondition)}
                      </span>
                    </td>
                    <td>{match.eventCount || 0}</td>
                    <td>{match.turnCount || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Panel - Replay Viewer */}
        <div className="replay-panel">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
            {/* Turn display */}
            <div style={{
              display: 'inline-block',
              padding: '6px 12px',
              fontSize: '0.8rem',
              background: 'linear-gradient(145deg, #555, #666)',
              color: '#ccc',
              border: '2px solid #777',
              borderRadius: '12px',
              fontFamily: 'Orbitron, monospace',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
              cursor: 'default',
              marginRight: '2px',
              lineHeight: '1',
              verticalAlign: 'middle'
            }}>
              Turn {currentReplayTurn + 1} of {selectedMatch?.finalState?.turnHistory?.length || 0}
            </div>
            {/* Tick display */}
            <div style={{
              display: 'inline-block',
              padding: '6px 12px',
              fontSize: '0.8rem',
              background: 'linear-gradient(145deg, #555, #666)',
              color: '#ccc',
              border: '2px solid #777',
              borderRadius: '12px',
              fontFamily: 'Orbitron, monospace',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
              cursor: 'default',
              marginRight: '8px',
              lineHeight: '1',
              verticalAlign: 'middle'
            }}>
              Tick {currentReplayTick + 1} of {replayStates.length}
            </div>
            {/* Previous Turn */}
            <button className="control-btn" style={{ minWidth: 70 }}
              onClick={handlePreviousTurn}
              disabled={currentReplayTurn <= 0}
            >
              ⏮ Turn
            </button>
            {/* Previous Tick */}
            <button className="control-btn" style={{ minWidth: 70 }}
              onClick={handlePreviousTick}
              disabled={currentReplayTick <= 0}
            >
              ◀ Tick
            </button>
            {/* Play/Pause */}
            <button className="control-btn" style={{ minWidth: 70 }}
              onClick={() => setIsPlaying(p => !p)}
              disabled={replayStates.length <= 1}
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            {/* Next Tick */}
            <button className="control-btn" style={{ minWidth: 70 }}
              onClick={handleNextTick}
              disabled={currentReplayTick >= replayStates.length - 1}
            >
              Tick ▶
            </button>
            {/* Next Turn */}
            <button className="control-btn" style={{ minWidth: 70 }}
              onClick={handleNextTurn}
              disabled={!selectedMatch?.finalState?.turnHistory || currentReplayTurn >= (selectedMatch.finalState.turnHistory.length - 1)}
            >
              Turn ⏭
            </button>
          </div>
          
          {selectedMatch ? (
            <div className="replay-content">
              <div className="game-board-placeholder">
                {/* Score bar inside the board placeholder, above the board */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  maxWidth: 480,
                  margin: '0 auto 10px auto',
                  padding: '8px 16px',
                  background: '#181818',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px #0006',
                  fontFamily: 'Orbitron, monospace',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  letterSpacing: '1px',
                }}>
                  <div style={{ color: '#ff9800', textShadow: '0 0 1px #fff' }}>
                    {selectedMatch.playerNames?.player1 || 'Player 1'}: <b>{selectedMatch.finalState?.turnHistory?.[currentReplayTurn]?.scores?.player1 ?? 0}</b>
                  </div>
                  <div style={{ color: 'blue', textShadow: '0 0 1px #fff' }}>
                    {selectedMatch.playerNames?.player2 || 'Player 2'}: <b>{selectedMatch.finalState?.turnHistory?.[currentReplayTurn]?.scores?.player2 ?? 0}</b>
                  </div>
                </div>
                <Board
                  echoes={reconstructedEchoes}
                  projectiles={replayProjectiles}
                  collisions={replayCollisions}
                  shieldBlocks={replayShieldBlocks}
                />
              </div>
            </div>
          ) : (
            <div className="no-match-selected">
              <h3>Select a Match</h3>
              <p>Click on any match in the list to view its replay</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReplaysPage; 