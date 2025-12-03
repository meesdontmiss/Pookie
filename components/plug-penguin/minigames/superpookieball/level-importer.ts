import * as THREE from 'three';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Level, LevelObject } from './levels';

// Marble Mouse level converter
// This utility converts Marble Mouse GLB levels to our level format

// Theme colors for our arctic theme
const THEME_COLORS = {
  ground: '#e0f0ff',
  obstacles: '#84c2ff',
  collectibles: '#ffcc00',
  goal: '#c1ffb2',
  start: '#a5d6ff',
  walls: '#84c2ff',
  skyColor: '#b3e0ff',
  fogColor: '#e0f0ff',
  ambientLight: '#84c2ff',
  directionalLight: '#ffffff'
};

// Function to convert a Marble Mouse GLB to our level format
export async function convertMarbleMouseLevel(
  levelIndex: number, 
  glbPath: string, 
  name: string, 
  difficulty: 'easy' | 'medium' | 'hard'
): Promise<Level> {
  // Use a loader to parse the GLB file
  const loader = new GLTFLoader();
  
  return new Promise((resolve, reject) => {
    loader.load(
      glbPath,
      (gltf: GLTF) => {
        // Default dimensions
        const groundSize: [number, number] = [50, 70];
        const objects: LevelObject[] = [];
        
        // Start with a fresh scene
        const scene = gltf.scene;
        
        // Find the start position (usually where the ball spawns)
        let startPosition: [number, number, number] = [0, 2, 0];
        let goalPosition: [number, number, number] | null = null;
        
        // Process all objects in the scene
        scene.traverse((object: THREE.Object3D) => {
          if (object instanceof THREE.Mesh) {
            const name = object.name.toLowerCase();
            const position = [object.position.x, object.position.y, object.position.z] as [number, number, number];
            
            // Extract scale information
            const scale = object.scale.toArray() as [number, number, number];
            
            // Extract rotation information
            const rotation = [
              object.rotation.x,
              object.rotation.y,
              object.rotation.z
            ] as [number, number, number];
            
            // Handle different object types
            if (name.includes('start') || name.includes('spawn')) {
              // Start platform
              startPosition = position;
              objects.push({
                type: 'start',
                position,
                scale: [8, 1, 8],
                color: THEME_COLORS.start
              });
            } else if (name.includes('goal') || name.includes('finish')) {
              // Goal platform
              goalPosition = position;
              objects.push({
                type: 'goal',
                position,
                scale: [8, 1, 8],
                color: THEME_COLORS.goal
              });
            } else if (name.includes('coin') || name.includes('pickup')) {
              // Collectible item
              objects.push({
                type: 'collectible',
                position: [position[0], position[1] + 1, position[2]]
              });
            } else if (name.includes('platform') || name.includes('ground')) {
              // Check if it's the main ground
              if (scale[0] > 20 && scale[2] > 20) {
                // This is likely the main ground - update the ground size
                groundSize[0] = scale[0] * 2; // Width
                groundSize[1] = scale[2] * 2; // Length
              } else {
                // Regular platform/obstacle
                objects.push({
                  type: 'obstacle',
                  position,
                  scale,
                  rotation,
                  color: THEME_COLORS.obstacles
                });
              }
            } else if (name.includes('wall') || name.includes('barrier')) {
              // Wall
              objects.push({
                type: 'wall',
                position,
                scale,
                rotation,
                color: THEME_COLORS.walls
              });
            } else if (name.includes('obstacle') || name.includes('hazard')) {
              // Special obstacle
              objects.push({
                type: 'obstacle',
                position,
                scale,
                rotation,
                color: THEME_COLORS.obstacles,
                properties: {
                  shape: name.includes('cone') || name.includes('spike') ? 'cone' : 'box'
                }
              });
            } else {
              // Default to obstacle for any other mesh
              objects.push({
                type: 'obstacle',
                position,
                scale,
                rotation,
                color: THEME_COLORS.obstacles
              });
            }
          }
        });
        
        // If no goal was found, create one at the furthest position from start
        if (!goalPosition) {
          goalPosition = [startPosition[0], startPosition[1], startPosition[2] - 30];
          objects.push({
            type: 'goal',
            position: goalPosition,
            scale: [8, 1, 8],
            color: THEME_COLORS.goal
          });
        }
        
        // Add boundary walls if not present
        const halfWidth = groundSize[0] / 2;
        const halfLength = groundSize[1] / 2;
        
        // Add walls if not enough were found
        let hasLeftWall = false;
        let hasRightWall = false;
        let hasTopWall = false;
        let hasBottomWall = false;
        
        objects.forEach(obj => {
          if (obj.type === 'wall') {
            const pos = obj.position;
            if (Math.abs(pos[0] - (-halfWidth)) < 5) hasLeftWall = true;
            if (Math.abs(pos[0] - halfWidth) < 5) hasRightWall = true;
            if (Math.abs(pos[2] - (-halfLength)) < 5) hasBottomWall = true;
            if (Math.abs(pos[2] - halfLength) < 5) hasTopWall = true;
          }
        });
        
        // Add missing walls
        if (!hasLeftWall) {
          objects.push({
            type: 'wall',
            position: [-halfWidth, 2, 0],
            scale: [1, 4, groundSize[1]],
            color: THEME_COLORS.walls
          });
        }
        
        if (!hasRightWall) {
          objects.push({
            type: 'wall',
            position: [halfWidth, 2, 0],
            scale: [1, 4, groundSize[1]],
            color: THEME_COLORS.walls
          });
        }
        
        if (!hasTopWall) {
          objects.push({
            type: 'wall',
            position: [0, 2, halfLength],
            scale: [groundSize[0], 4, 1],
            color: THEME_COLORS.walls
          });
        }
        
        if (!hasBottomWall) {
          objects.push({
            type: 'wall',
            position: [0, 2, -halfLength],
            scale: [groundSize[0], 4, 1],
            color: THEME_COLORS.walls
          });
        }
        
        // Add some collectibles if none were found
        if (!objects.some(obj => obj.type === 'collectible')) {
          // Add some collectibles along a path from start to goal
          const startToGoal = [
            goalPosition[0] - startPosition[0],
            0,
            goalPosition[2] - startPosition[2]
          ];
          const distance = Math.sqrt(startToGoal[0]**2 + startToGoal[2]**2);
          const numCollectibles = Math.min(Math.floor(distance / 10), 7);
          
          for (let i = 1; i <= numCollectibles; i++) {
            const fraction = i / (numCollectibles + 1);
            objects.push({
              type: 'collectible',
              position: [
                startPosition[0] + startToGoal[0] * fraction,
                startPosition[1] + 1,
                startPosition[2] + startToGoal[2] * fraction
              ]
            });
          }
        }
        
        // Create the final level object
        const level: Level = {
          id: levelIndex,
          name: name,
          description: `A ${difficulty} arctic course adapted from Marble Mouse.`,
          difficulty: difficulty,
          timeLimit: difficulty === 'easy' ? 60 : (difficulty === 'medium' ? 90 : 120),
          groundSize: groundSize,
          objects: objects,
          theme: {
            groundColor: THEME_COLORS.ground,
            fogColor: THEME_COLORS.fogColor,
            skyColor: THEME_COLORS.skyColor,
            ambientLightColor: THEME_COLORS.ambientLight,
            directionalLightColor: THEME_COLORS.directionalLight
          }
        };
        
        resolve(level);
      },
      // Progress callback
      (xhr: ProgressEvent) => {
        console.log(`${(xhr.loaded / xhr.total) * 100}% loaded`);
      },
      // Error callback - accept any error type
      (error: any) => {
        console.error('Error loading GLB:', error);
        reject(error);
      }
    );
  });
}

// Helper function to map Marble Mouse levels to our levels
export async function importMarbleMouseLevels(): Promise<Level[]> {
  const levels: Level[] = [];
  
  // Basic level structure - Updated paths to correctly reference files from the marble-mouse directory
  const levelMappings = [
    { path: 'tutorial.glb', name: 'Icy Beginnings', difficulty: 'easy' as const },
    { path: 'simple.glb', name: 'Frozen Path', difficulty: 'easy' as const },
    { path: 'halfpipe.glb', name: 'Arctic Halfpipe', difficulty: 'easy' as const },
    { path: 'twist.glb', name: 'Glacier Twist', difficulty: 'medium' as const },
    { path: 'rings.glb', name: 'Frost Rings', difficulty: 'medium' as const },
    { path: 'hammers.glb', name: 'Ice Hammers', difficulty: 'hard' as const },
    { path: 'corkscrew.glb', name: 'Frozen Corkscrew', difficulty: 'hard' as const },
    { path: 'jump.glb', name: 'Snow Jump', difficulty: 'medium' as const },
    { path: 'edge-hop.glb', name: 'Glacier Edge', difficulty: 'hard' as const },
    // Add more levels from the available files
    { path: 'up-down.glb', name: 'Arctic Elevator', difficulty: 'medium' as const },
    { path: 'tightrope.glb', name: 'Ice Tightrope', difficulty: 'hard' as const },
    { path: 'wallrun.glb', name: 'Snow Wall Run', difficulty: 'medium' as const },
    { path: 'rotating-beam.glb', name: 'Rotating Ice Beam', difficulty: 'hard' as const },
    { path: 'wind-tunnel.glb', name: 'Blizzard Tunnel', difficulty: 'hard' as const },
    { path: 'drop.glb', name: 'Glacier Drop', difficulty: 'medium' as const },
    { path: 'fans.glb', name: 'Arctic Fans', difficulty: 'medium' as const },
    { path: 'vertebrae.glb', name: 'Frozen Spine', difficulty: 'hard' as const },
    { path: 'balance-beam.glb', name: 'Icy Balance', difficulty: 'hard' as const },
  ];
  
  // Base path for marble-mouse levels - using correct site path
  const basePath = '/models/marble-levels/';
  
  // Check if the directory exists before attempting to load
  try {
    // Try to perform a fetch check on the first level as a test
    const testPath = basePath + levelMappings[0].path;
    const testFetch = await fetch(testPath, { method: 'HEAD' });
    
    // If the fetch fails (404 or other error), just return an empty array
    if (!testFetch.ok) {
      console.warn(`Marble Mouse GLB files not found at path: ${testPath}. Using default levels only.`);
      return [];
    }
    
    // Load each level sequentially if the test passed
    for (let i = 0; i < levelMappings.length; i++) {
      try {
        const fullPath = basePath + levelMappings[i].path;
        console.log(`Attempting to load level: ${levelMappings[i].name} from ${fullPath}`);
        
        const level = await convertMarbleMouseLevel(
          i + 101, // Start IDs at 101 to avoid conflicts with default levels
          fullPath,
          levelMappings[i].name,
          levelMappings[i].difficulty
        );
        levels.push(level);
        console.log(`Successfully loaded level: ${levelMappings[i].name}`);
      } catch (error) {
        console.error(`Failed to load level ${levelMappings[i].name}:`, error);
      }
    }
  } catch (error: any) {
    console.warn('Could not access Marble Mouse levels:', error);
    // Return empty array to indicate no levels were loaded
    return [];
  }
  
  return levels;
}

export default importMarbleMouseLevels; 