# Reusable Code Patterns from Cock Combat → Pookie Sumo Ball

## Quick Reference Guide for Common Patterns

---

## 🔌 Socket Connection with Fallback

### Pattern: Robust Socket.io Connection
**Use when:** Connecting to socket server with CDN/proxy compatibility

```typescript
const isProd = process.env.NODE_ENV === 'production'
const primaryPath = process.env.NEXT_PUBLIC_SOCKET_PATH || '/socket.io'
const fallbackPath = '/socket.io'
const transports = isProd ? ['websocket'] : ['polling', 'websocket']

let socketInstance = io(socketUrl, {
  path: primaryPath,
  transports,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 15000,
  withCredentials: true,
})

socketInstance.on('connect_error', (error: any) => {
  const is404 = /404/i.test(String(error?.message || ''))
  const isWsErr = /websocket error/i.test(String(error?.message || ''))
  
  if ((is404 || isWsErr) && usedPrimary && reconnectAttempts === 0) {
    // Retry with fallback path and polling transport
    socketInstance = io(socketUrl, {
      path: fallbackPath,
      transports: ['polling', 'websocket'],
      // ... other options
    })
  }
})
```

**Location:** `lib/lobby-socket.ts`

---

## 🎭 Guest Identity System

### Pattern: Stable Guest ID Generation
**Use when:** Need to identify users without wallet connection

```typescript
// Generate and persist
let guestId = localStorage.getItem('guest_id')
if (!guestId) {
  guestId = 'guest_' + (window.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 12))
  localStorage.setItem('guest_id', guestId)
}
(window as any).__guestId = guestId

// Retrieve with fallback
function getCurrentPlayerId(publicKey?: any): string | undefined {
  // Try wallet first
  if (publicKey?.toBase58) return publicKey.toBase58()
  if (publicKey?.toString) return publicKey.toString()
  
  // Fallback to guest
  if (typeof window !== 'undefined') {
    const gid = localStorage.getItem('guest_id') || (window as any).__guestId
    if (gid) return gid
  }
  return undefined
}
```

**Location:** `hooks/use-guest-identity.ts`

---

## 📊 Live Data Subscription

### Pattern: Real-time Lobby Counts
**Use when:** Need to display live occupancy/status across multiple items

```typescript
const [counts, setCounts] = useState<Record<string, { liveHumans: number; liveTotal: number }>>({})

useEffect(() => {
  const socket = io(socketUrl, { /* ... */ })
  
  socket.on('connect', () => {
    socket.emit('get_lobby_counts') // Request initial snapshot
  })
  
  // Incremental update
  socket.on('lobby_counts', (payload: { id: string; liveHumans: number; liveTotal: number }) => {
    setCounts(prev => ({ ...prev, [payload.id]: { liveHumans: payload.liveHumans, liveTotal: payload.liveTotal } }))
  })
  
  // Full snapshot
  socket.on('lobby_counts_snapshot', (payload: { counts: Record<string, any> }) => {
    setCounts(payload.counts)
  })
  
  return () => {
    socket.off('lobby_counts')
    socket.off('lobby_counts_snapshot')
    socket.disconnect()
  }
}, [])
```

**Location:** `hooks/use-lobby-counts.ts`

---

## 🎨 Animated Status Banners

### Pattern: Framer Motion Overlays
**Use when:** Need attention-grabbing status displays

```tsx
import { motion, AnimatePresence } from 'framer-motion'

<AnimatePresence>
  {countdown !== null && countdown > 0 && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        zIndex: 50,
      }}
    >
      <motion.div
        key={countdown}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 1.1, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {countdown}
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

**Location:** `components/lobby/lobby-panel.tsx`

---

## 📏 Dynamic Layout Measurements

### Pattern: Responsive Scroll Area
**Use when:** Need scrollable content with sticky bottom actions

```typescript
const scrollRef = useRef<HTMLDivElement | null>(null)
const bottomActionsRef = useRef<HTMLDivElement | null>(null)
const [bottomPadding, setBottomPadding] = useState<number>(96)
const [scrollMaxHeight, setScrollMaxHeight] = useState<number>(0)

useEffect(() => {
  const measure = () => {
    try {
      const bottomH = bottomActionsRef.current?.offsetHeight || 96
      const scrollTop = scrollRef.current?.getBoundingClientRect().top || 0
      const avail = window.innerHeight - scrollTop - bottomH - 16
      setBottomPadding(Math.max(bottomH + 16, 96))
      setScrollMaxHeight(Math.max(300, avail))
    } catch {}
  }
  
  measure()
  window.addEventListener('resize', measure)
  const id = window.setInterval(measure, 500)
  
  return () => {
    window.removeEventListener('resize', measure)
    window.clearInterval(id)
  }
}, [])

// Apply to scroll area
<div
  ref={scrollRef}
  style={{
    overflowY: 'auto',
    paddingBottom: bottomPadding,
    maxHeight: scrollMaxHeight,
  }}
>
  {/* content */}
</div>

<div ref={bottomActionsRef} style={{ position: 'sticky', bottom: 0 }}>
  {/* actions */}
</div>
```

**Location:** `components/lobby/lobby-panel.tsx`

---

## 🎮 Compact Player Cards

### Pattern: Ultra-Compact Player List
**Use when:** Displaying player rosters in limited space

```tsx
<motion.div
  initial={{ opacity: 0, x: -10 }}
  animate={{ opacity: 1, x: 0 }}
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 8,
    border: `1px solid ${player.ready ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255,255,255,0.08)'}`,
    background: player.ready ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255,255,255,0.02)',
  }}
>
  {/* Avatar circle */}
  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
    {index + 1}
  </div>
  
  {/* Player info */}
  <div style={{ flex: 1, minWidth: 0 }}>
    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {player.username}
    </div>
    <div style={{ fontSize: 10, opacity: 0.6 }}>
      {player.walletShort}
    </div>
  </div>
  
  {/* Status badge */}
  {player.ready ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: '#22c55e', color: '#fff', fontSize: 10, fontWeight: 700 }}>
      <Check size={12} />
      Ready
    </span>
  ) : (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>
      <Clock size={12} />
      Wait
    </span>
  )}
</motion.div>
```

**Location:** `components/lobby/lobby-panel.tsx`

---

## 🔔 Live Player Badge

### Pattern: Pulsing Live Indicator
**Use when:** Showing real-time activity status

```tsx
{liveCount && liveCount.liveTotal > 0 && (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '4px 8px',
      borderRadius: 6,
      background: 'rgba(34, 197, 94, 0.15)',
      border: '1px solid rgba(34, 197, 94, 0.3)',
      fontSize: 11,
      fontWeight: 700,
      color: '#22c55e',
    }}
  >
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: '#22c55e',
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }}
    />
    {liveCount.liveHumans} live
  </span>
)}
```

**CSS:**
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

**Location:** `app/pookiesumoroyale/lobby-browser/page.tsx`

---

## 🎯 Wager Flow with Gating

### Pattern: Conditional Ready-Up
**Use when:** Need to enforce wager before ready in paid lobbies

```typescript
const handleReadyToggle = async () => {
  if (missingIdentity) return
  
  const isPaidLobby = (lobby?.wager ?? 0) > 0
  
  // If trying to ready in paid lobby without wager, process wager first
  if (!myReady && isPaidLobby && !myWagerConfirmed) {
    if (!publicKey) {
      alert('Connect your wallet to ready in ranked lobbies')
      return
    }
    await handleWagerTransaction()
    return
  }
  
  const newReadyState = !myReady
  setMyReady(newReadyState)
  setReady(newReadyState)
}

const handleWagerTransaction = async () => {
  setIsProcessingWager(true)
  try {
    // Process wager transaction
    // ...
    setMyWagerConfirmed(true)
    setMyReady(true)
    setReady(true)
  } catch (error) {
    console.error('Failed to process wager:', error)
  } finally {
    setIsProcessingWager(false)
  }
}
```

**Location:** `components/lobby/lobby-panel.tsx`

---

## 📦 Sticky Bottom Actions

### Pattern: Always-Visible Action Bar
**Use when:** Need actions to remain accessible while scrolling

```tsx
<div
  ref={bottomActionsRef}
  style={{
    position: 'sticky',
    bottom: 0,
    zIndex: 10,
    padding: '12px 20px',
    background: 'rgba(17, 24, 39, 0.95)',
    backdropFilter: 'blur(8px)',
    borderTop: '1px solid rgba(255,255,255,0.08)',
  }}
>
  {/* Notice */}
  <div style={{ padding: '6px 12px', background: 'rgba(251, 191, 36, 0.1)', marginBottom: 8 }}>
    <p style={{ fontSize: 10, color: '#fbbf24' }}>Min. {minRequired} players required</p>
  </div>
  
  {/* Primary action */}
  <button onClick={handleReadyToggle} style={{ width: '100%', height: 44 }}>
    {myReady ? 'CANCEL' : 'READY UP'}
  </button>
  
  {/* Expanded details */}
  <div style={{ marginTop: 12, padding: 12, background: 'rgba(0,0,0,0.3)' }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 10 }}>
      <div>Current Pool</div>
      <div style={{ textAlign: 'right', fontWeight: 700 }}>{pool} SOL</div>
      {/* ... more details */}
    </div>
  </div>
  
  {/* Secondary action */}
  <button onClick={onClose} style={{ width: '100%', height: 36, marginTop: 8 }}>
    LEAVE LOBBY
  </button>
</div>
```

**Location:** `components/lobby/lobby-panel.tsx`

---

## 🎨 Glassmorphic Card Styling

### Pattern: Modern Frosted Glass Effect
**Use when:** Creating modern, layered UI elements

```css
.card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s;
}

.card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
}
```

**Location:** `app/pookiesumoroyale/lobby-browser/lobby.module.css`

---

## 🔄 Server-Authoritative State

### Pattern: Event-Driven State Management
**Use when:** Need reliable, synced state across clients

```typescript
// Client never assumes state, always requests
socket.on('connect', () => {
  socket.emit('register_identity', playerId)
  socket.emit('join_lobby', { lobbyId, username, wallet })
  socket.emit('get_lobby_state', lobbyId) // Request initial state
})

// Server sends authoritative updates
socket.on('roster_full', (payload: { lobbyId: string; players: Player[] }) => {
  if (payload.lobbyId !== currentLobbyId) return
  setPlayers(payload.players)
})

socket.on('roster_diff', (payload: { lobbyId: string; action: 'add' | 'remove' | 'update'; player: Player }) => {
  if (payload.lobbyId !== currentLobbyId) return
  setPlayers(prev => {
    const map = new Map(prev.map(p => [p.id, p]))
    if (payload.action === 'remove') {
      map.delete(payload.player.id)
    } else {
      map.set(payload.player.id, payload.player)
    }
    return Array.from(map.values())
  })
})

// Defensive: request fresh state if server sends empty unexpectedly
if (payload.players.length === 0 && currentPlayers.length > 0) {
  socket.emit('get_lobby_state', lobbyId)
}
```

**Location:** `lib/lobby-socket.ts` (prepared for server)

---

## 🎯 Quick Copy-Paste Snippets

### Empty Slot Placeholder
```tsx
<div style={{ display: 'flex', alignItems: 'center', padding: 10, borderRadius: 8, border: '1px dashed rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.01)' }}>
  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>?</div>
  <div style={{ marginLeft: 10 }}>
    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Empty Slot</div>
    <div style={{ fontSize: 10, opacity: 0.4 }}>Waiting for player...</div>
  </div>
</div>
```

### Compact Info Grid
```tsx
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, fontSize: 10 }}>
  <div>
    <div style={{ opacity: 0.6 }}>Label</div>
    <div style={{ fontWeight: 700, marginTop: 2 }}>Value</div>
  </div>
  {/* repeat for each stat */}
</div>
```

### Status Pill
```tsx
<span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: '#22c55e', color: '#fff', fontSize: 10, fontWeight: 700 }}>
  <Check size={12} />
  Ready
</span>
```

---

## 📚 Full Implementation References

- **Socket Connection:** `lib/lobby-socket.ts`
- **Guest Identity:** `hooks/use-guest-identity.ts`
- **Live Counts:** `hooks/use-lobby-counts.ts`
- **Lobby Panel:** `components/lobby/lobby-panel.tsx`
- **Lobby Browser:** `app/pookiesumoroyale/lobby-browser/page.tsx`

---

**End of Patterns Guide**

