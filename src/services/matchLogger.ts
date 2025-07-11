import type { GameState, Action, PlayerId, Position, Direction } from '../types/gameTypes';

export interface MatchEvent {
  timestamp: number;
  type: 'match_start' | 'tick_start' | 'action' | 'collision' | 'entity_destroyed' | 'tick_end' | 'match_end';
  data: any;
}

export interface MatchLog {
  matchId: string;
  startTime: number;
  endTime?: number;
  gameMode: string;
  players: PlayerId[];
  playerNames?: { [key in PlayerId]: string };
  events: MatchEvent[];
  initialState: GameState;
  finalState?: GameState;
  winner?: PlayerId;
  winCondition?: string;
  finalScore?: { [key in PlayerId]: number };
  duration?: number;
}

class MatchLogger {
  private currentMatch: MatchLog | null = null;
  private isLogging = false;

  startMatch(matchId: string, gameMode: string, players: PlayerId[], initialState: GameState, playerNames?: { [key in PlayerId]: string }): void {
    console.log('MatchLogger.startMatch called:', matchId, 'isLogging was:', this.isLogging);
    this.currentMatch = {
      matchId,
      startTime: Date.now(),
      gameMode,
      players,
      playerNames,
      events: [],
      initialState: JSON.parse(JSON.stringify(initialState)) // Deep copy
    };
    this.isLogging = true;
    console.log('MatchLogger.startMatch completed, isLogging now:', this.isLogging);

    this.logEvent('match_start', {
      matchId,
      gameMode,
      players,
      playerNames,
      initialState: this.currentMatch.initialState
    });
  }

  logTickStart(tick: number, gameState: GameState): void {
    // Only store essential data, not the full game state
    const essentialData = {
      tick,
      echoCount: gameState.echoes.length,
      aliveEchoes: gameState.echoes.filter(e => e.alive).length,
      scores: gameState.scores
    };
    this.logEvent('tick_start', essentialData);
  }

  logAction(player: PlayerId, echoId: string, action: Action, position: Position, direction?: Direction): void {
    this.logEvent('action', {
      player,
      echoId,
      action: action.type,
      position,
      direction,
      cost: action.cost
    });
  }

  logCollision(entity1: any, entity2: any, position: Position): void {
    this.logEvent('collision', {
      entity1: { id: entity1.id, type: entity1.type, player: entity1.player },
      entity2: { id: entity2.id, type: entity2.type, player: entity2.player },
      position
    });
  }

  logEntityDestroyed(entity: any, reason: string): void {
    this.logEvent('entity_destroyed', {
      entity: { id: entity.id, type: entity.type, player: entity.player },
      reason,
      position: entity.position
    });
  }

  logTickEnd(tick: number, gameState: GameState): void {
    // Only store essential data, not the full game state
    const essentialData = {
      tick,
      echoCount: gameState.echoes.length,
      aliveEchoes: gameState.echoes.filter(e => e.alive).length,
      scores: gameState.scores
    };
    this.logEvent('tick_end', essentialData);
  }

  endMatch(winner: PlayerId, winCondition: string, finalScore: { [key in PlayerId]: number }, finalState: GameState): void {
    if (!this.currentMatch) return;

    console.log('MatchLogger.endMatch called:', this.currentMatch.matchId, 'isLogging was:', this.isLogging);

    this.currentMatch.endTime = Date.now();
    this.currentMatch.winner = winner;
    this.currentMatch.winCondition = winCondition;
    this.currentMatch.finalScore = finalScore;
    this.currentMatch.finalState = JSON.parse(JSON.stringify(finalState));
    this.currentMatch.duration = this.currentMatch.endTime - this.currentMatch.startTime;

    this.logEvent('match_end', {
      winner,
      winCondition,
      finalScore,
      finalState: this.currentMatch.finalState,
      duration: this.currentMatch.duration
    });

    this.sendMatchLog();
    this.isLogging = false;
    console.log('MatchLogger.endMatch completed, isLogging now:', this.isLogging);
  }

  private logEvent(type: MatchEvent['type'], data: any): void {
    if (!this.currentMatch || !this.isLogging) return;

    const event: MatchEvent = {
      timestamp: Date.now(),
      type,
      data
    };

    this.currentMatch.events.push(event);
  }

  private async sendMatchLog(): Promise<void> {
    if (!this.currentMatch) return;

    try {
      console.log('Sending match log to backend:', this.currentMatch.matchId);
      
      // Debug: Log the size and structure of the match log
      const matchLogString = JSON.stringify(this.currentMatch);
      console.log('Match log size:', matchLogString.length, 'bytes');
      console.log('Match log structure:', {
        matchId: this.currentMatch.matchId,
        eventCount: this.currentMatch.events.length,
        hasInitialState: !!this.currentMatch.initialState,
        hasFinalState: !!this.currentMatch.finalState,
        playerNames: this.currentMatch.playerNames
      });
      
      // Analyze what's taking up space
      if (this.currentMatch.events.length > 0) {
        const sampleEvent = this.currentMatch.events[0];
        console.log('Sample event size:', JSON.stringify(sampleEvent).length, 'bytes');
        console.log('Sample event type:', sampleEvent.type);
        if (sampleEvent.data.gameState) {
          console.log('Game state in event size:', JSON.stringify(sampleEvent.data.gameState).length, 'bytes');
        }
      }
      
      // Use the same API base as other services
      const API_BASE = import.meta.env.DEV 
        ? 'http://localhost:3000' 
        : 'https://echoesbackend.narju.net';
      
      // Send to backend API
      const response = await fetch(`${API_BASE}/api/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: matchLogString
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Match logged successfully:', result);
      
      // Handle duplicate response from backend
      if (result.duplicate) {
        console.log('Match was already logged (duplicate submission handled gracefully)');
      }
      
      this.currentMatch = null;
    } catch (error) {
      console.error('Failed to send match log:', error);
      // Don't clear currentMatch on error so it can be retried if needed
    }
  }

  getCurrentMatch(): MatchLog | null {
    return this.currentMatch;
  }

  isActive(): boolean {
    console.log('MatchLogger.isActive called, returning:', this.isLogging);
    return this.isLogging;
  }
}

// Export singleton instance
export const matchLogger = new MatchLogger(); 