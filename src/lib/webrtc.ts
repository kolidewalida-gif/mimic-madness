// WebRTC P2P Connection Manager for Game Synchronization

export type GameStateType = "home" | "lobby" | "preparation" | "playing" | "voting" | "results";

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  connectionId?: string;
}

export interface GameStateMessage {
  type: "state_update" | "player_joined" | "player_left" | "challenge_submitted" | "vote_cast" | "chat";
  payload: any;
  senderId: string;
  timestamp: number;
}

export class WebRTCManager {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private isHost: boolean;
  private localId: string;
  private onMessageCallback?: (message: GameStateMessage) => void;
  private onPlayerConnectedCallback?: (playerId: string) => void;
  private onPlayerDisconnectedCallback?: (playerId: string) => void;

  // ICE servers for NAT traversal
  private iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  constructor(localId: string, isHost: boolean) {
    this.localId = localId;
    this.isHost = isHost;
  }

  // Set callbacks
  onMessage(callback: (message: GameStateMessage) => void) {
    this.onMessageCallback = callback;
  }

  onPlayerConnected(callback: (playerId: string) => void) {
    this.onPlayerConnectedCallback = callback;
  }

  onPlayerDisconnected(callback: (playerId: string) => void) {
    this.onPlayerDisconnectedCallback = callback;
  }

  // Create connection to a peer
  async createConnection(peerId: string): Promise<RTCSessionDescriptionInit> {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    this.peerConnections.set(peerId, pc);

    // Create data channel for game state synchronization
    const dc = pc.createDataChannel("gameState", { ordered: true });
    this.setupDataChannel(dc, peerId);
    this.dataChannels.set(peerId, dc);

    // Handle ICE candidates
    const iceCandidates: RTCIceCandidate[] = [];
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        iceCandidates.push(event.candidate);
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${peerId}: ${pc.connectionState}`);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.onPlayerDisconnectedCallback?.(peerId);
      }
    };

    // Handle incoming data channels (for non-host)
    pc.ondatachannel = (event) => {
      this.setupDataChannel(event.channel, peerId);
      this.dataChannels.set(peerId, event.channel);
    };

    // Create offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Wait for ICE gathering to complete
    await new Promise<void>((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve();
      } else {
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') {
            resolve();
          }
        };
      }
    });

    return pc.localDescription!;
  }

  // Accept connection from a peer
  async acceptConnection(peerId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    this.peerConnections.set(peerId, pc);

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('ICE candidate:', event.candidate);
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${peerId}: ${pc.connectionState}`);
      if (pc.connectionState === 'connected') {
        this.onPlayerConnectedCallback?.(peerId);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.onPlayerDisconnectedCallback?.(peerId);
      }
    };

    // Handle incoming data channels
    pc.ondatachannel = (event) => {
      this.setupDataChannel(event.channel, peerId);
      this.dataChannels.set(peerId, event.channel);
    };

    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // Wait for ICE gathering
    await new Promise<void>((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve();
      } else {
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') {
            resolve();
          }
        };
      }
    });

    return pc.localDescription!;
  }

  // Complete connection with answer
  async completeConnection(peerId: string, answer: RTCSessionDescriptionInit) {
    const pc = this.peerConnections.get(peerId);
    if (!pc) throw new Error(`No connection found for peer ${peerId}`);
    
    await pc.setRemoteDescription(answer);
  }

  // Setup data channel event handlers
  private setupDataChannel(channel: RTCDataChannel, peerId: string) {
    channel.onopen = () => {
      console.log(`Data channel opened with ${peerId}`);
      this.onPlayerConnectedCallback?.(peerId);
    };

    channel.onclose = () => {
      console.log(`Data channel closed with ${peerId}`);
      this.onPlayerDisconnectedCallback?.(peerId);
    };

    channel.onerror = (error) => {
      console.error(`Data channel error with ${peerId}:`, error);
    };

    channel.onmessage = (event) => {
      try {
        const message: GameStateMessage = JSON.parse(event.data);
        this.onMessageCallback?.(message);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };
  }

  // Send message to specific peer
  sendToPeer(peerId: string, message: Omit<GameStateMessage, 'senderId' | 'timestamp'>) {
    const channel = this.dataChannels.get(peerId);
    if (channel && channel.readyState === 'open') {
      const fullMessage: GameStateMessage = {
        ...message,
        senderId: this.localId,
        timestamp: Date.now(),
      };
      channel.send(JSON.stringify(fullMessage));
    } else {
      console.warn(`Cannot send to ${peerId}: channel not ready`);
    }
  }

  // Broadcast message to all peers
  broadcast(message: Omit<GameStateMessage, 'senderId' | 'timestamp'>) {
    const fullMessage: GameStateMessage = {
      ...message,
      senderId: this.localId,
      timestamp: Date.now(),
    };
    
    this.dataChannels.forEach((channel, peerId) => {
      if (channel.readyState === 'open') {
        channel.send(JSON.stringify(fullMessage));
      }
    });
  }

  // Get list of connected peers
  getConnectedPeers(): string[] {
    const connected: string[] = [];
    this.dataChannels.forEach((channel, peerId) => {
      if (channel.readyState === 'open') {
        connected.push(peerId);
      }
    });
    return connected;
  }

  // Close connection with specific peer
  closeConnection(peerId: string) {
    const channel = this.dataChannels.get(peerId);
    if (channel) {
      channel.close();
      this.dataChannels.delete(peerId);
    }

    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
  }

  // Close all connections
  closeAll() {
    this.dataChannels.forEach(channel => channel.close());
    this.peerConnections.forEach(pc => pc.close());
    this.dataChannels.clear();
    this.peerConnections.clear();
  }

  // Check if connected to any peers
  isConnected(): boolean {
    return this.getConnectedPeers().length > 0;
  }
}

// Signaling helper - In a real app, this would use a signaling server
// For local network, we can simulate with localStorage
export class LocalSignaling {
  private static STORAGE_KEY = "imitation_game_signals";

  static sendSignal(lobbyCode: string, targetId: string, signal: any) {
    const signals = this.getSignals(lobbyCode);
    signals.push({
      targetId,
      signal,
      timestamp: Date.now(),
    });
    localStorage.setItem(`${this.STORAGE_KEY}_${lobbyCode}`, JSON.stringify(signals));
  }

  static getSignalsFor(lobbyCode: string, myId: string): any[] {
    const signals = this.getSignals(lobbyCode);
    const mySignals = signals.filter(s => s.targetId === myId);
    
    // Remove consumed signals
    const remaining = signals.filter(s => s.targetId !== myId);
    localStorage.setItem(`${this.STORAGE_KEY}_${lobbyCode}`, JSON.stringify(remaining));
    
    return mySignals.map(s => s.signal);
  }

  private static getSignals(lobbyCode: string): any[] {
    const data = localStorage.getItem(`${this.STORAGE_KEY}_${lobbyCode}`);
    return data ? JSON.parse(data) : [];
  }

  static clearLobby(lobbyCode: string) {
    localStorage.removeItem(`${this.STORAGE_KEY}_${lobbyCode}`);
  }
}
