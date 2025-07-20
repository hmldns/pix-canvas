import { io, Socket } from 'socket.io-client';
import { 
  WebRTCSignalingMessage, 
  CursorUpdateData, 
  ChatMessageData 
} from '@libs/common-types';

export interface WebRTCConfig {
  signalingUrl: string;
  roomId: string;
  userId: string;
  nickname: string;
}

export interface PeerConnection {
  id: string;
  connection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
  remoteUserId?: string;
}

export type WebRTCEventHandler = {
  onPeerConnected?: (peerId: string) => void;
  onPeerDisconnected?: (peerId: string) => void;
  onCursorUpdate?: (data: CursorUpdateData) => void;
  onChatMessage?: (data: ChatMessageData) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
};

export class WebRTCService {
  private socket: Socket | null = null;
  private config: WebRTCConfig | null = null;
  private peers: Map<string, PeerConnection> = new Map();
  private localDataChannel: RTCDataChannel | null = null;
  private eventHandlers: WebRTCEventHandler = {};
  private isConnected = false;

  // ICE servers configuration
  private readonly iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ];

  constructor() {
    console.log('🔌 WebRTC service initialized');
  }

  public async connect(config: WebRTCConfig, handlers: WebRTCEventHandler = {}): Promise<void> {
    if (this.isConnected) {
      console.warn('⚠️ WebRTC service already connected');
      return;
    }

    this.config = config;
    this.eventHandlers = handlers;

    try {
      // Connect to signaling server
      this.socket = io(config.signalingUrl, {
        path: '/ws/socket.io/',
        transports: ['websocket']
      });

      this.setupSignalingHandlers();
      
      // Wait for socket connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Signaling server connection timeout'));
        }, 10000);

        this.socket!.on('connect', () => {
          clearTimeout(timeout);
          console.log('✅ Connected to signaling server');
          resolve();
        });

        this.socket!.on('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // Join the room
      this.joinRoom(config.roomId);
      this.isConnected = true;

    } catch (error) {
      console.error('❌ Failed to connect to WebRTC:', error);
      throw error;
    }
  }

  public disconnect(): void {
    if (!this.isConnected) return;

    console.log('📤 Disconnecting WebRTC service');

    // Close all peer connections
    for (const [peerId, peer] of this.peers) {
      this.closePeerConnection(peerId);
    }
    this.peers.clear();

    // Disconnect from signaling server
    if (this.socket) {
      this.socket.emit('signaling-message', { type: 'leave-room' });
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
    console.log('✅ WebRTC service disconnected');
  }

  public sendCursorUpdate(x: number, y: number): void {
    if (!this.config) return;

    const cursorData: CursorUpdateData = {
      userId: this.config.userId,
      nickname: this.config.nickname,
      x,
      y,
      color: '#3B82F6' // Blue cursor color
    };

    this.broadcastToDataChannel('cursor-update', cursorData);
  }

  public sendChatMessage(message: string): void {
    if (!this.config) return;

    const chatData: ChatMessageData = {
      userId: this.config.userId,
      nickname: this.config.nickname,
      message,
      timestamp: Date.now()
    };

    this.broadcastToDataChannel('chat-message', chatData);
  }

  public getConnectedPeers(): string[] {
    return Array.from(this.peers.keys());
  }

  public getConnectionState(): RTCPeerConnectionState | null {
    // Return the state of the first peer connection as representative
    for (const peer of this.peers.values()) {
      return peer.connection.connectionState;
    }
    return null;
  }

  private setupSignalingHandlers(): void {
    if (!this.socket) return;

    this.socket.on('signaling-message', (message: WebRTCSignalingMessage) => {
      this.handleSignalingMessage(message);
    });

    this.socket.on('peer-joined', ({ peerId }: { peerId: string }) => {
      console.log(`👥 Peer joined: ${peerId}`);
      this.createPeerConnection(peerId, true); // We are the offerer
    });

    this.socket.on('peer-left', ({ peerId }: { peerId: string }) => {
      console.log(`👋 Peer left: ${peerId}`);
      this.closePeerConnection(peerId);
    });

    this.socket.on('room-peers', ({ peers }: { peers: string[] }) => {
      console.log(`👥 Current room peers:`, peers);
      // Create connections to existing peers (we are not the offerer)
      peers.forEach(peerId => {
        this.createPeerConnection(peerId, false);
      });
    });

    this.socket.on('disconnect', () => {
      console.log('📡 Signaling server disconnected');
      this.isConnected = false;
    });
  }

  private joinRoom(roomId: string): void {
    if (!this.socket) return;

    console.log(`🏠 Joining room: ${roomId}`);
    this.socket.emit('signaling-message', {
      type: 'join-room',
      payload: { roomId }
    });
  }

  private async handleSignalingMessage(message: any): Promise<void> {
    const { type, payload } = message;

    switch (type) {
      case 'offer':
        await this.handleOffer(payload.fromUserId, payload.sdp);
        break;
      case 'answer':
        await this.handleAnswer(payload.fromUserId, payload.sdp);
        break;
      case 'ice-candidate':
        await this.handleIceCandidate(payload.fromUserId, payload.candidate);
        break;
      default:
        console.warn(`⚠️ Unknown signaling message type: ${type}`);
    }
  }

  private async createPeerConnection(peerId: string, isOfferer: boolean): Promise<void> {
    if (this.peers.has(peerId)) {
      console.warn(`⚠️ Peer connection already exists for ${peerId}`);
      return;
    }

    console.log(`🔗 Creating peer connection with ${peerId} (offerer: ${isOfferer})`);

    // Create RTCPeerConnection
    const connection = new RTCPeerConnection({
      iceServers: this.iceServers
    });

    const peer: PeerConnection = {
      id: peerId,
      connection,
      remoteUserId: peerId
    };

    this.peers.set(peerId, peer);

    // Setup connection event handlers
    this.setupPeerConnectionHandlers(peer);

    if (isOfferer) {
      // Create data channel for communication
      const dataChannel = connection.createDataChannel('communication', {
        ordered: false, // Unordered for speed (cursor movements)
        maxRetransmits: 0 // Unreliable for speed
      });
      
      peer.dataChannel = dataChannel;
      this.setupDataChannelHandlers(dataChannel, peerId);

      // Create and send offer
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);

      this.sendSignalingMessage({
        type: 'offer',
        payload: {
          targetUserId: peerId,
          sdp: offer.sdp!
        }
      });
    }
  }

  private setupPeerConnectionHandlers(peer: PeerConnection): void {
    const { connection } = peer;

    connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'ice-candidate',
          payload: {
            targetUserId: peer.id,
            candidate: JSON.stringify(event.candidate)
          }
        });
      }
    };

    connection.onconnectionstatechange = () => {
      console.log(`🔗 Peer ${peer.id} connection state: ${connection.connectionState}`);
      
      if (connection.connectionState === 'connected') {
        this.eventHandlers.onPeerConnected?.(peer.id);
      } else if (connection.connectionState === 'disconnected' || connection.connectionState === 'failed') {
        this.eventHandlers.onPeerDisconnected?.(peer.id);
        this.closePeerConnection(peer.id);
      }

      this.eventHandlers.onConnectionStateChange?.(connection.connectionState);
    };

    connection.ondatachannel = (event) => {
      const dataChannel = event.channel;
      peer.dataChannel = dataChannel;
      this.setupDataChannelHandlers(dataChannel, peer.id);
    };
  }

  private setupDataChannelHandlers(dataChannel: RTCDataChannel, peerId: string): void {
    dataChannel.onopen = () => {
      console.log(`📡 Data channel opened with peer ${peerId}`);
    };

    dataChannel.onclose = () => {
      console.log(`📡 Data channel closed with peer ${peerId}`);
    };

    dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleDataChannelMessage(data, peerId);
      } catch (error) {
        console.error('❌ Failed to parse data channel message:', error);
      }
    };

    dataChannel.onerror = (error) => {
      console.error(`❌ Data channel error with peer ${peerId}:`, error);
    };
  }

  private handleDataChannelMessage(data: any, peerId: string): void {
    const { type, payload } = data;

    switch (type) {
      case 'cursor-update':
        this.eventHandlers.onCursorUpdate?.(payload as CursorUpdateData);
        break;
      case 'chat-message':
        this.eventHandlers.onChatMessage?.(payload as ChatMessageData);
        break;
      default:
        console.warn(`⚠️ Unknown data channel message type: ${type}`);
    }
  }

  private async handleOffer(fromPeerId: string, sdp: string): Promise<void> {
    console.log(`📨 Received offer from ${fromPeerId}`);
    
    let peer = this.peers.get(fromPeerId);
    if (!peer) {
      // Create peer connection if it doesn't exist
      await this.createPeerConnection(fromPeerId, false);
      peer = this.peers.get(fromPeerId)!;
    }

    await peer.connection.setRemoteDescription({ type: 'offer', sdp });
    
    const answer = await peer.connection.createAnswer();
    await peer.connection.setLocalDescription(answer);

    this.sendSignalingMessage({
      type: 'answer',
      payload: {
        targetUserId: fromPeerId,
        sdp: answer.sdp!
      }
    });
  }

  private async handleAnswer(fromPeerId: string, sdp: string): Promise<void> {
    console.log(`📨 Received answer from ${fromPeerId}`);
    
    const peer = this.peers.get(fromPeerId);
    if (!peer) {
      console.error(`❌ No peer connection found for ${fromPeerId}`);
      return;
    }

    await peer.connection.setRemoteDescription({ type: 'answer', sdp });
  }

  private async handleIceCandidate(fromPeerId: string, candidateJson: string): Promise<void> {
    const peer = this.peers.get(fromPeerId);
    if (!peer) {
      console.error(`❌ No peer connection found for ${fromPeerId}`);
      return;
    }

    try {
      const candidate = JSON.parse(candidateJson);
      await peer.connection.addIceCandidate(candidate);
    } catch (error) {
      console.error('❌ Failed to add ICE candidate:', error);
    }
  }

  private closePeerConnection(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    console.log(`🔌 Closing peer connection with ${peerId}`);

    if (peer.dataChannel) {
      peer.dataChannel.close();
    }
    
    peer.connection.close();
    this.peers.delete(peerId);

    this.eventHandlers.onPeerDisconnected?.(peerId);
  }

  private broadcastToDataChannel(type: string, payload: any): void {
    const message = JSON.stringify({ type, payload });
    
    for (const [peerId, peer] of this.peers) {
      if (peer.dataChannel && peer.dataChannel.readyState === 'open') {
        try {
          peer.dataChannel.send(message);
        } catch (error) {
          console.error(`❌ Failed to send data to peer ${peerId}:`, error);
        }
      }
    }
  }

  private sendSignalingMessage(message: WebRTCSignalingMessage): void {
    if (!this.socket) {
      console.error('❌ No signaling socket available');
      return;
    }

    this.socket.emit('signaling-message', message);
  }
}

// Export singleton instance
export const webRTCService = new WebRTCService();