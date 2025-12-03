// Player movement constants
export const PLAYER_CONSTANTS = {
  WALK_SPEED: 6,
  RUN_SPEED: 12,
  TURN_SPEED: 3,
  JUMP_FORCE: 5,
  GRAVITY: 9.8,
  MAX_JUMP_HEIGHT: 2,
  GROUND_FRICTION: 0.8
}

// Camera constants
export const CAMERA_CONSTANTS = {
  DISTANCE: 6,
  HEIGHT: 2,
  SMOOTHING: 0.05,
  MOUSE_SENSITIVITY: 0.004,
  LOOK_UP_LIMIT: Math.PI / 4,
  LOOK_DOWN_LIMIT: Math.PI / 4,
  // New constants for edge-based camera rotation
  CAMERA_DISTANCE: 6,
  PLAYER_HEIGHT: 2,
  LOOK_AT_HEIGHT_OFFSET: 0.8,
  EDGE_THRESHOLD: 200,
  MAX_ROTATION_SPEED: 4.0
}

// Game world constants
export const WORLD_CONSTANTS = {
  GROUND_SIZE: 100,
  GRAVITY: 9.8,
  DAY_CYCLE_DURATION: 600, // in seconds
  SNOW_DENSITY: 1000,
  WIND_STRENGTH: 0.5
}

// Game UI constants
export const UI_CONSTANTS = {
  DEBUG_UPDATE_RATE: 500, // in milliseconds
  CONTROLS_HELP_TIMEOUT: 2500, // in milliseconds
  NOTIFICATION_DURATION: 3000 // in milliseconds
}

// Asset paths
export const ASSET_PATHS = {
  MODELS: {
    PENGUIN: '/models/POOKIE.glb',
    SNOWMAN: '', // Will create with primitive shapes
    IGLOO: '',   // Will create with primitive shapes
    TREE: ''     // Will create with primitive shapes
  },
  TEXTURES: {
    SNOW: {
      DIFFUSE: '',
      NORMAL: '',
      ROUGHNESS: '',
      AO: ''
    },
    ICE: {
      DIFFUSE: '',
      NORMAL: '',
      ROUGHNESS: '',
      AO: ''
    }
  },
  AUDIO: {
    BACKGROUND: '',
    FOOTSTEPS: '',
    JUMP: ''
  }
} 