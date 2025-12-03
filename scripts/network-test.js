/**
 * Network Performance Test Script
 * 
 * This script demonstrates the performance benefits of WebRTC (UDP) over WebSockets (TCP)
 * by measuring round-trip time for different types of game actions.
 * 
 * Usage: Run this in your browser console when connected to the game.
 */

// Configuration
const TEST_DURATION = 10000; // 10 seconds
const PING_INTERVAL = 100; // Send a ping every 100ms
const PACKET_SIZES = [
  16,    // Small (player position)
  512,   // Medium (chat messages)
  4096,  // Large (game state updates)
];

// Results storage
const results = {
  webrtc: {
    small: [],
    medium: [],
    large: [],
    lostPackets: 0,
    totalPackets: 0
  },
  websocket: {
    small: [],
    medium: [],
    large: [],
    lostPackets: 0,
    totalPackets: 0
  }
};

// Create synthetic game payloads of different sizes
function createPayload(size) {
  // Create a simple object with random data
  const payload = {
    id: Math.random().toString(36).substring(2, 15),
    timestamp: Date.now(),
    position: [Math.random() * 100, Math.random() * 100, Math.random() * 100],
    rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
    data: []
  };
  
  // Add random data to reach the target size
  const baseSize = JSON.stringify(payload).length;
  const remaining = size - baseSize;
  
  if (remaining > 0) {
    // Fill with random data
    for (let i = 0; i < remaining / 10; i++) {
      payload.data.push(Math.random().toString(36).substring(2, 12));
    }
  }
  
  return payload;
}

// Measure round-trip time using WebRTC
async function testWebRTC() {
  console.log('Testing WebRTC (UDP) performance...');
  
  // Enable WebRTC if not already enabled
  const useWebRTC = window.socketService.useWebRTC;
  if (!useWebRTC) {
    window.socketService.toggleWebRTC(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for connections
  }
  
  const startTime = Date.now();
  const endTime = startTime + TEST_DURATION;
  
  // Run tests for each packet size
  for (const size of PACKET_SIZES) {
    const sizeCategory = size <= 64 ? 'small' : size <= 1024 ? 'medium' : 'large';
    let packetCount = 0;
    
    const interval = setInterval(() => {
      if (Date.now() >= endTime) {
        clearInterval(interval);
        return;
      }
      
      const payload = createPayload(size);
      payload.id = `webrtc-${sizeCategory}-${packetCount}`;
      payload.sentTime = Date.now();
      
      // Broadcast to all peers
      window.socketService.webrtc.broadcast({
        type: 'networkTest',
        data: payload
      });
      
      results.webrtc.totalPackets++;
      packetCount++;
    }, PING_INTERVAL);
    
    // Wait for this test to complete
    await new Promise(resolve => setTimeout(resolve, TEST_DURATION + 500));
  }
  
  // Clean up and restore original mode
  if (!useWebRTC) {
    window.socketService.toggleWebRTC(false);
  }
}

// Measure round-trip time using WebSockets
async function testWebSockets() {
  console.log('Testing WebSocket (TCP) performance...');
  
  // Disable WebRTC temporarily
  const useWebRTC = window.socketService.useWebRTC;
  if (useWebRTC) {
    window.socketService.toggleWebRTC(false);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for reconnection
  }
  
  const startTime = Date.now();
  const endTime = startTime + TEST_DURATION;
  
  // Run tests for each packet size
  for (const size of PACKET_SIZES) {
    const sizeCategory = size <= 64 ? 'small' : size <= 1024 ? 'medium' : 'large';
    let packetCount = 0;
    
    const interval = setInterval(() => {
      if (Date.now() >= endTime) {
        clearInterval(interval);
        return;
      }
      
      const payload = createPayload(size);
      payload.id = `websocket-${sizeCategory}-${packetCount}`;
      payload.sentTime = Date.now();
      
      // Send to server which will echo back
      window.socketService.socket.emit('network:test', payload);
      
      results.websocket.totalPackets++;
      packetCount++;
    }, PING_INTERVAL);
    
    // Wait for this test to complete
    await new Promise(resolve => setTimeout(resolve, TEST_DURATION + 500));
  }
  
  // Clean up and restore original mode
  if (useWebRTC) {
    window.socketService.toggleWebRTC(true);
  }
}

// Display test results
function displayResults() {
  console.log('Network Test Results:');
  console.log('=====================');
  
  function formatResults(type) {
    const data = results[type];
    
    // Calculate averages for each size
    const smallAvg = data.small.length ? 
      data.small.reduce((sum, val) => sum + val, 0) / data.small.length : 
      'N/A';
    
    const mediumAvg = data.medium.length ? 
      data.medium.reduce((sum, val) => sum + val, 0) / data.medium.length : 
      'N/A';
    
    const largeAvg = data.large.length ? 
      data.large.reduce((sum, val) => sum + val, 0) / data.large.length : 
      'N/A';
    
    // Calculate packet loss
    const lossRate = (data.lostPackets / data.totalPackets) * 100 || 0;
    
    return {
      small: typeof smallAvg === 'number' ? `${smallAvg.toFixed(2)} ms` : smallAvg,
      medium: typeof mediumAvg === 'number' ? `${mediumAvg.toFixed(2)} ms` : mediumAvg,
      large: typeof largeAvg === 'number' ? `${largeAvg.toFixed(2)} ms` : largeAvg,
      loss: `${lossRate.toFixed(2)}%`,
      packets: `${data.totalPackets - data.lostPackets}/${data.totalPackets}`
    };
  }
  
  const webrtcResults = formatResults('webrtc');
  const websocketResults = formatResults('websocket');
  
  console.log('WebRTC (UDP):');
  console.log(`  Small packets (16B): ${webrtcResults.small}`);
  console.log(`  Medium packets (512B): ${webrtcResults.medium}`);
  console.log(`  Large packets (4KB): ${webrtcResults.large}`);
  console.log(`  Packet delivery: ${webrtcResults.packets} (${webrtcResults.loss} loss)`);
  
  console.log('WebSocket (TCP):');
  console.log(`  Small packets (16B): ${websocketResults.small}`);
  console.log(`  Medium packets (512B): ${websocketResults.medium}`);
  console.log(`  Large packets (4KB): ${websocketResults.large}`);
  console.log(`  Packet delivery: ${websocketResults.packets} (${websocketResults.loss} loss)`);
  
  // Calculate average improvement
  function calcImprovement(webrtc, websocket) {
    if (typeof webrtc !== 'number' || typeof websocket !== 'number') return 'N/A';
    const diff = ((websocket - webrtc) / websocket) * 100;
    return `${diff.toFixed(2)}%`;
  }
  
  console.log('Performance Improvement (WebRTC vs WebSocket):');
  const smallImpr = calcImprovement(
    results.webrtc.small.reduce((sum, val) => sum + val, 0) / results.webrtc.small.length,
    results.websocket.small.reduce((sum, val) => sum + val, 0) / results.websocket.small.length
  );
  const mediumImpr = calcImprovement(
    results.webrtc.medium.reduce((sum, val) => sum + val, 0) / results.webrtc.medium.length,
    results.websocket.medium.reduce((sum, val) => sum + val, 0) / results.websocket.medium.length
  );
  const largeImpr = calcImprovement(
    results.webrtc.large.reduce((sum, val) => sum + val, 0) / results.webrtc.large.length,
    results.websocket.large.reduce((sum, val) => sum + val, 0) / results.websocket.large.length
  );
  
  console.log(`  Small packets: ${smallImpr}`);
  console.log(`  Medium packets: ${mediumImpr}`);
  console.log(`  Large packets: ${largeImpr}`);
}

// Run the tests
async function runTests() {
  console.log('Starting network performance tests...');
  console.log('This will take about 60 seconds. Please wait...');
  
  // Set up listeners for test responses
  const setupListeners = () => {
    // WebRTC response handler
    if (window.socketService.webrtc) {
      window.socketService.webrtc.onMessage = (oldHandler => (data) => {
        // Call the original handler
        if (oldHandler) oldHandler(data);
        
        // Handle test responses
        if (data && data.type === 'networkTest-response') {
          const payload = data.data;
          const now = Date.now();
          const latency = now - payload.sentTime;
          
          if (payload.id.startsWith('webrtc-small')) {
            results.webrtc.small.push(latency);
          } else if (payload.id.startsWith('webrtc-medium')) {
            results.webrtc.medium.push(latency);
          } else if (payload.id.startsWith('webrtc-large')) {
            results.webrtc.large.push(latency);
          }
        }
      })(window.socketService.webrtc.onMessage);
    }
    
    // WebSocket response handler
    window.socketService.socket.on('network:test-response', (payload) => {
      const now = Date.now();
      const latency = now - payload.sentTime;
      
      if (payload.id.startsWith('websocket-small')) {
        results.websocket.small.push(latency);
      } else if (payload.id.startsWith('websocket-medium')) {
        results.websocket.medium.push(latency);
      } else if (payload.id.startsWith('websocket-large')) {
        results.websocket.large.push(latency);
      }
    });
  };
  
  setupListeners();
  
  // Run the tests
  await testWebRTC();
  await testWebSockets();
  
  // Display the results
  displayResults();
}

// Export functions for use in browser console
window.networkTest = {
  runTests,
  testWebRTC,
  testWebSockets,
  results,
  displayResults
};

console.log('Network test utility loaded!');
console.log('Run tests with: window.networkTest.runTests()'); 