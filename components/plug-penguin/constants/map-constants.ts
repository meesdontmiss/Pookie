// Map zones for different areas of the game
export const MAP_ZONES = [
  { 
    id: 'spawn',
    name: 'Spawn Area', 
    position: [0, 0, 0],
    size: [10, 1, 10],
    color: '#4CAF50' 
  },
  { 
    id: 'igloo-village',
    name: 'Igloo Village', 
    position: [-10, 0, -10],
    size: [20, 1, 20],
    color: '#2196F3' 
  },
  { 
    id: 'mountain',
    name: 'Mountain', 
    position: [20, 5, -20],
    size: [15, 10, 15],
    color: '#9E9E9E' 
  },
  { 
    id: 'forest',
    name: 'Forest', 
    position: [-20, 0, 20],
    size: [15, 5, 15],
    color: '#4CAF50' 
  },
  { 
    id: 'lake',
    name: 'Frozen Lake', 
    position: [20, 0, 20],
    size: [15, 1, 15],
    color: '#03A9F4' 
  }
]

// Igloo positions in the world
export const IGLOO_POSITIONS: [number, number, number][] = [
  [-10, 0, -10],
  [-15, 0, -5],
  [-5, 0, -15],
  [-20, 0, -10],
  [-10, 0, -20]
] 