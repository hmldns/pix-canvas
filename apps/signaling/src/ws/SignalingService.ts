import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { 
  WebRTCSignalingMessage, 
  JoinRoomMessage, 
  LeaveRoomMessage,
  OfferMessage,
  AnswerMessage,
  IceCandidateMessage 
} from '@libs/common-types';

interface ClientInfo {
  id: string;
  roomId?: string;
  userId?: string;
}

interface Room {
  id: string;
  clients: Set<string>;
}

export class SignalingService {
  private io: SocketIOServer;
  private clients: Map<string, ClientInfo> = new Map();
  private rooms: Map<string, Room> = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      path: "/ws/socket.io/"
    });

    this.setupEventHandlers();
    console.log('✅ SignalingService WebSocket server initialized');
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      const clientId = socket.id;
      console.log(`🔌 Client connected: ${clientId}`);

      // Initialize client info
      this.clients.set(clientId, {
        id: clientId
      });

      // Handle signaling messages
      socket.on('signaling-message', (message: WebRTCSignalingMessage) => {
        this.handleSignalingMessage(clientId, message);
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`🔌 Client disconnected: ${clientId}, reason: ${reason}`);
        this.handleClientDisconnect(clientId);
      });

      // Handle connection errors
      socket.on('error', (error) => {
        console.error(`❌ Socket error for client ${clientId}:`, error);
      });
    });
  }

  private handleSignalingMessage(clientId: string, message: WebRTCSignalingMessage): void {
    console.log(`📡 Received ${message.type} from ${clientId}`);

    switch (message.type) {
      case 'join-room':
        this.handleJoinRoom(clientId, message);
        break;
      case 'leave-room':
        this.handleLeaveRoom(clientId, message);
        break;
      case 'offer':
        this.handleOffer(clientId, message);
        break;
      case 'answer':
        this.handleAnswer(clientId, message);
        break;
      case 'ice-candidate':
        this.handleIceCandidate(clientId, message);
        break;
      default:
        console.warn(`⚠️ Unknown message type: ${(message as any).type}`);
    }
  }

  private handleJoinRoom(clientId: string, message: JoinRoomMessage): void {
    const { roomId } = message.payload;
    const client = this.clients.get(clientId);
    
    if (!client) {
      console.error(`❌ Client ${clientId} not found`);
      return;
    }

    // Leave current room if any
    if (client.roomId) {
      this.removeClientFromRoom(clientId, client.roomId);
    }

    // Create room if it doesn't exist
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        clients: new Set()
      });
      console.log(`🏠 Created new room: ${roomId}`);
    }

    // Add client to room
    const room = this.rooms.get(roomId)!;
    room.clients.add(clientId);
    client.roomId = roomId;

    // Join the socket.io room for easy broadcasting
    this.io.sockets.sockets.get(clientId)?.join(roomId);

    console.log(`🏠 Client ${clientId} joined room ${roomId} (${room.clients.size} clients)`);

    // Notify other clients in the room about the new peer
    this.io.to(roomId).except(clientId).emit('peer-joined', {
      peerId: clientId,
      roomId: roomId
    });

    // Send current peers to the joining client
    const otherClients = Array.from(room.clients).filter(id => id !== clientId);
    this.io.to(clientId).emit('room-peers', {
      roomId: roomId,
      peers: otherClients
    });
  }

  private handleLeaveRoom(clientId: string, message: LeaveRoomMessage): void {
    const client = this.clients.get(clientId);
    
    if (!client || !client.roomId) {
      console.warn(`⚠️ Client ${clientId} is not in a room`);
      return;
    }

    this.removeClientFromRoom(clientId, client.roomId);
    console.log(`🏠 Client ${clientId} left room ${client.roomId}`);
  }

  private handleOffer(clientId: string, message: OfferMessage): void {
    const { targetUserId, sdp } = message.payload;
    const client = this.clients.get(clientId);

    if (!client || !client.roomId) {
      console.error(`❌ Client ${clientId} is not in a room`);
      return;
    }

    // Find target client in the same room
    const targetClient = this.findClientByUserId(targetUserId, client.roomId);
    if (!targetClient) {
      console.error(`❌ Target client ${targetUserId} not found in room ${client.roomId}`);
      return;
    }

    console.log(`📡 Relaying offer from ${clientId} to ${targetClient.id}`);
    
    // Relay the offer to the target client
    this.io.to(targetClient.id).emit('signaling-message', {
      type: 'offer',
      payload: {
        fromUserId: clientId,
        sdp: sdp
      }
    });
  }

  private handleAnswer(clientId: string, message: AnswerMessage): void {
    const { targetUserId, sdp } = message.payload;
    const client = this.clients.get(clientId);

    if (!client || !client.roomId) {
      console.error(`❌ Client ${clientId} is not in a room`);
      return;
    }

    // Find target client in the same room
    const targetClient = this.findClientByUserId(targetUserId, client.roomId);
    if (!targetClient) {
      console.error(`❌ Target client ${targetUserId} not found in room ${client.roomId}`);
      return;
    }

    console.log(`📡 Relaying answer from ${clientId} to ${targetClient.id}`);
    
    // Relay the answer to the target client
    this.io.to(targetClient.id).emit('signaling-message', {
      type: 'answer',
      payload: {
        fromUserId: clientId,
        sdp: sdp
      }
    });
  }

  private handleIceCandidate(clientId: string, message: IceCandidateMessage): void {
    const { targetUserId, candidate } = message.payload;
    const client = this.clients.get(clientId);

    if (!client || !client.roomId) {
      console.error(`❌ Client ${clientId} is not in a room`);
      return;
    }

    // Find target client in the same room
    const targetClient = this.findClientByUserId(targetUserId, client.roomId);
    if (!targetClient) {
      console.error(`❌ Target client ${targetUserId} not found in room ${client.roomId}`);
      return;
    }

    console.log(`📡 Relaying ICE candidate from ${clientId} to ${targetClient.id}`);
    
    // Relay the ICE candidate to the target client
    this.io.to(targetClient.id).emit('signaling-message', {
      type: 'ice-candidate',
      payload: {
        fromUserId: clientId,
        candidate: candidate
      }
    });
  }

  private handleClientDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    
    if (client && client.roomId) {
      this.removeClientFromRoom(clientId, client.roomId);
    }

    this.clients.delete(clientId);
  }

  private removeClientFromRoom(clientId: string, roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.clients.delete(clientId);
    
    // Leave the socket.io room
    this.io.sockets.sockets.get(clientId)?.leave(roomId);
    
    // Notify other clients about the peer leaving
    this.io.to(roomId).emit('peer-left', {
      peerId: clientId,
      roomId: roomId
    });

    // Clean up empty rooms
    if (room.clients.size === 0) {
      this.rooms.delete(roomId);
      console.log(`🏠 Removed empty room: ${roomId}`);
    }

    // Update client info
    const client = this.clients.get(clientId);
    if (client) {
      client.roomId = undefined;
    }
  }

  private findClientByUserId(userId: string, roomId: string): ClientInfo | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    for (const clientId of room.clients) {
      const client = this.clients.get(clientId);
      if (client && (client.userId === userId || client.id === userId)) {
        return client;
      }
    }

    return null;
  }

  // Public methods for monitoring
  public getConnectedClientsCount(): number {
    return this.clients.size;
  }

  public getRoomsCount(): number {
    return this.rooms.size;
  }

  public getRoomInfo(roomId: string): { id: string; clientCount: number } | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    return {
      id: room.id,
      clientCount: room.clients.size
    };
  }

  public getAllRooms(): Array<{ id: string; clientCount: number }> {
    return Array.from(this.rooms.values()).map(room => ({
      id: room.id,
      clientCount: room.clients.size
    }));
  }
}