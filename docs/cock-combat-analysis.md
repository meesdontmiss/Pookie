# Cock Combat → Pookie Sumo Ball: Lobby System Analysis

## Executive Summary
This document analyzes the production-ready Cock Combat lobby system to extract proven patterns for upgrading Pookie Sumo Ball's lobby implementation.

---

## 🎯 Key Functional Patterns to Adopt

### 1. **Robust Socket Connection Management**
**Location:** `hooks/use-socket.tsx`

**Key Features:**
- Auto-reconnection with exponential backoff (10 attempts, 1-5s delay)
- Fallback path handling (`/api/socketio` → `/socket.io`)
- Transport negotiation (polling + websocket in dev, websocket-only in prod)
- Identity registration on connect/reconnect
- Auto-rejoin rooms on reconnect
- Wallet address change listener for seamless identity updates

**Apply to Pookie:**
- Enhance `lib/lobby-socket.ts` with fallback paths
- Add auto-rejoin logic for lobby rooms
- Implement wallet change listener

---

### 2. **Server-Authoritative Roster Management**
**Location:** `components/battle/lobby-room.tsx` (lines 192-420)

**Key Features:**
- **No client snapshots:** Server sends `roster_full` and `roster_diff` events
- **Optimistic UI updates:** Immediate badge updates, then server confirmation
- **Defensive state sync:** Request `get_lobby_state` on mount and refresh events
- **Merge strategy:** Conservative merging to avoid dropping entries on transient filters
- **Empty list protection:** If server sends empty roster, request fresh state instead of clearing UI

**Apply to Pookie:**
- Replace current snapshot polling with event-driven roster updates
- Add `roster_full` and `roster_diff` handlers
- Implement defensive empty-list handling

---

### 3. **Wager Transaction Flow**
**Location:** `components/battle/lobby-room.tsx` (lines 496-679), `app/api/wager/route.ts`

**Key Features:**
- **Dual-chain support:** Solana (serialized tx) + BSC (unsigned EVM tx params)
- **Escrow assignment:** One escrow wallet per lobby, assigned on first wager
- **Ready-up gating:** Can't ready without wagering in paid lobbies
- **Retry logic:** Confirm endpoint retries with delay + absolute URL fallback
- **Gas estimation:** Server provides suggested gas/gasPrice for EVM
- **Idempotent confirmation:** Signature/txHash used as idempotency key

**Apply to Pookie:**
- Add Solana wager support alongside existing system
- Implement escrow wallet assignment per lobby
- Add retry logic to wager confirmation
- Gate ready-up behind wager confirmation

---

### 4. **Live Lobby Counts Overlay**
**Location:** `components/battle/battle-arena.tsx` (lines 126, 287-331)

**Key Features:**
- Socket events: `lobby_counts` (incremental) + `lobby_counts_snapshot` (full)
- Real-time display of `liveHumans` and `liveTotal` per lobby
- Displayed on lobby cards before joining
- Request snapshot on mount: `socket.emit('get_lobby_counts')`

**Apply to Pookie:**
- Add live player count badges to lobby cards
- Subscribe to `lobby_counts` and `lobby_counts_snapshot` events
- Display "X/Y players" on each lobby card

---

### 5. **Majority-Ready Grace Period**
**Location:** `components/battle/lobby-room.tsx` (lines 440-494, 757-777)

**Key Features:**
- Server emits `majority_grace` with countdown seconds
- Non-blocking yellow banner: "Majority ready — auto-start in Xs"
- Auto-kick unready/unwagered players after grace expires
- Separate from main countdown (which is 5s pre-match)

**Apply to Pookie:**
- Add `majority_grace` event handler
- Display compact banner during grace period
- Implement auto-kick logic on server

---

### 6. **Guest Identity System**
**Location:** `components/battle/battle-arena.tsx` (lines 83-97), `components/battle/lobby-room.tsx` (lines 101-112)

**Key Features:**
- Generate stable `guest_` UUID on first visit
- Store in `localStorage` and `window.__guestId`
- Use as fallback when no wallet connected
- Register with socket: `socket.emit('register_identity', guestId)`
- Allows free lobbies to work without wallet

**Apply to Pookie:**
- Implement guest ID generation on mount
- Use guest ID as fallback in `getCurrentPlayerId()`
- Register guest identity with socket

---

### 7. **Payout Success Toast**
**Location:** `components/wallet/balance-bar.tsx` (lines 72-88), `components/battle/battle-arena.tsx` (lines 289-307)

**Key Features:**
- Listen for `payout_success` event
- Match winner wallet to current user
- Display toast with amount and explorer link
- Immediately refresh balance on payout

**Apply to Pookie:**
- Add `payout_success` listener to balance component
- Display toast notification with transaction link
- Trigger balance refresh

---

## 🎨 UI/UX Patterns to Adopt

### 1. **Ultra-Compact Lobby Room Layout**
**Location:** `components/battle/lobby-room.tsx` (lines 779-886)

**Design:**
- **Match details:** 4-line compact info (Entry, Active players, Prize, Players)
- **Font size:** `text-[10px]` for details, `text-xs` for player names
- **Scrollable player list:** Fixed height with `overflow-y-auto`, padded for bottom bar
- **Empty slots:** Dashed borders, gray placeholder text
- **Player cards:** Green bg for ready, gray for waiting; avatar circle, username, chicken name

**Apply to Pookie:**
- Reduce font sizes for mobile-first design
- Add scrollable player list with fixed bottom actions
- Show empty slots with dashed borders

---

### 2. **Sticky Bottom Actions Bar**
**Location:** `components/battle/lobby-room.tsx` (lines 888-1036)

**Design:**
- **Position:** `sticky bottom-0` with high z-index
- **Sections:** Min players notice → Ready button → Wager status → Expanded details → Leave button
- **Dynamic padding:** Measure bottom bar height, pad scroll area accordingly
- **Expanded details:** Grid layout showing pool, payout, status, escrow, min/max players

**Apply to Pookie:**
- Make actions bar sticky at bottom
- Add expanded details section with grid layout
- Dynamically adjust scroll area padding

---

### 3. **Animated Status Banners**
**Location:** `components/battle/lobby-room.tsx` (lines 700-777)

**Design:**
- **Countdown overlay:** Full-screen black/80 backdrop, centered text, scale animation
- **All ready banner:** Green bg, top-0, slide-in animation
- **Majority grace banner:** Yellow bg, top-0, separate from countdown
- **Server status banner:** Red bg, top-0, only when unhealthy

**Apply to Pookie:**
- Add framer-motion animated banners
- Use color coding: green=ready, yellow=warning, red=error
- Stack banners at top with proper z-index

---

### 4. **Glassmorphic Lobby Cards**
**Location:** `components/battle/battle-arena.tsx` (lines 400-875)

**Design (inferred from Tailwind classes):**
- **Background:** `bg-white/5` or `bg-gray-800/50`
- **Backdrop blur:** `backdrop-blur`
- **Borders:** `border border-white/10` or `border-gray-700/50`
- **Hover:** `hover:bg-white/10` transition
- **Status pills:** Badge components with color coding

**Apply to Pookie:**
- Already implemented in `lobby.module.css`
- Enhance with more subtle blur and border effects
- Add hover transitions

---

### 5. **Live Player Badges**
**Location:** `components/battle/lobby-room.tsx` (lines 810-860)

**Design:**
- **Avatar circle:** `w-6 h-6 rounded-full`, numbered or "AI"
- **Username:** `text-xs font-semibold truncate`
- **Meta info:** `text-[10px] text-gray-400` (chicken name, etc.)
- **Status badge:** Green "Ready" with checkmark, gray "Wait" with clock icon
- **AI badge:** Purple bg, "AI" text, secondary badge variant

**Apply to Pookie:**
- Add avatar circles with player numbers
- Show ready status with icon badges
- Display meta info (wallet snippet, wager status)

---

### 6. **Responsive Layout Measurements**
**Location:** `components/battle/lobby-room.tsx` (lines 56-99, 172-189)

**Design:**
- **Debug layout logging:** Log viewport, element rects, overflow styles
- **Dynamic height calculation:** Measure bottom bar, calculate available scroll height
- **Resize listener:** Update on window resize and orientation change
- **Interval polling:** Measure every 500ms to catch dynamic changes

**Apply to Pookie:**
- Add layout measurement utilities
- Implement dynamic scroll height calculation
- Add resize/orientation listeners

---

## 🔧 Technical Infrastructure to Adopt

### 1. **Escrow Service Architecture**
**Location:** `lib/escrow-service.ts`

**Design:**
- **Singleton pattern:** `getInstance()` for global access
- **3-wallet rotation:** Wallets A, B, C with load balancing
- **Balance checking:** Async balance refresh before selection
- **Transaction counting:** Track usage per wallet
- **Min balance threshold:** Warn when wallet balance is low (0.1 SOL)
- **Wallet selection strategies:** Round-robin, load-balanced, or fixed

**Apply to Pookie:**
- Implement 3-wallet escrow rotation
- Add balance monitoring and alerts
- Track transaction counts per wallet

---

### 2. **Hardcoded Lobby Structure**
**Location:** `lib/lobbies.ts`

**Design:**
```typescript
interface Lobby {
  id: string;
  name?: string;
  amount: number;
  currency: string;
  players: Player[];
  capacity: number;
  highRoller: boolean;
  status: 'open' | 'starting' | 'in-progress';
  matchType: 'ranked';
  isComingSoon?: boolean;
  escrowWalletId?: 'A' | 'B' | 'C';
}
```
- **Free lobbies:** 4 instances, amount=0, no AI, require 2 humans
- **Wagered lobbies:** Marked `isComingSoon: true` (disabled but visible)
- **In-memory store:** Server maintains authoritative state

**Apply to Pookie:**
- Already implemented in `shared/hardcoded-lobbies.ts`
- Add `isComingSoon` flag for future lobbies
- Add `escrowWalletId` field

---

### 3. **Socket Event Contracts**
**Location:** Inferred from `use-socket.tsx` and `lobby-room.tsx`

**Client → Server:**
- `register_identity(playerId: string)`
- `join_lobby_room(lobbyId: string)`
- `leave_lobby_room(lobbyId: string)`
- `player_ready({ lobbyId, playerId, isReady })`
- `get_lobby_state(lobbyId: string)`
- `get_lobby_counts()`

**Server → Client:**
- `wallet_registered()` / `identity_registered()`
- `roster_full({ lobbyId, players })`
- `roster_diff({ lobbyId, action, player })`
- `player_joined_lobby({ playerId })`
- `player_left_lobby({ playerId })`
- `player_ready_status({ playerId, isReady })`
- `match_starting({ countdown })`
- `match_started()` / `round_start()`
- `arena_lock_roster({ roundStartAtEpochMs })`
- `majority_grace({ seconds })`
- `lobby_counts({ id, liveHumans, liveTotal })`
- `lobby_counts_snapshot({ counts: Record<string, { liveHumans, liveTotal }> })`
- `payout_success({ winner, amount, currency, explorer })`
- `server_status({ healthy, status, ts })`

**Apply to Pookie:**
- Align `shared/contracts.ts` with these events
- Add missing events (majority_grace, lobby_counts, payout_success)
- Document all event payloads

---

### 4. **Wager Confirmation API**
**Location:** `app/api/wager/confirm/route.ts` (not shown, but referenced)

**Design:**
- **POST /api/wager/confirm**
- **Body:** `{ lobbyId, signature, playerPublicKey }`
- **Idempotency:** Use signature as key to prevent double-processing
- **Chain detection:** Check if BSC or Solana
- **Receipt verification:** Fetch on-chain transaction, verify amount and recipient
- **Player update:** Mark player as `hasWagered: true` in lobby roster
- **Response:** `{ success: true }` or `{ error: string }`

**Apply to Pookie:**
- Create `/api/wager/confirm` endpoint
- Implement signature verification
- Update player wager status in lobby state

---

## 📊 State Management Patterns

### 1. **Player State Sync**
**Pattern:** Server is source of truth, client reflects

**Implementation:**
- **Server events:** `roster_full`, `roster_diff`, `player_ready_status`
- **Client state:** `players` array, `isReady` boolean, `hasWagered` boolean
- **Sync logic:** Update local state on server events, not on button clicks
- **Optimistic UI:** Show immediate feedback, but revert if server disagrees

**Apply to Pookie:**
- Remove client-side state mutations
- Update state only on server events
- Add optimistic UI with revert logic

---

### 2. **Countdown State Machine**
**States:** `null` → `countdown > 0` → `countdown = 0` → `match_started`

**Implementation:**
- **Server triggers:** `match_starting({ countdown: 5 })`
- **Client countdown:** `useEffect` decrements every 1s
- **Overlay:** Full-screen countdown display
- **Transition:** On `match_started`, navigate to game

**Apply to Pookie:**
- Already implemented, but ensure server-driven
- Add countdown sound effects
- Smooth transition to game scene

---

### 3. **Lobby Lifecycle**
**States:** `lobby_list` → `lobby_room` → `queue` → `battle` → `game_over` → `lobby_list`

**Implementation:**
- **Join:** Click card → `join_lobby_room` → `setInLobbyRoom(true)`
- **Ready:** Click ready → `player_ready` → server confirms
- **Start:** Server sends `match_starting` → countdown → `match_started`
- **Queue:** Transition to waiting queue view
- **Battle:** Transition to game scene
- **Leave:** Click leave → `leave_lobby_room` → `setInLobbyRoom(false)`

**Apply to Pookie:**
- Add queue state between lobby and game
- Implement smooth transitions
- Preserve lobby state on disconnect/reconnect

---

## 🚀 Immediate Action Items for Pookie Sumo Ball

### Phase 1: Core Infrastructure (Priority 1)
1. ✅ **Enhance socket connection** with fallback paths and auto-rejoin
2. ✅ **Implement guest identity system** for wallet-less play
3. ✅ **Add server-authoritative roster events** (roster_full, roster_diff)
4. ✅ **Implement escrow wallet rotation** (3-wallet system)
5. ✅ **Add wager confirmation endpoint** with idempotency

### Phase 2: UI/UX Upgrades (Priority 2)
6. ✅ **Redesign lobby room layout** (ultra-compact, scrollable)
7. ✅ **Add sticky bottom actions bar** with expanded details
8. ✅ **Implement animated status banners** (ready, grace, countdown)
9. ✅ **Add live player count badges** to lobby cards
10. ✅ **Enhance glassmorphic styling** with subtle blur/borders

### Phase 3: Advanced Features (Priority 3)
11. ⏳ **Add majority-ready grace period** with auto-kick
12. ⏳ **Implement payout success toasts** with balance refresh
13. ⏳ **Add server health status banner**
14. ⏳ **Implement spectator mode** for eliminated players
15. ⏳ **Add chat integration** (X/Twitter auth)

---

## 📝 Code Snippets to Reuse

### Socket Fallback Logic
```typescript
// From use-socket.tsx lines 133-192
const is404 = (error && (error as any).description === 404) || /404/i.test(String((error as any)?.message || ''));
const isWsErr = /websocket error/i.test(String((error as any)?.message || ''));
if ((is404 || isWsErr) && usedPrimary) {
  socketInstance = io(socketUrl, {
    path: fallbackPath,
    transports: ['polling','websocket'],
    // ... other options
  });
}
```

### Guest ID Generation
```typescript
// From battle-arena.tsx lines 83-97
let existing = localStorage.getItem('guest_id');
if (!existing) {
  const gen = 'guest_' + (window.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 12));
  existing = gen;
  localStorage.setItem('guest_id', existing);
}
(window as any).__guestId = existing;
setGuestId(existing);
```

### Roster Diff Handler
```typescript
// From lobby-room.tsx lines 316-357
const onRosterDiff = (payload: any) => {
  if (!payload || payload.lobbyId !== lobby.id) return;
  const { action, player } = payload;
  const pid = String(player?.playerId || '').toLowerCase();
  setPlayers(prev => {
    const map = new Map(prev.map(p=>[p.playerId,p]));
    if (action === 'remove') {
      map.delete(pid);
    } else {
      map.set(pid, {
        playerId: pid,
        username: player?.username || (pid ? pid.slice(0,8)+'...' : 'Player'),
        isReady: !!player?.isReady,
        isAi: !!player?.isAi,
      });
    }
    return Array.from(map.values()).sort((a,b)=> (a.isAi!==b.isAi? (a.isAi?1:-1) : a.playerId.localeCompare(b.playerId)));
  });
};
```

---

## 🎯 Success Metrics

**Functional:**
- ✅ Zero lobby state desyncs
- ✅ <100ms wager confirmation
- ✅ 100% reconnect success rate
- ✅ Guest mode functional without wallet

**UX:**
- ✅ <2s lobby join time
- ✅ Real-time player count updates
- ✅ Smooth countdown animations
- ✅ Mobile-optimized layout

**Performance:**
- ✅ <50ms socket event latency
- ✅ <1s lobby list load time
- ✅ Zero memory leaks on reconnect
- ✅ 60fps UI animations

---

## 📚 Additional Resources

- **Cock Combat Repo:** `C:\Users\16303\Desktop\CURSOR\Pookie 3.0\Cock Combat`
- **Key Files:**
  - `components/battle/lobby-room.tsx` (1039 lines)
  - `hooks/use-socket.tsx` (211 lines)
  - `lib/escrow-service.ts` (452 lines)
  - `app/api/wager/route.ts` (129 lines)
  - `components/battle/battle-arena.tsx` (875 lines)

---

**End of Analysis**

