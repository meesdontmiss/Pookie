# Pookie Remotion — Video Creation Studio

Programmatic video creation for Pookie Sumo Royale using [Remotion](https://remotion.dev).

## Setup

```bash
cd remotion
npm install
```

## Usage

### Open Remotion Studio (live preview + editing)

```bash
npm run studio
```

This opens a browser-based studio where you can preview compositions in real-time, tweak props, and export.

### Render Videos

```bash
# Render gameplay highlight (30s, 1080p, 60fps)
npm run render

# Render kill montage
npm run render:montage

# Render intro animation
npm run render:intro

# Render all compositions
npm run render:all
```

Output goes to `out/` directory.

## Compositions

| ID | Description | Duration | Resolution |
|---|---|---|---|
| `GameplayHighlight` | Full highlight reel with intro/gameplay/outro | 30s | 1920×1080 |
| `KillMontage` | Fast-paced elimination montage | 15s | 1920×1080 |
| `GameIntro` | Cinematic logo reveal | 5s | 1920×1080 |
| `GameplayVertical` | Vertical format for TikTok/Reels | 15s | 1080×1920 |

## Architecture

```
remotion/
├── src/
│   ├── index.ts            # Entry point (registerRoot)
│   ├── Root.tsx            # Composition registry
│   └── compositions/
│       ├── GameplayHighlight.tsx  # Main highlight reel
│       ├── KillMontage.tsx        # Elimination montage
│       ├── GameIntro.tsx          # Logo/intro animation
│       └── ThreeScene.tsx         # 3D scene using @remotion/three
├── package.json
├── tsconfig.json
└── README.md
```

## Adding Real Gameplay Footage

### Option 1: Screen Recordings
Record gameplay as `.mp4` files, place them in `public/recordings/`, then use:
```tsx
import { OffthreadVideo } from 'remotion';
<OffthreadVideo src="/recordings/match-123.mp4" />
```

### Option 2: 3D Scene Rendering
Use `ThreeScene.tsx` as a template — import your actual game models (POOKIE.glb, arena assets) and render cinematic camera angles:
```tsx
import { ThreeCanvas } from '@remotion/three';
import { useGLTF } from '@react-three/drei';
// Load actual game model
const { scene } = useGLTF('/models/POOKIE.glb');
```

### Option 3: Replay System (Advanced)
Record match state (positions, events) server-side, then replay them in a Remotion composition with custom camera work:
```tsx
// Replay data from match
const replayData = matchRecording.frames;
const currentData = replayData[frame];
// Render all player positions at this frame
```

## Customization

All compositions accept props you can override via CLI:
```bash
npx remotion render src/index.ts GameplayHighlight out/custom.mp4 \
  --props='{"title":"MY CUSTOM TITLE","ballColor":"#00e5ff","playerName":"Champion"}'
```

## Requirements

- Node.js 18+
- For GPU-accelerated rendering: Chrome/Chromium installed
- For serverless rendering: see [Remotion Lambda docs](https://remotion.dev/docs/lambda)
