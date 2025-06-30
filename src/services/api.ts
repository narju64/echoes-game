const API_BASE = import.meta.env.DEV 
  ? 'http://localhost:3000' 
  : 'https://echoesbackend.narju.net'; // Updated for production

export interface Room {
  id: string;
  host: string;
  createdAt: string;
  playerCount: number;
}

export interface CreateRoomRequest {
  playerName: string;
}

export interface JoinRoomRequest {
  playerName: string;
}

export interface CreateRoomResponse {
  id: string;
  host: string;
  status: string;
  playerId: string;
}

export interface JoinRoomResponse {
  success: boolean;
  room: any;
  playerId: string;
}

class ApiService {
  async getRooms(): Promise<Room[]> {
    const response = await fetch(`${API_BASE}/api/rooms`);
    if (!response.ok) {
      throw new Error('Failed to fetch rooms');
    }
    return response.json();
  }

  async createRoom(playerName: string): Promise<CreateRoomResponse> {
    const response = await fetch(`${API_BASE}/api/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ playerName }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create room');
    }
    
    return response.json();
  }

  async joinRoom(roomId: string, playerName: string): Promise<JoinRoomResponse> {
    const response = await fetch(`${API_BASE}/api/rooms/${roomId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ playerName }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to join room');
    }
    
    return response.json();
  }

  async checkHealth(): Promise<{ status: string; message: string }> {
    const response = await fetch(`${API_BASE}/api/health`);
    if (!response.ok) {
      throw new Error('Backend server is not responding');
    }
    return response.json();
  }
}

export const apiService = new ApiService(); 