import { io, Socket } from 'socket.io-client'
import WebRTCService from './webrtc'
import { useGameStore, ChatMessage } from './store'
import { Player } from '@/components/game/player'

// Define types used by this service
export interface Player {
  id: string
  name: string
  position: [number, number, number]
  rotation: [number, number, number]
  model: string
  walletAddress?: string
  isNFTHolder?: boolean
  isTokenHolder?: boolean
  room?: string
}

export interface Message {
  id: string
  sender: string
  content: string
  timestamp: string
}

export interface PlayerState {
  position?: [number, number, number]
  rotation?: [number, number, number]
  animation?: string
  isMoving?: boolean
}

export interface ChatMessage {
  sender: string
  content: string
  timestamp: string
}

// This would be your actual server URL in production
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001'

/**
 * Socket service for real-time communication
 * Uses Socket.IO with optional WebRTC for low-latency player updates
 */
export class SocketService {
  // Core networking
  private socket: Socket | null = null
  private webrtc: WebRTCService | null = null
  private useWebRTC: boolean = false
  
  // Game state
  private connected = false
  private connectionListeners: ((connected: boolean) => void)[] = []
  private messageListeners: ((message: Message) => void)[] = []

  // Add ping statistics tracking
  private pingStats = {
    samples: [] as number[],
    lastSent: 0,
    packetsLost: 0,
    totalPackets: 0
  }

  constructor() {
    this.socket = null
    this.webrtc = null
  }

  /**
   * Initialize socket connection
   */
  async init() {
    try {
      this.socket = io(SERVER_URL)
      console.log('Socket initialized')

      // Set up event listeners
      this.setupEventListeners()
    } catch (error) {
      console.error('Failed to initialize socket:', error)
    }
  }

  /**
   * Set up socket event listeners
   */
  private setupEventListeners() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('Connected to server')
      this.setConnected(true)
    })

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server')
      this.setConnected(false)
    })

    // Player events
    this.socket.on('player:joined', (playerData: any) => {
      console.log('Player joined:', playerData)
      const player: Player = {
        id: playerData.id,
        name: playerData.name,
        position: playerData.position || [0, 0, 0],
        rotation: playerData.rotation || [0, 0, 0],
        model: playerData.model || 'pookie',
        isNFTHolder: playerData.isNFTHolder ?? false,
        isTokenHolder: playerData.isTokenHolder ?? false,
      };
      useGameStore.getState().actions.addPlayer(player)
      
      const currentPlayer = useGameStore.getState().currentPlayer
      if (this.useWebRTC && this.webrtc && currentPlayer && this.socket) {
        this.webrtc.initialize(this.socket, currentPlayer.id)
      }
    })

    this.socket.on('player:left', (playerId: string) => {
      console.log('Player left:', playerId)
      useGameStore.getState().actions.removePlayer(playerId)
    })

    this.socket.on('player:moved', (playerId: string, position: [number, number, number]) => {
      useGameStore.getState().actions.updatePlayerPosition(playerId, position)
    })

    this.socket.on('player:rotated', (playerId: string, rotation: [number, number, number]) => {
      useGameStore.getState().actions.updatePlayerRotation(playerId, rotation)
    })

    this.socket.on('player:list', (playersData: any[]) => {
      console.log('Received player list:', playersData)
      
      const players: Player[] = playersData.map(playerData => ({
        id: playerData.id,
        name: playerData.name,
        position: playerData.position || [0, 0, 0],
        rotation: playerData.rotation || [0, 0, 0],
        model: playerData.model || 'pookie',
        isNFTHolder: playerData.isNFTHolder ?? false,
        isTokenHolder: playerData.isTokenHolder ?? false,
      }));
      
      useGameStore.getState().actions.setPlayers(players)
      
      const currentWallet = useGameStore.getState().walletAddress
      const myPlayer = currentWallet ? players.find(p => p.walletAddress === currentWallet) : null
      
      if (myPlayer) {
        console.log('Setting current player:', myPlayer)
        useGameStore.getState().actions.setCurrentPlayer(myPlayer)
        if (this.useWebRTC && this.webrtc && this.socket) {
          this.webrtc.initialize(this.socket, myPlayer.id)
        }
      } else {
        console.warn('Could not identify current player in received list. Clearing current player.')
        useGameStore.getState().actions.setCurrentPlayer(null);
      }
    })

    // Chat events
    this.socket.on('chat:message', (message: SocketMessage) => {
      const chatMessage: ChatMessage = { 
        id: message.id || `${message.sender}-${message.timestamp}`,
        sender: message.sender,
        content: message.content,
        timestamp: message.timestamp
      }
      useGameStore.getState().actions.addMessage(chatMessage)
    })
    
    // WebRTC signaling events - just pass through to WebRTC service
    this.socket.on('webrtc:offer', (data) => {
      console.log('Received WebRTC offer')
      // The WebRTC service handles this via its own listeners
    })
    
    this.socket.on('webrtc:answer', (data) => {
      console.log('Received WebRTC answer')
      // The WebRTC service handles this via its own listeners
    })
    
    this.socket.on('webrtc:ice-candidate', (data) => {
      console.log('Received ICE candidate')
      // The WebRTC service handles this via its own listeners
    })

    // Add ping handler
    this.socket.on('pong', (data: { timestamp: number }) => {
      this.handlePingResponse(data.timestamp)
    })
  }

  // Game state management -------------------------------------------------------
  
  public setConnected(connected: boolean) {
    this.connected = connected
    this.notifyConnectionListeners()
  }
  
  public notifyConnectionListeners() {
    this.connectionListeners.forEach(listener => listener(this.connected))
  }
  
  private notifyMessageListeners(message: Message) {
    this.messageListeners.forEach(listener => listener(message))
  }
  
  // Public methods for sending data ---------------------------------------------

  /**
   * Send a chat message
   */
  sendChatMessage(message: string) {
    if (!this.socket || !this.connected) return
    const sender = useGameStore.getState().currentPlayer?.name || 'Anonymous'
    this.socket.emit('chat:sendMessage', { content: message, sender })
  }
  
  /**
   * Update player state
   */
  updateLocalPlayerState(newState: Partial<PlayerState>) {
    if (!this.socket || !this.connected) {
      console.error('Cannot update state: socket not connected')
      return
    }
    const currentPlayer = useGameStore.getState().currentPlayer
    if (!currentPlayer) {
      console.error('Cannot update state: current player not set')
      return
    }

    if (newState.position) {
      useGameStore.getState().actions.updatePlayerPosition(currentPlayer.id, newState.position)
    }
    if (newState.rotation) {
      useGameStore.getState().actions.updatePlayerRotation(currentPlayer.id, newState.rotation)
    }

    this.socket.emit('player:updateState', { 
      ...newState, 
      timestamp: Date.now() 
    })
  }

  /**
   * Update player rotation
   */
  updateRotation(rotation: [number, number, number]) {
    const currentPlayer = useGameStore.getState().currentPlayer
    if (!currentPlayer) return
    
    try {
      useGameStore.getState().actions.updatePlayerRotation(currentPlayer.id, rotation)
      
      if (this.useWebRTC && this.webrtc) {
        this.webrtc.broadcast({
          type: 'game',
          data: {
            action: 'rotation',
            rotation
          }
        })
      }
      
      this.socket?.emit('player:rotate', rotation)
    } catch (error) {
      console.error('Error updating rotation:', error)
    }
  }

  /**
   * Change room
   */
  changeRoom(room: string) {
    try {
      this.socket?.emit('room:change', room)
    } catch (error) {
      console.error('Error changing room:', error)
    }
  }
  
  // WebRTC-specific methods ----------------------------------------------------
  
  /**
   * Check if WebRTC is connected to a specific peer
   */
  isRTCConnectedToPeer(peerId: string): boolean {
    if (!this.useWebRTC || !this.webrtc) return false
    return this.webrtc.isConnectedToPeer(peerId)
  }
  
  /**
   * Get WebRTC stats
   */
  getRTCStats(): { peers: number, connected: number, enabled: boolean, latency?: number, packetLoss?: number } {
    if (!this.webrtc) {
      return { peers: 0, connected: 0, enabled: this.useWebRTC }
    }
    
    const basicStats = this.webrtc.getStats()
    
    // Add performance stats if available
    if (this.webrtc.getPerformanceStats) {
      try {
        const perfStats = this.webrtc.getPerformanceStats()
        return {
          ...basicStats,
          enabled: this.useWebRTC,
          latency: perfStats.latency,
          packetLoss: perfStats.packetLoss
        }
      } catch (error) {
        console.error('Error getting performance stats:', error)
      }
    }
    
    return {
      ...basicStats,
      enabled: this.useWebRTC
    }
  }
  
  /**
   * Toggle WebRTC usage
   */
  toggleWebRTC(enabled: boolean) {
    this.useWebRTC = enabled
    
    try {
      if (enabled && !this.webrtc) {
        this.webrtc = new WebRTCService()
        
        // Initialize if we're already connected
        const currentPlayer = useGameStore.getState().currentPlayer
        if (currentPlayer && this.socket) {
          this.webrtc.initialize(this.socket, currentPlayer.id)
        }
      } else if (!enabled && this.webrtc) {
        this.webrtc.cleanup()
        this.webrtc = null
      }
    } catch (error) {
      console.error('Error toggling WebRTC:', error)
    }
    
    return this.useWebRTC
  }
  
  // Event listeners -----------------------------------------------------------
  
  /**
   * Add a connection state listener
   */
  addConnectionListener(listener: (connected: boolean) => void) {
    this.connectionListeners.push(listener)
    // Immediately notify with current state
    listener(this.connected)
    return () => {
      this.connectionListeners = this.connectionListeners.filter(l => l !== listener)
    }
  }
  
  /**
   * Add a message listener
   */
  addMessageListener(listener: (message: Message) => void) {
    this.messageListeners.push(listener)
    return () => {
      this.messageListeners = this.messageListeners.filter(l => l !== listener)
    }
  }
  
  // Getters for state ---------------------------------------------------------
  
  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.connected
  }
  
  /**
   * Get WebRTC status
   */
  isWebRTCEnabled(): boolean {
    return this.useWebRTC && !!this.webrtc
  }

  /**
   * Get ping statistics
   */
  getPingStats() {
    const samples = this.pingStats.samples.slice(-20) // Last 20 samples
    
    if (samples.length === 0) {
      return { avg: 0, min: 0, max: 0, loss: 0 }
    }
    
    const avg = samples.reduce((sum, val) => sum + val, 0) / samples.length
    const min = Math.min(...samples)
    const max = Math.max(...samples)
    
    // Calculate packet loss percentage
    const loss = this.pingStats.totalPackets > 0 
      ? (this.pingStats.packetsLost / this.pingStats.totalPackets) * 100 
      : 0
    
    return { avg, min, max, loss }
  }

  /**
   * Send a ping to measure latency
   */
  sendPing() {
    if (!this.socket || !this.connected) return
    
    const pingId = `ping-${Date.now()}`
    const pingTime = performance.now()
    this.pingStats.lastSent = pingTime
    this.pingStats.totalPackets++
    
    // Try to send via WebRTC if available
    if (this.useWebRTC && this.webrtc) {
      // Broadcast to all peers
      this.webrtc.broadcast({
        type: 'ping',
        id: pingId,
        timestamp: pingTime
      })
    } else {
      // Fall back to WebSocket
      this.socket.emit('ping', {
        id: pingId,
        timestamp: pingTime
      })
    }
    
    // Set timeout to detect lost packets
    setTimeout(() => {
      if (this.pingStats.lastSent === pingTime) {
        // Ping was not answered
        this.pingStats.packetsLost++
      }
    }, 2000)
  }

  /**
   * Handle ping response
   */
  private handlePingResponse(pingTime: number) {
    const latency = performance.now() - pingTime
    this.pingStats.samples.push(latency)
    
    // Keep only the last 100 samples
    if (this.pingStats.samples.length > 100) {
      this.pingStats.samples.shift()
    }
    
    // Reset last sent time to indicate we got a response
    this.pingStats.lastSent = 0
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }
}

// Create a singleton instance
export const socketService = new SocketService()

// Export for mock development
export function setupMockSocket() {
  const playerId = Math.random().toString(36).substring(2, 15)
  
  const currentPlayer: Player = {
    id: playerId,
    name: 'Pookie' + playerId.substring(0, 4),
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    model: 'pookie',
    isNFTHolder: false,
    isTokenHolder: true,
  }
  
  useGameStore.getState().actions.setCurrentPlayer(currentPlayer)
  
  const mockPlayers: Player[] = [
    {
      id: 'mock1',
      name: 'CoolPeng',
      position: [5, 0, 5],
      rotation: [0, Math.PI / 4, 0],
      model: 'pookie',
      isNFTHolder: true,
      isTokenHolder: true,
    },
    {
      id: 'mock2',
      name: 'IcyWings',
      position: [-5, 0, -5],
      rotation: [0, -Math.PI / 4, 0],
      model: 'pookie',
      isNFTHolder: true,
      isTokenHolder: false,
    },
    {
      id: 'mock3',
      name: 'FrostyFin',
      position: [-5, 0, 5],
      rotation: [0, Math.PI / 2, 0],
      model: 'pookie',
      isNFTHolder: false,
      isTokenHolder: true,
    },
  ]
  
  useGameStore.getState().actions.setPlayers(mockPlayers)
} 