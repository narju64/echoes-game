import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { playClickSound } from '../assets/sounds/playSound';
import Board from '../components/Board';
import type { Echo, TurnHistoryEntry } from '../types/gameTypes';
import './ReplaysPage.css';

interface Match {
  matchId: string;
  startTime: number;
  endTime?: number;
  gameMode: string;
  players: string[];
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
  const [reconstructedEchoes, setReconstructedEchoes] = useState<Echo[]>([]);
  const [replayProjectiles, setReplayProjectiles] = useState<any[]>([]);
  const [replayCollisions, setReplayCollisions] = useState<{ row: number; col: number }[]>([]);
  const [replayShieldBlocks, setReplayShieldBlocks] = useState<{ row: number; col: number; projectileDirection: any }[]>([]);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const API_BASE = import.meta.env.DEV 
        ? 'http://localhost:3000' 
        : 'https://echoesbackend.narju.net';
      
      const response = await fetch(`${API_BASE}/api/matches`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Fetched matches:', data);
      
      // Handle different response formats
      const matchesData = data.matches || data;
      console.log('Processed matches data:', matchesData);
      
      // Log the first match to see what fields are available
      if (matchesData && matchesData.length > 0) {
        console.log('First match fields:', Object.keys(matchesData[0]));
        console.log('First match data:', matchesData[0]);
      }
      
      setMatches(matchesData);
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
      const API_BASE = import.meta.env.DEV 
        ? 'http://localhost:3000' 
        : 'https://echoesbackend.narju.net';
      
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
      reconstructGameStateForTurn(fullMatchData, 0);
    } catch (err) {
      console.error('Failed to fetch match details:', err);
      // Continue with basic match data if detailed fetch fails
    }
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

  const reconstructGameStateForTurn = (match: Match, turnIndex: number) => {
    if (!match.finalState?.turnHistory || turnIndex >= match.finalState.turnHistory.length) {
      return;
    }

    const turnHistory = match.finalState.turnHistory as TurnHistoryEntry[];
    const turnData = turnHistory[turnIndex];
    
    // Combine player1 and player2 echoes
    const allEchoes = [...turnData.player1Echoes, ...turnData.player2Echoes];
    
    // Convert collisions and shield blocks to the format expected by Board component
    const collisions = turnData.collisions || [];
    const shieldBlocks = turnData.shieldBlocks || [];
    
    setReconstructedEchoes(allEchoes);
    setReplayProjectiles([]); // Projectiles aren't stored in turn history, so empty for now
    setReplayCollisions(collisions);
    setReplayShieldBlocks(shieldBlocks);
  };

  const handlePreviousTurn = () => {
    if (!selectedMatch || currentReplayTurn <= 0) return;
    const newTurn = currentReplayTurn - 1;
    setCurrentReplayTurn(newTurn);
    reconstructGameStateForTurn(selectedMatch, newTurn);
  };

  const handleNextTurn = () => {
    if (!selectedMatch || !selectedMatch.finalState?.turnHistory || 
        currentReplayTurn >= selectedMatch.finalState.turnHistory.length - 1) return;
    const newTurn = currentReplayTurn + 1;
    setCurrentReplayTurn(newTurn);
    reconstructGameStateForTurn(selectedMatch, newTurn);
  };

  const handleFirstTurn = () => {
    if (!selectedMatch) return;
    setCurrentReplayTurn(0);
    reconstructGameStateForTurn(selectedMatch, 0);
  };

  const handleLastTurn = () => {
    if (!selectedMatch || !selectedMatch.finalState?.turnHistory) return;
    const lastTurn = selectedMatch.finalState.turnHistory.length - 1;
    setCurrentReplayTurn(lastTurn);
    reconstructGameStateForTurn(selectedMatch, lastTurn);
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
      <div className="replays-header">
        <h1>Match Replays</h1>
        <Link to="/" className="back-button" onClick={playClickSound}>
          ← Back to Menu
        </Link>
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
                    <td>{match.players?.join(' vs ') || 'Unknown'}</td>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
            <h2>Replay Viewer</h2>
            {selectedMatch && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
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
                  marginRight: '5px',
                  marginBottom: '5px',
                  lineHeight: '1',
                  verticalAlign: 'middle'
                }}>
                  Turn {currentReplayTurn + 1} of {selectedMatch.finalState?.turnHistory?.length || 0}
                </div>
                <button 
                  className="control-btn" 
                  onClick={handleFirstTurn}
                  disabled={currentReplayTurn <= 0}
                >
                  ⏮ First
                </button>
                <button 
                  className="control-btn" 
                  onClick={handlePreviousTurn}
                  disabled={currentReplayTurn <= 0}
                >
                  ⏭ Previous
                </button>
                <button 
                  className="control-btn" 
                  onClick={handleNextTurn}
                  disabled={!selectedMatch.finalState?.turnHistory || 
                           currentReplayTurn >= (selectedMatch.finalState.turnHistory.length - 1)}
                >
                  ⏭ Next
                </button>
                <button 
                  className="control-btn" 
                  onClick={handleLastTurn}
                  disabled={!selectedMatch.finalState?.turnHistory || 
                           currentReplayTurn >= (selectedMatch.finalState.turnHistory.length - 1)}
                >
                  ⏭ Last
                </button>
              </div>
            )}
          </div>
          {selectedMatch ? (
            <div className="replay-content">
              <div className="game-board-placeholder">
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