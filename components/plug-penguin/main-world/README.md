# Dogfight Leaderboard for Plug Penguin Main World

This component adds a floating leaderboard and dogfight entrance portal to the Plug Penguin main world. 
The leaderboard will **only** appear in the main world and not in the dogfight game itself.

## Quick Integration

Import and add the `PlugPenguinDogfightLeaderboard` component to your main scene:

```jsx
import { PlugPenguinDogfightLeaderboard } from '@/components/plug-penguin/main-world/dogfight-leaderboard'

function YourMainWorldScene() {
  return (
    <>
      {/* Your existing scene components */}
      
      {/* Add the leaderboard and entrance over water */}
      <PlugPenguinDogfightLeaderboard position={[0, 0, 200]} />
    </>
  )
}
```

## Features

- **Main World Only**: This leaderboard is designed to appear only in the Plug Penguin main world
- **Auto-Positioning**: The component automatically positions the leaderboard above the entrance
- **Aim Mode Support**: All elements are clickable in aim mode
- **Green "ENTER GAME NOW" Button**: Matches the button shown in your screenshot
- **Visual Effects**: Includes animations, lights, and hover effects

## Positioning

The component takes a single `position` prop that determines where to place the entire setup:

- The leaderboard will be positioned 30 units above this point
- The entrance portal will be positioned 15 units above this point
- Best placed over water for the visual reflection effect

For example:
```jsx
<PlugPenguinDogfightLeaderboard position={[0, 0, 200]} />
```

This will place:
- The leaderboard at `[0, 30, 200]`
- The entrance portal at `[0, 15, 200]`

## Customization

If you need to customize the appearance:

1. For light adjustments, modify the intensity and color values in `dogfight-leaderboard.tsx`
2. For major changes, edit the component directly to match your world style

## Troubleshooting

If you're having issues:

1. Make sure you're using the component in the main world scene, not the dogfight scene
2. Ensure the position is within view of the camera
3. Make sure there are no other objects blocking the leaderboard
4. Check that lighting is sufficient in the area where it's placed

## Example Implementation

See the file `dogfight-leaderboard.tsx` for details on how this component works. 