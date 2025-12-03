import * as THREE from 'three'

export interface LevelObject {
  type: 'start' | 'goal' | 'obstacle' | 'collectible' | 'wall' | 'spawn_platform';
  position: [number, number, number];
  scale?: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  properties?: {
    [key: string]: any;
  };
}

export interface Level {
  id: number;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number; // seconds
  groundSize: [number, number]; // width, length
  objects: LevelObject[];
  theme: {
    groundColor: string;
    fogColor?: string;
    skyColor?: string;
    ambientLightColor?: string;
    directionalLightColor?: string;
  };
}

// Level 1: Ice Slide
const level1: Level = {
  id: 1,
  name: "Ice Slide",
  description: "A gentle slope to get you started. Collect all snowflakes!",
  difficulty: "easy",
  timeLimit: 60,
  groundSize: [30, 50],
  objects: [
    // Starting platform
    {
      type: "start",
      position: [0, 0.5, 20],
      scale: [8, 1, 8],
      color: "#a5d6ff"
    },
    // Goal platform
    {
      type: "goal",
      position: [0, 0.5, -20],
      scale: [8, 1, 8],
      color: "#c1ffb2"
    },
    // Collectibles (snowflakes)
    {
      type: "collectible",
      position: [0, 1, 10]
    },
    {
      type: "collectible",
      position: [5, 1, 5]
    },
    {
      type: "collectible",
      position: [-5, 1, 0]
    },
    {
      type: "collectible",
      position: [0, 1, -5]
    },
    {
      type: "collectible",
      position: [3, 1, -10]
    },
    // Walls
    {
      type: "wall",
      position: [-15, 1, 0],
      scale: [1, 2, 50],
      color: "#84c2ff"
    },
    {
      type: "wall",
      position: [15, 1, 0],
      scale: [1, 2, 50],
      color: "#84c2ff"
    },
    {
      type: "wall",
      position: [0, 1, 25],
      scale: [30, 2, 1],
      color: "#84c2ff"
    },
    {
      type: "wall",
      position: [0, 1, -25],
      scale: [30, 2, 1],
      color: "#84c2ff"
    }
  ],
  theme: {
    groundColor: "#eef8ff",
    fogColor: "#e0f0ff",
    skyColor: "#b3e0ff",
    ambientLightColor: "#84c2ff",
    directionalLightColor: "#ffffff"
  }
};

// Level 2: Glacier Gap
const level2: Level = {
  id: 2,
  name: "Glacier Gap",
  description: "Cross the dangerous glacier gaps to reach the finish!",
  difficulty: "medium",
  timeLimit: 90,
  groundSize: [40, 60],
  objects: [
    // Starting platform
    {
      type: "start",
      position: [0, 0.5, 25],
      scale: [8, 1, 8],
      color: "#a5d6ff"
    },
    // Middle platforms
    {
      type: "obstacle",
      position: [0, 0.5, 10],
      scale: [6, 1, 6],
      color: "#e1f5ff"
    },
    {
      type: "obstacle",
      position: [-10, 0.5, 0],
      scale: [6, 1, 6],
      color: "#e1f5ff"
    },
    {
      type: "obstacle",
      position: [10, 0.5, -5],
      scale: [6, 1, 6],
      color: "#e1f5ff"
    },
    {
      type: "obstacle",
      position: [0, 0.5, -15],
      scale: [6, 1, 6],
      color: "#e1f5ff"
    },
    // Goal platform
    {
      type: "goal",
      position: [0, 0.5, -25],
      scale: [8, 1, 8],
      color: "#c1ffb2"
    },
    // Collectibles
    {
      type: "collectible",
      position: [0, 1, 10]
    },
    {
      type: "collectible",
      position: [-10, 1, 0]
    },
    {
      type: "collectible",
      position: [10, 1, -5]
    },
    {
      type: "collectible",
      position: [0, 1, -15]
    },
    {
      type: "collectible",
      position: [0, 1, -25]
    },
    // Obstacles - ice spikes
    {
      type: "obstacle",
      position: [5, 0.5, 5],
      scale: [1, 2, 1],
      color: "#84c2ff",
      properties: {
        shape: "cone"
      }
    },
    {
      type: "obstacle",
      position: [-5, 0.5, -10],
      scale: [1, 2, 1],
      color: "#84c2ff",
      properties: {
        shape: "cone"
      }
    },
    // Walls
    {
      type: "wall",
      position: [-20, 1, 0],
      scale: [1, 2, 60],
      color: "#84c2ff"
    },
    {
      type: "wall",
      position: [20, 1, 0],
      scale: [1, 2, 60],
      color: "#84c2ff"
    },
    {
      type: "wall",
      position: [0, 1, 30],
      scale: [40, 2, 1],
      color: "#84c2ff"
    },
    {
      type: "wall",
      position: [0, 1, -30],
      scale: [40, 2, 1],
      color: "#84c2ff"
    }
  ],
  theme: {
    groundColor: "#e0f0ff",
    fogColor: "#d1e7ff",
    skyColor: "#a3d0ff",
    ambientLightColor: "#7ab7f5",
    directionalLightColor: "#ffffff"
  }
};

// Level 3: Blizzard Peak
const level3: Level = {
  id: 3,
  name: "Blizzard Peak",
  description: "Navigate a treacherous mountain peak in a blizzard!",
  difficulty: "hard",
  timeLimit: 120,
  groundSize: [50, 70],
  objects: [
    // Starting platform
    {
      type: "start",
      position: [0, 1, 30],
      scale: [8, 1, 8],
      color: "#a5d6ff"
    },
    // Narrow paths
    {
      type: "obstacle",
      position: [0, 0.5, 20],
      scale: [4, 1, 10],
      color: "#d9edff"
    },
    {
      type: "obstacle",
      position: [10, 0.5, 10],
      scale: [15, 1, 4],
      color: "#d9edff"
    },
    {
      type: "obstacle",
      position: [15, 0.5, 0],
      scale: [4, 1, 10],
      color: "#d9edff"
    },
    {
      type: "obstacle",
      position: [5, 0.5, -5],
      scale: [15, 1, 4],
      color: "#d9edff"
    },
    {
      type: "obstacle",
      position: [-5, 0.5, -15],
      scale: [15, 1, 4],
      color: "#d9edff"
    },
    {
      type: "obstacle",
      position: [-15, 0.5, -23],
      scale: [4, 1, 12],
      color: "#d9edff"
    },
    // Goal platform
    {
      type: "goal",
      position: [-20, 0.5, -30],
      scale: [8, 1, 8],
      color: "#c1ffb2"
    },
    // Collectibles
    {
      type: "collectible",
      position: [0, 1, 20]
    },
    {
      type: "collectible",
      position: [10, 1, 10]
    },
    {
      type: "collectible",
      position: [15, 1, 0]
    },
    {
      type: "collectible",
      position: [5, 1, -5]
    },
    {
      type: "collectible",
      position: [-5, 1, -15]
    },
    {
      type: "collectible",
      position: [-15, 1, -23]
    },
    {
      type: "collectible",
      position: [-20, 1, -30]
    },
    // Ice spikes (obstacles)
    {
      type: "obstacle",
      position: [5, 0.5, 15],
      scale: [1, 2, 1],
      color: "#84c2ff",
      properties: {
        shape: "cone"
      }
    },
    {
      type: "obstacle",
      position: [15, 0.5, 5],
      scale: [1, 2, 1],
      color: "#84c2ff",
      properties: {
        shape: "cone"
      }
    },
    {
      type: "obstacle",
      position: [10, 0.5, -10],
      scale: [1, 2, 1],
      color: "#84c2ff",
      properties: {
        shape: "cone"
      }
    },
    {
      type: "obstacle",
      position: [0, 0.5, -15],
      scale: [1, 2, 1],
      color: "#84c2ff",
      properties: {
        shape: "cone"
      }
    },
    {
      type: "obstacle",
      position: [-10, 0.5, -20],
      scale: [1, 2, 1],
      color: "#84c2ff",
      properties: {
        shape: "cone"
      }
    },
    // Slippery slopes (special obstacles)
    {
      type: "obstacle",
      position: [0, 0.5, 0],
      scale: [10, 1, 10],
      rotation: [0.1, 0, 0.1],
      color: "#b8e1ff",
      properties: {
        slippery: true
      }
    },
    {
      type: "obstacle",
      position: [-10, 0.5, 10],
      scale: [10, 1, 10],
      rotation: [0, 0, -0.15],
      color: "#b8e1ff",
      properties: {
        slippery: true
      }
    },
    // Walls
    {
      type: "wall",
      position: [-25, 1, 0],
      scale: [1, 2, 70],
      color: "#84c2ff"
    },
    {
      type: "wall",
      position: [25, 1, 0],
      scale: [1, 2, 70],
      color: "#84c2ff"
    },
    {
      type: "wall",
      position: [0, 1, 35],
      scale: [50, 2, 1],
      color: "#84c2ff"
    },
    {
      type: "wall",
      position: [0, 1, -35],
      scale: [50, 2, 1],
      color: "#84c2ff"
    }
  ],
  theme: {
    groundColor: "#d4ebff",
    fogColor: "#c2e0ff",
    skyColor: "#93c0ff",
    ambientLightColor: "#6da7ec",
    directionalLightColor: "#e0e9ff"
  }
};

// Level 4: Penguin Playground
const level4: Level = {
  id: 4,
  name: "Penguin Playground",
  description: "A fun playground with loops and curves!",
  difficulty: "medium",
  timeLimit: 100,
  groundSize: [45, 65],
  objects: [
    // Starting platform
    {
      type: "start",
      position: [0, 0.5, 30],
      scale: [8, 1, 8],
      color: "#a5d6ff"
    },
    // Loop structure - made of multiple platforms
    // Loop base
    {
      type: "obstacle",
      position: [0, 0.5, 20],
      scale: [10, 1, 5],
      color: "#d9edff"
    },
    // Loop ramp up
    {
      type: "obstacle",
      position: [0, 2, 15],
      scale: [8, 1, 5],
      rotation: [0.3, 0, 0],
      color: "#d9edff"
    },
    // Loop top
    {
      type: "obstacle",
      position: [0, 4, 10],
      scale: [6, 1, 5],
      color: "#d9edff"
    },
    // Loop down
    {
      type: "obstacle",
      position: [0, 2, 5],
      scale: [8, 1, 5],
      rotation: [-0.3, 0, 0],
      color: "#d9edff"
    },
    // Loop exit
    {
      type: "obstacle",
      position: [0, 0.5, 0],
      scale: [10, 1, 5],
      color: "#d9edff"
    },
    // Curved path
    {
      type: "obstacle",
      position: [5, 0.5, -10],
      scale: [10, 1, 15],
      rotation: [0, 0.2, 0],
      color: "#d9edff"
    },
    {
      type: "obstacle",
      position: [15, 0.5, -15],
      scale: [10, 1, 10],
      color: "#d9edff"
    },
    {
      type: "obstacle",
      position: [10, 0.5, -25],
      scale: [15, 1, 10],
      rotation: [0, -0.2, 0],
      color: "#d9edff"
    },
    // Goal platform
    {
      type: "goal",
      position: [0, 0.5, -30],
      scale: [8, 1, 8],
      color: "#c1ffb2"
    },
    // Collectibles
    {
      type: "collectible",
      position: [0, 1, 20]
    },
    {
      type: "collectible",
      position: [0, 3, 15]
    },
    {
      type: "collectible",
      position: [0, 5, 10]
    },
    {
      type: "collectible",
      position: [0, 3, 5]
    },
    {
      type: "collectible",
      position: [0, 1, 0]
    },
    {
      type: "collectible",
      position: [5, 1, -10]
    },
    {
      type: "collectible",
      position: [15, 1, -15]
    },
    {
      type: "collectible",
      position: [10, 1, -25]
    },
    {
      type: "collectible",
      position: [0, 1, -30]
    },
    // Obstacles - penguin statues
    {
      type: "obstacle",
      position: [5, 0.5, 20],
      scale: [1, 2, 1],
      color: "#1f3b60",
      properties: {
        shape: "penguin"
      }
    },
    {
      type: "obstacle",
      position: [-5, 0.5, 20],
      scale: [1, 2, 1],
      color: "#1f3b60",
      properties: {
        shape: "penguin"
      }
    },
    {
      type: "obstacle",
      position: [5, 0.5, 0],
      scale: [1, 2, 1],
      color: "#1f3b60",
      properties: {
        shape: "penguin"
      }
    },
    {
      type: "obstacle",
      position: [-5, 0.5, 0],
      scale: [1, 2, 1],
      color: "#1f3b60",
      properties: {
        shape: "penguin"
      }
    },
    // Walls
    {
      type: "wall",
      position: [-22.5, 1, 0],
      scale: [1, 2, 65],
      color: "#84c2ff"
    },
    {
      type: "wall",
      position: [22.5, 1, 0],
      scale: [1, 2, 65],
      color: "#84c2ff"
    },
    {
      type: "wall",
      position: [0, 1, 32.5],
      scale: [45, 2, 1],
      color: "#84c2ff"
    },
    {
      type: "wall",
      position: [0, 1, -32.5],
      scale: [45, 2, 1],
      color: "#84c2ff"
    }
  ],
  theme: {
    groundColor: "#e8f4ff",
    fogColor: "#daeeff",
    skyColor: "#a7d2ff",
    ambientLightColor: "#7fb9f7",
    directionalLightColor: "#ffffff"
  }
};

// Level 5: Frozen Lake Maze
const level5: Level = {
  id: 5,
  name: "Frozen Lake Maze",
  description: "Navigate through a complex maze on a frozen lake!",
  difficulty: "hard",
  timeLimit: 150,
  groundSize: [60, 60],
  objects: [
    // Starting platform
    {
      type: "start",
      position: [0, 0.5, 25],
      scale: [8, 1, 8],
      color: "#a5d6ff"
    },
    // Maze paths - horizontal walls
    {
      type: "obstacle",
      position: [0, 0.5, 20],
      scale: [40, 1, 2],
      color: "#d9edff"
    },
    {
      type: "obstacle",
      position: [0, 0.5, 10],
      scale: [30, 1, 2],
      color: "#d9edff"
    },
    {
      type: "obstacle",
      position: [0, 0.5, 0],
      scale: [40, 1, 2],
      color: "#d9edff"
    },
    {
      type: "obstacle",
      position: [0, 0.5, -10],
      scale: [30, 1, 2],
      color: "#d9edff"
    },
    {
      type: "obstacle",
      position: [0, 0.5, -20],
      scale: [40, 1, 2],
      color: "#d9edff"
    },
    // Maze paths - vertical walls
    {
      type: "obstacle",
      position: [-20, 0.5, 0],
      scale: [2, 1, 40],
      color: "#d9edff"
    },
    {
      type: "obstacle",
      position: [-10, 0.5, 5],
      scale: [2, 1, 30],
      color: "#d9edff"
    },
    {
      type: "obstacle",
      position: [0, 0.5, 0],
      scale: [2, 1, 40],
      color: "#d9edff"
    },
    {
      type: "obstacle",
      position: [10, 0.5, 5],
      scale: [2, 1, 30],
      color: "#d9edff"
    },
    {
      type: "obstacle",
      position: [20, 0.5, 0],
      scale: [2, 1, 40],
      color: "#d9edff"
    },
    // Goal platform
    {
      type: "goal",
      position: [-15, 0.5, -15],
      scale: [6, 1, 6],
      color: "#c1ffb2"
    },
    // Collectibles
    {
      type: "collectible",
      position: [15, 1, 15]
    },
    {
      type: "collectible",
      position: [-15, 1, 15]
    },
    {
      type: "collectible",
      position: [15, 1, 5]
    },
    {
      type: "collectible",
      position: [-15, 1, 5]
    },
    {
      type: "collectible",
      position: [15, 1, -5]
    },
    {
      type: "collectible",
      position: [-15, 1, -5]
    },
    {
      type: "collectible",
      position: [5, 1, -15]
    },
    {
      type: "collectible",
      position: [-15, 1, -15]
    },
    // Obstacles - ice sculptures
    {
      type: "obstacle",
      position: [5, 0.5, 15],
      scale: [2, 3, 2],
      color: "#84c2ff",
      properties: {
        shape: "sculpture"
      }
    },
    {
      type: "obstacle",
      position: [-5, 0.5, 5],
      scale: [2, 3, 2],
      color: "#84c2ff",
      properties: {
        shape: "sculpture"
      }
    },
    {
      type: "obstacle",
      position: [5, 0.5, -5],
      scale: [2, 3, 2],
      color: "#84c2ff",
      properties: {
        shape: "sculpture"
      }
    },
    {
      type: "obstacle",
      position: [-5, 0.5, -15],
      scale: [2, 3, 2],
      color: "#84c2ff",
      properties: {
        shape: "sculpture"
      }
    },
    // Walls
    {
      type: "wall",
      position: [-30, 1, 0],
      scale: [1, 2, 60],
      color: "#84c2ff"
    },
    {
      type: "wall",
      position: [30, 1, 0],
      scale: [1, 2, 60],
      color: "#84c2ff"
    },
    {
      type: "wall",
      position: [0, 1, 30],
      scale: [60, 2, 1],
      color: "#84c2ff"
    },
    {
      type: "wall",
      position: [0, 1, -30],
      scale: [60, 2, 1],
      color: "#84c2ff"
    }
  ],
  theme: {
    groundColor: "#c2e0ff",
    fogColor: "#b0d4ff",
    skyColor: "#87b7f0",
    ambientLightColor: "#5a99e0",
    directionalLightColor: "#e7f2ff"
  }
};

export const levels: Level[] = [level1, level2, level3, level4, level5];

export function getLevelById(id: number): Level | undefined {
  return levels.find(level => level.id === id);
}

export function getNextLevel(currentLevelId: number): Level | undefined {
  const nextLevelId = currentLevelId + 1;
  return levels.find(level => level.id === nextLevelId);
} 