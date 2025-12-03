'use client'

import { useState, useEffect } from 'react'
import { Button } from '@nextui-org/react'

// Add type declaration for window.runNetworkTest
declare global {
  interface Window {
    runNetworkTest?: () => void;
    socketService?: any; // Add global socketService for easier access
  }
}

// Define the RTCStats interface
interface RTCStats {
  peers: number;
  connected: number;
  enabled: boolean;
  latency?: {
    current: number;
    avg: number;
    min: number;
    max: number;
  };
  packetLoss?: {
    current: number;
    avg: number;
    min: number;
    max: number;
  };
}

export default function NetworkStatus() {
  const [isConnected, setIsConnected] = useState(false)
  const [isWebRTCEnabled, setIsWebRTCEnabled] = useState(true)
  const [rtcStats, setRTCStats] = useState<RTCStats>({ peers: 0, connected: 0, enabled: true })
  const [pingStats, setPingStats] = useState({ avg: 0, min: 0, max: 0, loss: 0 })
  const [expanded, setExpanded] = useState(false)
  const [socketService, setSocketService] = useState<any>(null)
  
  // Initialize socket service
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if already initialized globally
      if (window.socketService) {
        setSocketService(window.socketService);
        return;
      }
      
      // Dynamic import
      import('@/lib/socket').then(module => {
        try {
          // Try different ways to access the module
          const SocketServiceModule = module as any;
          let SocketService;
          
          if (typeof SocketServiceModule.default === 'function') {
            SocketService = SocketServiceModule.default;
          } else if (typeof SocketServiceModule === 'function') {
            SocketService = SocketServiceModule;
          } else {
            console.error('Could not find socket service constructor');
            return;
          }
          
          const service = new SocketService();
          window.socketService = service; // Store globally
          setSocketService(service);
        } catch (err) {
          console.error('Failed to initialize socket service:', err);
        }
      }).catch(err => {
        console.error('Failed to load socket service module:', err);
      });
    }
  }, []);
  
  // Set up connection listeners and stats
  useEffect(() => {
    if (!socketService) return;
    
    // Initialize socket service if not already initialized
    if (!socketService.isInitialized) {
      socketService.initialize();
    }
    
    // Set up connection listener
    const handleConnectionChange = (connected: boolean) => {
      setIsConnected(connected);
    }
    
    socketService.addConnectionListener(handleConnectionChange);
    setIsConnected(socketService.isConnected());
    setIsWebRTCEnabled(socketService.isWebRTCEnabled());
    
    // Update stats periodically
    const statsInterval = setInterval(() => {
      if (socketService) {
        const stats = socketService.getRTCStats();
        setRTCStats(stats);
        
        // Get ping stats if available
        if (socketService.getPingStats) {
          const pingData = socketService.getPingStats();
          setPingStats(pingData);
        }
      }
    }, 1000);
    
    return () => {
      socketService.removeConnectionListener(handleConnectionChange);
      clearInterval(statsInterval);
    }
  }, [socketService]);
  
  const toggleWebRTC = () => {
    if (socketService) {
      const newState = !isWebRTCEnabled;
      socketService.toggleWebRTC(newState);
      setIsWebRTCEnabled(newState);
    }
  }
  
  const runNetworkTest = () => {
    // Type-safe check for window.runNetworkTest
    if (typeof window !== 'undefined' && typeof window.runNetworkTest === 'function') {
      window.runNetworkTest();
    } else {
      console.log('Network test not available');
      // Try to load the test script
      const script = document.createElement('script');
      script.src = '/scripts/network-test.js';
      script.onload = () => {
        // Type-safe check after script loads
        if (typeof window.runNetworkTest === 'function') {
          window.runNetworkTest();
        }
      }
      document.body.appendChild(script);
    }
  }
  
  return (
    <div className={`bg-black/70 text-white p-3 rounded-lg shadow-lg transition-all duration-300 ${expanded ? 'w-80' : 'w-auto'}`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <button 
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-300 hover:text-blue-100"
        >
          {expanded ? 'Hide Details' : 'Show Details'}
        </button>
      </div>
      
      {expanded && (
        <div className="mt-3 text-sm">
          <div className="flex justify-between mb-2">
            <span>Protocol:</span>
            <span className={isWebRTCEnabled ? 'text-green-400' : 'text-yellow-400'}>
              {isWebRTCEnabled ? 'WebRTC (UDP)' : 'WebSocket (TCP)'}
            </span>
          </div>
          
          {isWebRTCEnabled && (
            <>
              <div className="flex justify-between mb-2">
                <span>Peers:</span>
                <span>{rtcStats.connected}/{rtcStats.peers} connected</span>
              </div>
              
              {/* Display WebRTC latency if available */}
              {rtcStats.latency && (
                <div className="flex justify-between mb-2">
                  <span>WebRTC Latency:</span>
                  <span className={
                    rtcStats.latency.current > 150 ? 'text-red-400' : 
                    rtcStats.latency.current > 80 ? 'text-yellow-400' : 
                    'text-green-400'
                  }>
                    {rtcStats.latency.current.toFixed(0)}ms
                  </span>
                </div>
              )}
              
              {/* Display WebRTC packet loss if available */}
              {rtcStats.packetLoss && (
                <div className="flex justify-between mb-2">
                  <span>Socket Packet Loss:</span>
                  <span className={
                    rtcStats.packetLoss.current > 5 ? 'text-red-400' : 
                    rtcStats.packetLoss.current > 1 ? 'text-yellow-400' : 
                    'text-green-400'
                  }>
                    {rtcStats.packetLoss.current.toFixed(1)}%
                  </span>
                </div>
              )}
              
              {pingStats.avg > 0 && (
                <div className="flex justify-between mb-2">
                  <span>Ping:</span>
                  <span>{pingStats.avg.toFixed(1)}ms (min: {pingStats.min.toFixed(1)}ms, max: {pingStats.max.toFixed(1)}ms)</span>
                </div>
              )}
              
              {pingStats.loss > 0 && (
                <div className="flex justify-between mb-2">
                  <span>Socket Packet Loss:</span>
                  <span className={pingStats.loss > 5 ? 'text-red-400' : 'text-yellow-400'}>
                    {pingStats.loss.toFixed(1)}%
                  </span>
                </div>
              )}
            </>
          )}
          
          <div className="flex gap-2 mt-3">
            <Button 
              size="sm" 
              color={isWebRTCEnabled ? "primary" : "default"}
              onClick={toggleWebRTC}
              className="text-xs flex-1"
            >
              {isWebRTCEnabled ? 'Disable WebRTC' : 'Enable WebRTC'}
            </Button>
            
            <Button 
              size="sm" 
              color="secondary"
              onClick={runNetworkTest}
              className="text-xs flex-1"
            >
              Run Network Test
            </Button>
          </div>
        </div>
      )}
    </div>
  )
} 