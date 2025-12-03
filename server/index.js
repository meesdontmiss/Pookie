const express = require('express')
const http = require('http')
const { Server } = require("socket.io")
const cors = require('cors')
require('dotenv').config() // NEW: Load environment variables
const { createClient } = require('@supabase/supabase-js') // NEW: Import Supabase client

// NEW: Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase URL or Service Key is missing from environment variables. Ensure .env file is set up.');
  // process.exit(1); // Optionally exit if Supabase isn't configured, or handle gracefully
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Create Express app and HTTP server
const app = express()
const server = http.createServer(app)

// Simple in-memory store for players
const players = {};

// NEW: Lobby state and timer variables
let lobbyState = 'waiting'; // 'waiting', 'countdown', 'in-game'
let lobbyCountdown = 60; // seconds
let countdownInterval = null;
let activeGamePlayerIds = new Set();
console.log(`[Init] Server starting, initial lobbyState: ${lobbyState}`); // NEW LOG

// Configure CORS
// Allow requests from your Next.js frontend (assuming it runs on port 3000)
// And potentially other origins if needed in the future
const allowedOrigins = [
  'http://localhost:3000', 
  // Add any other origins your frontend might be served from, e.g., deployed URLs
]

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    // if (!origin) return callback(null, true) // ORIGINAL
    // if (allowedOrigins.indexOf(origin) === -1) { // ORIGINAL
    //   const msg = 'The CORS policy for this site does not allow access from the specified Origin.' // ORIGINAL
    //   return callback(new Error(msg), false) // ORIGINAL
    // }
    // return callback(null, true) // ORIGINAL
    callback(null, true); // TEMPORARILY ALLOW ALL ORIGINS
  }
}

app.use(cors(corsOptions)) // Use CORS middleware

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] } // TEMPORARILY VERY PERMISSIVE CORS for Socket.IO
})

// Configure Express
app.use(express.json())

// Basic routes
app.get('/favicon.ico', (req, res) => res.status(204).end()); // ADDED: Handle favicon requests

app.get('/', (req, res) => {
  res.send('Pookie Sumo Royale Server is running!')
})

app.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    players: Object.keys(io.sockets.sockets).length,
    uptime: process.uptime()
  })
})

// NEW: Helper function to check if all players are ready
const checkAllPlayersReady = () => {
  const connectedPlayers = Object.values(players);
  if (connectedPlayers.length === 0) return false; // No one to be ready
  // Ensure we have at least one player before checking if all are ready
  // For now, let's say at least 1 player needs to be ready for an "all ready" start.
  // Or, if you want a minimum number of players, adjust this.
  if (connectedPlayers.length < 1) return false; // Example: Minimum 1 player to start early
  return connectedPlayers.every(player => player.isReady);
};

// NEW: Function to start the game
const startGame = () => {
  if (lobbyState === 'in-game') return; // Prevent starting if already in game
  console.log('Game is starting! Setting lobbyState to in-game.');
  lobbyState = 'in-game';
  activeGamePlayerIds.clear(); // Clear for the new game
  Object.values(players).forEach(player => {
    if (player && player.solanaPublicKey) {
      activeGamePlayerIds.add(player.solanaPublicKey);
    }
  });
  console.log('[StartGame] Active players set:', Array.from(activeGamePlayerIds));

  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  lobbyCountdown = 0; // Reset countdown for display
  io.emit('gameStarting', { message: 'Game starting now!' });
  io.emit('lobbyTimerUpdate', lobbyCountdown); // Ensure clients see 0

  // Reset ready status for all players for the next round (optional, good practice)
  Object.values(players).forEach(player => {
    if (player) player.isReady = false;
  });
  io.emit('updatePlayerList', Object.values(players)); // Update list with reset ready states
  
  // NEW: Reset lobby state to 'waiting' after a delay (e.g., simulated game duration)
  const GAME_DURATION_MS = 15000; // e.g., 15 seconds for testing
  console.log(`Game started. Lobby will reset to \'waiting\' in ${GAME_DURATION_MS / 1000} seconds.`);
  setTimeout(() => {
    lobbyState = 'waiting';
    lobbyCountdown = 60; // Reset countdown for the next game
    activeGamePlayerIds.clear(); // Clear active players when game truly ends
    console.log('[EndGame] Active players cleared. Lobby state has been reset to \'waiting\'. New game can start.');
    // Optionally, notify clients that the lobby is open again if they were seeing "game in progress"
    // io.emit('lobbyNowWaiting'); // Client would need to handle this
  }, GAME_DURATION_MS);
};

// NEW: Function to start/manage the lobby countdown
const startLobbyCountdown = () => {
  if (lobbyState !== 'waiting' || Object.keys(players).length === 0) {
    // Don't start if not in 'waiting' state or no players
    // If players are present but state isn't 'waiting', it might be 'in-game' or already 'countdown'
    if(Object.keys(players).length > 0 && lobbyState === 'countdown' && !countdownInterval) {
        // Safety: if in countdown state but interval is lost, try to restart
    } else {
        return;
    }
  }
  
  console.log('First player joined or lobby reset. Starting countdown.');
  lobbyState = 'countdown';
  lobbyCountdown = 60;
  io.emit('lobbyTimerUpdate', lobbyCountdown);

  if (countdownInterval) clearInterval(countdownInterval); // Clear any existing interval

  countdownInterval = setInterval(() => {
    lobbyCountdown--;
    io.emit('lobbyTimerUpdate', lobbyCountdown);
    if (lobbyCountdown <= 0) {
      startGame();
    }
  }, 1000);
};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  console.log(`[Connection] Current lobbyState when user ${socket.id} connected: ${lobbyState}`); // NEW LOG

  // Initially, player is not authenticated and has no public key
  players[socket.id] = {
    id: socket.id,
    solanaPublicKey: null,
    isReady: false, // Ensure isReady is initialized
    username: null, // NEW: Add username field
  }

  // If this is the first player and lobby is waiting, start countdown
  if (Object.keys(players).length === 1 && lobbyState === 'waiting') {
    console.log(`[Connection] First player detected and lobby is waiting. Starting countdown. Current lobbyState: ${lobbyState}`); // NEW LOG
    startLobbyCountdown();
  } else if (lobbyState === 'countdown') {
    console.log(`[Connection] Player joined during countdown. Sending timer. Current lobbyState: ${lobbyState}`); // NEW LOG
    socket.emit('lobbyTimerUpdate', lobbyCountdown);
  } else if (lobbyState === 'in-game') {
    console.log(`[Connection] Player joined while game in progress. Sending gameInProgress. Current lobbyState: ${lobbyState}`); // NEW LOG
    socket.emit('gameInProgress'); // Client will need to handle this
  }
  // Send current player list to the new player
  const playerListForNewConnection = Object.values(players);
  console.log('[Connect] Broadcasting player list to new player:', playerListForNewConnection);
  socket.emit('updatePlayerList', playerListForNewConnection);

  socket.on('authenticate', async (data) => {
    if (data && data.publicKey) {
      const publicKeyString = data.publicKey;
      console.log(`Authenticating socket ${socket.id} with public key ${publicKeyString}`);
      
      let username = null;
      try {
        // NEW: Fetch username from Supabase
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('username')
          .eq('solana_public_key', publicKeyString)
          .single(); // Use .single() - we expect one or zero profiles

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116: Row not found, which is fine here
          console.error(`Error fetching profile for ${publicKeyString}:`, profileError);
        } else if (profile) {
          username = profile.username;
          console.log(`Username '${username}' found for ${publicKeyString}`);
        } else {
          console.log(`No profile (and thus no username) found for ${publicKeyString} on the server yet.`);
        }
      } catch (e) {
        console.error(`Unexpected error fetching profile for ${publicKeyString}:`, e);
      }

      if (players[socket.id]) {
        players[socket.id].solanaPublicKey = publicKeyString;
        players[socket.id].isReady = false;
        players[socket.id].username = username; // NEW: Store fetched username
      } else {
        console.warn(`Player object not found for socket ${socket.id} during authentication.`);
        // This case should ideally not happen if player object is created on connection
        players[socket.id] = { 
          id: socket.id, 
          solanaPublicKey: publicKeyString, 
          isReady: false, 
          username: username // NEW: Store fetched username
        };
      }

      // Inform client about their profile status
      if (username) {
        socket.emit('profileLoaded', { username });
      } else {
        socket.emit('profileNotFound');
      }

      const playerListAfterAuth = Object.values(players);
      console.log('[Authenticate] Broadcasting player list to all:', playerListAfterAuth);
      io.emit('updatePlayerList', playerListAfterAuth);

      // MODIFIED LOGIC FOR HANDLING GAME STATE AND RECONNECTIONS
      if (lobbyState === 'in-game') {
        if (activeGamePlayerIds.has(publicKeyString)) {
          console.log(`[Authenticate] Player ${publicKeyString} reconnected to an active game.`);
          // Send a specific rejoin event with current minimal state
          socket.emit('rejoinActiveGame', { 
            message: 'Rejoining active game.',
            // You could expand this payload with more specific game state for resync if needed later
            // For now, signaling 'ACTIVE' should be enough for the client to bypass countdowns
            initialClientGameState: 'ACTIVE' 
          });
        } else {
          console.log(`[Authenticate] Player ${publicKeyString} attempting to join while game is in progress, but was not part of it.`);
          // The 'gameInProgress' on connection already covers this for the client.
          // Send it again just to be sure if the client expects it after auth for non-participants
          socket.emit('gameInProgress'); 
        }
      } else if (lobbyState === 'countdown') {
        if (checkAllPlayersReady()) {
        startGame();
      }
      } else if (lobbyState === 'waiting') {
        // This logic should be similar to what was in 'connection' for the first player
        // However, player count check should be based on authenticated players if desired
        // For simplicity, we rely on the original logic in 'connection' to start countdowns
        // This part assumes that if lobby is 'waiting', the 'connection' event already handled starting countdown if needed.
        // We might need to re-evaluate if startLobbyCountdown() should be callable from here if a player authenticates
        // and makes the lobby meet conditions (e.g. first authenticated player)
      }

    } else {
      console.log(`Authentication attempt failed for socket ${socket.id}: No public key provided.`);
    }
  });

  socket.on('setPlayerReady', (data) => {
    if (players[socket.id] && typeof data.isReady === 'boolean') {
      players[socket.id].isReady = data.isReady;
      console.log(`Player ${players[socket.id].solanaPublicKey || socket.id} set ready status to: ${data.isReady}`);
      const playerListAfterReadyToggle = Object.values(players);
      console.log('[setPlayerReady] Broadcasting player list to all:', playerListAfterReadyToggle);
      io.emit('updatePlayerList', playerListAfterReadyToggle); // Broadcast updated list

      // Check if all players are ready to start the game
      if (lobbyState === 'countdown' && checkAllPlayersReady()) {
        startGame();
      }
    } else {
      console.log(`Invalid setPlayerReady event from socket ${socket.id}:`, data);
    }
  });

  socket.on('createProfile', async (data) => {
    const { username, walletAddress } = data;
    const socketId = socket.id;

    if (!username || !walletAddress) {
      console.log(`[CreateProfile] Invalid data from socket ${socketId}:`, data);
      return socket.emit('profileError', 'Missing username or wallet address.');
    }

    // Server-side validation (matches client-side for consistency, but server is authoritative)
    const usernameRegex = /^[a-zA-Z0-9]{3,15}$/;
    if (!usernameRegex.test(username)) {
      console.log(`[CreateProfile] Invalid username format from socket ${socketId}: ${username}`);
      return socket.emit('profileError', 'Username must be 3-15 alphanumeric characters.');
    }

    try {
      // Check if a profile already exists for this wallet address
      // This helps prevent accidental overwrites or errors if client logic is bypassed
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('solana_public_key')
        .eq('solana_public_key', walletAddress)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found, which is good here
        console.error(`[CreateProfile] Supabase error checking existing profile for ${walletAddress}:`, fetchError);
        return socket.emit('profileError', 'Server error checking profile.');
      }

      if (existingProfile) {
        console.log(`[CreateProfile] Profile already exists for wallet ${walletAddress}. Attempt to use existing or report error.`);
        // This case should ideally be handled by the 'authenticate' flow loading the existing profile.
        // If client somehow hits createProfile when one exists, we could re-trigger profileLoaded for them
        // or simply tell them it exists.
        players[socketId].username = existingProfile.username; // Assuming existingProfile would have username
        socket.emit('profileLoaded', { username: existingProfile.username || username }); // Send back username
        io.emit('updatePlayerList', Object.values(players)); // Update all lists
        return;
      }
      
      // Optional: Check if username is already taken (if you want unique usernames)
      /*
      const { data: existingUser, error: usernameFetchError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single();

      if (usernameFetchError && usernameFetchError.code !== 'PGRST116') {
        console.error(`[CreateProfile] Supabase error checking username uniqueness for ${username}:`, usernameFetchError);
        return socket.emit('profileError', 'Server error checking username.');
      }

      if (existingUser) {
        console.log(`[CreateProfile] Username '${username}' is already taken.`);
        return socket.emit('profileError', 'This username is already taken. Please choose another.');
      }
      */

      // Create new profile
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({ solana_public_key: walletAddress, username: username });

      if (insertError) {
        console.error(`[CreateProfile] Supabase error inserting new profile for ${walletAddress} with username ${username}:`, insertError);
        // Check for unique constraint violation on solana_public_key if it wasn't caught by the first check
        if (insertError.code === '23505') { // PostgreSQL unique violation code
             return socket.emit('profileError', 'A profile already exists for this wallet.');
        }
        return socket.emit('profileError', 'Failed to create profile on server.');
      }

      console.log(`[CreateProfile] Profile created successfully for ${walletAddress} with username ${username}.`);
      if (players[socketId]) {
        players[socketId].username = username;
      } else {
        // This should not happen if player is authenticated first
        console.warn(`[CreateProfile] Player object for socket ${socketId} not found after profile creation. Creating one.`);
        players[socketId] = {
          id: socketId,
          solanaPublicKey: walletAddress,
          isReady: false,
          username: username,
        };
      }
      
      socket.emit('profileLoaded', { username: username });
      io.emit('updatePlayerList', Object.values(players));

    } catch (e) {
      console.error(`[CreateProfile] Unexpected error during profile creation for ${walletAddress}:`, e);
      socket.emit('profileError', 'An unexpected server error occurred during profile creation.');
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
    const disconnectingPlayer = players[socket.id]
    delete players[socket.id]
    
    if (disconnectingPlayer) {
        const playerListAfterDisconnect = Object.values(players);
        console.log('[Disconnect] Broadcasting player list to all:', playerListAfterDisconnect);
        io.emit('updatePlayerList', playerListAfterDisconnect)
    }

    // If all players leave during countdown, reset lobby to waiting
    if (Object.keys(players).length === 0 && lobbyState === 'countdown') {
      console.log('All players left during countdown. Resetting lobby.');
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      lobbyState = 'waiting';
      lobbyCountdown = 60; // Reset for next time
    }
  })

  // More game-specific events will go here
  // Example: socket.on('playerReady', (isReady) => { /* ... */ })
})

// Start server
const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`Server listening on *:${PORT}`)
  console.log(`WebSocket server available at ws://localhost:${PORT}`)
  console.log(`Visit http://localhost:${PORT}/status for server status`)
}) 