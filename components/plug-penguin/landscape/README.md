# Plug Penguin Landscape Components

This directory contains modular landscape components for the Plug Penguin game environment.

## Available Components

### LandscapeManager

A central manager that handles the placement and coordination of all landscape elements.

```tsx
<LandscapeManager
  seed={12345}               // Seed for random generation
  worldSize={500}            // Size of the world in units
  density={1.0}              // Density multiplier for objects
  windDirection={[1, 0.5]}   // Direction of wind (affects snow piles)
  windStrength={0.3}         // Strength of wind effects
  snowLevel={1.0}            // Amount of snow (affects number of piles)
  enableLake={true}          // Whether to include frozen lake
  enableMountains={true}     // Whether to include mountains
  debugMode={false}          // Enable debug visualization
  onTerrainLoaded={() => {}} // Callback when terrain is loaded
/>
```

### FrozenLake

A reflective frozen lake with ice cracks and depth effects.

```tsx
<FrozenLake
  position={[0, 0, 0]}      // Position of the lake
  size={[100, 100]}         // Width and length of the lake
  depth={2}                 // Depth of the lake
  roughness={0.1}           // Surface roughness (lower = more reflective)
  metalness={0.9}           // Surface metalness (higher = more reflective)
  color="#a5d8ff"           // Color of the ice
  resolution={1024}         // Reflection resolution
  mirror={0.75}             // Mirror effect strength
  distortion={0.2}          // Surface distortion amount
  cracks={true}             // Enable ice crack texture
/>
```

### SnowPile

Procedurally generated snow piles with wind effects and sparkles.

```tsx
<SnowPile
  position={[0, 0, 0]}      // Position of the snow pile
  scale={[1, 1, 1]}         // Scale of the snow pile
  variant="medium"          // Size variant: "small", "medium", "large", or "drift"
  smoothness={0.8}          // Surface smoothness (0-1)
  sparkle={true}            // Enable sparkle effect
  windDirection={[1, 0]}    // Direction of wind influence
  windStrength={0.2}        // Strength of wind deformation
/>
```

## Future Components

The following components are planned but not yet implemented:

- `Terrain`: A snow-covered terrain with displacement maps
- `Mountain`: Snowy mountains with particle effects
- `Forest`: Procedurally generated tree clusters

## Usage in Game Scene

The components are designed to be used within the game scene:

```tsx
// In game-scene.tsx
<LandscapeManager
  seed={12345}
  worldSize={500}
  density={1.0}
  enableLake={true}
  debugMode={isDebugMode()}
  onTerrainLoaded={handleLandscapeLoaded}
/>
```

## Performance Considerations

- The `LandscapeManager` uses Poisson disc sampling to efficiently distribute elements
- Snow piles are automatically culled outside the visible area
- Parameters like `density` and `resolution` can be adjusted for performance
- For lower-end devices, consider:
  - Reducing `density` to 0.5-0.7
  - Setting `sparkle={false}` on snow piles
  - Lowering `resolution` on the frozen lake
  - Disabling `enableMountains` if implemented

## Texture Requirements

The components use the following textures:
- `/textures/snow/snow.jpg` - Used for ice cracks in the frozen lake

## Contributing

When adding new landscape components:
1. Create the component in this directory
2. Add it to the exports in `index.ts`
3. Update the README with usage examples
4. Integrate it into the `LandscapeManager` if appropriate 