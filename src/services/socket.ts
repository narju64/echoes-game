import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.DEV 
  ? 'http://localhost:3000' 
  : 'https://echoesbackend.narju.net';

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;

  connect(): Socket {
    if (this.socket && this.isConnected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
    });
    
    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.isConnected = false;
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  joinRoom(roomId: string): void {
    if (this.socket) {
      this.socket.emit('joinRoom', roomId);
    }
  }

  leaveRoom(roomId: string, playerId?: string): void {
    if (this.socket) {
      if (playerId) {
        this.socket.emit('leaveRoom', { roomId, playerId });
      } else {
        this.socket.emit('leaveRoom', roomId);
      }
    }
  }

  sendGameAction(roomId: string, action: any, playerId: string): void {
    if (this.socket) {
      this.socket.emit('gameAction', { roomId, action, playerId });
    }
  }

  sendGameState(roomId: string, playerId: string, playerName: string, gamePlayerId: string, echoes: any[]): void {
    if (this.socket) {
      this.socket.emit('gameState', { roomId, playerId, playerName, gamePlayerId, echoes });
    }
  }

  sendChatMessage(roomId: string, message: string, playerName: string): void {
    if (this.socket) {
      this.socket.emit('chatMessage', { roomId, message, playerName });
    }
  }

  // New method to trigger game start and get match ID from backend
  startGame(roomId: string, playerId: string, playerName: string): void {
    if (this.socket) {
      this.socket.emit('gameStart', { roomId, playerId, playerName });
    }
  }

  onPlayerJoined(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('playerJoined', callback);
    }
  }

  // New method to listen for match started event
  onMatchStarted(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('matchStarted', callback);
    }
  }

  onGameAction(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('gameAction', callback);
    }
  }

  onChatMessage(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('chatMessage', callback);
    }
  }

  off(event: string): void {
    if (this.socket) {
      this.socket.off(event);
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isSocketConnected(): boolean {
    return this.isConnected;
  }
}

export const socketService = new SocketService(); 