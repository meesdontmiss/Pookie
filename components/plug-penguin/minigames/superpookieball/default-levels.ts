import { Level } from './levels';

// Default arctic-themed levels for Super Pookie Ball
const defaultLevels: Level[] = [
  // Level 1: Sumo Ring (Modified)
  {
    id: 1,
    name: "Sumo Ring",
    description: "The initial spawn area.",
    difficulty: "easy",
    timeLimit: 300, // Increased time limit for a sumo setup
    groundSize: [50, 50], // Ground size might be less relevant if platform is floating high
    objects: [
      // Spawn platform - a large circular platform floating in the sky
      {
        type: "spawn_platform",
        position: [0, 20, 0], // Floating high
        // Scale will be handled by radius/thickness props in CircularSpawnPlatform component
        // We can pass radius via properties if needed, or use component defaults.
        // For now, LevelRenderer will pass specific props like radius.
        properties: {
          radius: 15,
          thickness: 1,
          color: "#4A5568" // A dark grey
        }
      },
      // A simple goal for testing, can be removed or changed later for sumo logic
      {
        type: "goal",
        position: [0, 20, -14], // On the edge of the platform
        scale: [2, 0.5, 2],
        color: "#38A169" // Green
      }
    ],
    theme: {
      groundColor: "#1A202C", // Darker ground, less visible if high up
      fogColor: "#2D3748",
      skyColor: "#1A365D", // Deep blue sky
      ambientLightColor: "#4A5568",
      directionalLightColor: "#A0AEC0"
    }
  },
  
  // Level 2: Obstacles Course
  {
    id: 2,
    name: "Glacier Obstacles",
    description: "Navigate around icy obstacles to reach the goal.",
    difficulty: "easy",
    timeLimit: 90,
    groundSize: [50, 70],
    objects: [
      // Start platform
      {
        type: "start",
        position: [0, 0.5, 30],
        scale: [8, 1, 8],
        color: "#a5d6ff"
      },
      // Goal platform
      {
        type: "goal",
        position: [0, 0.5, -30],
        scale: [8, 1, 8],
        color: "#c1ffb2"
      },
      // Obstacles
      {
        type: "obstacle",
        position: [-10, 1, 15],
        scale: [5, 2, 5],
        color: "#84c2ff"
      },
      {
        type: "obstacle",
        position: [10, 1, 5],
        scale: [5, 2, 5],
        color: "#84c2ff"
      },
      {
        type: "obstacle",
        position: [-15, 1, -5],
        scale: [5, 2, 5],
        color: "#84c2ff"
      },
      {
        type: "obstacle",
        position: [15, 1, -15],
        scale: [5, 2, 5],
        color: "#84c2ff"
      },
      // Collectibles
      {
        type: "collectible",
        position: [10, 1, 20]
      },
      {
        type: "collectible",
        position: [-10, 1, 10]
      },
      {
        type: "collectible",
        position: [15, 1, 0]
      },
      {
        type: "collectible",
        position: [-15, 1, -10]
      },
      {
        type: "collectible",
        position: [10, 1, -20]
      },
      // Boundary walls
      {
        type: "wall",
        position: [-25, 2, 0],
        scale: [1, 4, 70],
        color: "#84c2ff"
      },
      {
        type: "wall",
        position: [25, 2, 0],
        scale: [1, 4, 70],
        color: "#84c2ff"
      },
      {
        type: "wall",
        position: [0, 2, 35],
        scale: [50, 4, 1],
        color: "#84c2ff"
      },
      {
        type: "wall",
        position: [0, 2, -35],
        scale: [50, 4, 1],
        color: "#84c2ff"
      }
    ],
    theme: {
      groundColor: "#e0f0ff",
      fogColor: "#e0f0ff",
      skyColor: "#b3e0ff",
      ambientLightColor: "#84c2ff",
      directionalLightColor: "#ffffff"
    }
  },
  
  // Level 3: Narrow Path
  {
    id: 3,
    name: "Frozen Pathway",
    description: "Navigate a narrow icy path with dangerous drops.",
    difficulty: "medium",
    timeLimit: 120,
    groundSize: [60, 80],
    objects: [
      // Start platform
      {
        type: "start",
        position: [0, 0.5, 35],
        scale: [8, 1, 8],
        color: "#a5d6ff"
      },
      // Goal platform
      {
        type: "goal",
        position: [0, 0.5, -35],
        scale: [8, 1, 8],
        color: "#c1ffb2"
      },
      // Path segments
      {
        type: "obstacle",
        position: [0, 0, 25],
        scale: [5, 0.5, 5],
        color: "#84c2ff"
      },
      {
        type: "obstacle",
        position: [5, 0, 15],
        scale: [5, 0.5, 5],
        color: "#84c2ff"
      },
      {
        type: "obstacle",
        position: [-5, 0, 5],
        scale: [5, 0.5, 5],
        color: "#84c2ff"
      },
      {
        type: "obstacle",
        position: [10, 0, 0],
        scale: [5, 0.5, 5],
        color: "#84c2ff"
      },
      {
        type: "obstacle",
        position: [-10, 0, -5],
        scale: [5, 0.5, 5],
        color: "#84c2ff"
      },
      {
        type: "obstacle",
        position: [5, 0, -15],
        scale: [5, 0.5, 5],
        color: "#84c2ff"
      },
      {
        type: "obstacle",
        position: [0, 0, -25],
        scale: [5, 0.5, 5],
        color: "#84c2ff"
      },
      // Collectibles
      {
        type: "collectible",
        position: [0, 2, 25]
      },
      {
        type: "collectible",
        position: [5, 2, 15]
      },
      {
        type: "collectible",
        position: [-5, 2, 5]
      },
      {
        type: "collectible",
        position: [10, 2, 0]
      },
      {
        type: "collectible",
        position: [-10, 2, -5]
      },
      {
        type: "collectible",
        position: [5, 2, -15]
      },
      {
        type: "collectible",
        position: [0, 2, -25]
      },
      // Boundary walls
      {
        type: "wall",
        position: [-30, 2, 0],
        scale: [1, 4, 80],
        color: "#84c2ff"
      },
      {
        type: "wall",
        position: [30, 2, 0],
        scale: [1, 4, 80],
        color: "#84c2ff"
      },
      {
        type: "wall",
        position: [0, 2, 40],
        scale: [60, 4, 1],
        color: "#84c2ff"
      },
      {
        type: "wall",
        position: [0, 2, -40],
        scale: [60, 4, 1],
        color: "#84c2ff"
      }
    ],
    theme: {
      groundColor: "#e0f0ff",
      fogColor: "#e0f0ff", 
      skyColor: "#b3e0ff",
      ambientLightColor: "#84c2ff",
      directionalLightColor: "#ffffff"
    }
  },
  
  // Level 4: Elevated Platforms
  {
    id: 4,
    name: "Snowcapped Peaks",
    description: "Jump between elevated icy platforms to reach the goal.",
    difficulty: "hard",
    timeLimit: 180,
    groundSize: [70, 70],
    objects: [
      // Start platform
      {
        type: "start",
        position: [0, 0.5, 30],
        scale: [8, 1, 8],
        color: "#a5d6ff"
      },
      // Intermediate platforms
      {
        type: "obstacle",
        position: [15, 2, 15],
        scale: [8, 0.5, 8],
        color: "#84c2ff"
      },
      {
        type: "obstacle",
        position: [-15, 4, 0],
        scale: [8, 0.5, 8],
        color: "#84c2ff"
      },
      {
        type: "obstacle",
        position: [15, 6, -15],
        scale: [8, 0.5, 8],
        color: "#84c2ff"
      },
      // Goal platform
      {
        type: "goal",
        position: [0, 8, -30],
        scale: [8, 1, 8],
        color: "#c1ffb2"
      },
      // Collectibles
      {
        type: "collectible",
        position: [15, 4, 15]
      },
      {
        type: "collectible",
        position: [-15, 6, 0]
      },
      {
        type: "collectible",
        position: [15, 8, -15]
      },
      {
        type: "collectible",
        position: [5, 10, -25]
      },
      {
        type: "collectible",
        position: [-5, 10, -25]
      },
      // Boundary walls
      {
        type: "wall",
        position: [-35, 5, 0],
        scale: [1, 10, 70],
        color: "#84c2ff"
      },
      {
        type: "wall",
        position: [35, 5, 0],
        scale: [1, 10, 70],
        color: "#84c2ff"
      },
      {
        type: "wall",
        position: [0, 5, 35],
        scale: [70, 10, 1],
        color: "#84c2ff"
      },
      {
        type: "wall",
        position: [0, 5, -35],
        scale: [70, 10, 1],
        color: "#84c2ff"
      }
    ],
    theme: {
      groundColor: "#e0f0ff",
      fogColor: "#e0f0ff",
      skyColor: "#b3e0ff",
      ambientLightColor: "#84c2ff",
      directionalLightColor: "#ffffff"
    }
  },
  
  // Level 5: Challenging Course
  {
    id: 5,
    name: "Penguin's Challenge",
    description: "A challenging course with rotating platforms and slopes.",
    difficulty: "hard",
    timeLimit: 240,
    groundSize: [80, 80],
    objects: [
      // Start platform
      {
        type: "start",
        position: [0, 0.5, 35],
        scale: [8, 1, 8],
        color: "#a5d6ff"
      },
      // Slope platforms
      {
        type: "obstacle",
        position: [0, 1, 25],
        scale: [10, 1, 10],
        rotation: [0.1, 0, 0],
        color: "#84c2ff"
      },
      {
        type: "obstacle",
        position: [15, 2, 15],
        scale: [10, 1, 10],
        rotation: [0, 0, 0.2],
        color: "#84c2ff"
      },
      {
        type: "obstacle",
        position: [0, 3, 5],
        scale: [10, 1, 10],
        rotation: [-0.1, 0, 0],
        color: "#84c2ff"
      },
      {
        type: "obstacle",
        position: [-15, 4, -5],
        scale: [10, 1, 10],
        rotation: [0, 0, -0.2],
        color: "#84c2ff"
      },
      {
        type: "obstacle",
        position: [0, 5, -15],
        scale: [10, 1, 10],
        rotation: [0.1, 0, 0],
        color: "#84c2ff"
      },
      {
        type: "obstacle",
        position: [15, 6, -25],
        scale: [10, 1, 10],
        rotation: [0, 0, 0.2],
        color: "#84c2ff"
      },
      // Goal platform
      {
        type: "goal",
        position: [0, 7, -35],
        scale: [8, 1, 8],
        color: "#c1ffb2"
      },
      // Collectibles
      {
        type: "collectible",
        position: [0, 3, 25]
      },
      {
        type: "collectible",
        position: [15, 4, 15]
      },
      {
        type: "collectible",
        position: [0, 5, 5]
      },
      {
        type: "collectible",
        position: [-15, 6, -5]
      },
      {
        type: "collectible",
        position: [0, 7, -15]
      },
      {
        type: "collectible",
        position: [15, 8, -25]
      },
      {
        type: "collectible",
        position: [0, 9, -35]
      },
      // Boundary walls
      {
        type: "wall",
        position: [-40, 5, 0],
        scale: [1, 10, 80],
        color: "#84c2ff"
      },
      {
        type: "wall",
        position: [40, 5, 0],
        scale: [1, 10, 80],
        color: "#84c2ff"
      },
      {
        type: "wall",
        position: [0, 5, 40],
        scale: [80, 10, 1],
        color: "#84c2ff"
      },
      {
        type: "wall",
        position: [0, 5, -40],
        scale: [80, 10, 1],
        color: "#84c2ff"
      }
    ],
    theme: {
      groundColor: "#e0f0ff",
      fogColor: "#e0f0ff",
      skyColor: "#b3e0ff",
      ambientLightColor: "#84c2ff",
      directionalLightColor: "#ffffff"
    }
  }
];

export default defaultLevels; 