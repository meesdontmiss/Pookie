'use client'

import type { ClientTableView } from '@/shared/pookie-poker'
import { formatLamports } from '@/lib/pookie-poker/format'

export function TableControls({
  view,
  connected,
  pending,
  onSit,
  onReady,
  onStand,
  onLeave,
}: {
  view: ClientTableView
  connected: boolean
  pending: boolean
  onSit: (seatIndex: number) => void
  onReady: () => void
  onStand: () => void
  onLeave: () => void
}) {
  const seated = view.me?.seatIndex !== undefined
  const occupiedSeats = new Set(view.players.map((player) => player.seatIndex))
  const canReady = connected && seated && view.status === 'waiting'

  return (
    <div className="rounded-md border border-white/10 bg-black/65 p-3 text-sm text-zinc-200 shadow-2xl backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="font-bold uppercase tracking-[0.16em] text-white">Table</div>
        <span className={connected ? 'text-emerald-200' : 'text-amber-200'}>{connected ? 'Live' : 'Demo'}</span>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        {Array.from({ length: view.maxPlayers }, (_, seatIndex) => {
          const occupied = occupiedSeats.has(seatIndex)
          const mine = view.me?.seatIndex === seatIndex
          return (
            <button
              key={seatIndex}
              type="button"
              disabled={pending || !connected || occupied}
              onClick={() => onSit(seatIndex)}
              className={[
                'rounded border px-2 py-2 text-xs font-bold transition',
                mine
                  ? 'border-amber-300 bg-amber-300 text-zinc-950'
                  : occupied
                    ? 'border-white/10 bg-white/10 text-zinc-500'
                    : 'border-cyan-300/30 bg-cyan-950/50 text-cyan-100 hover:border-cyan-200',
              ].join(' ')}
            >
              {mine ? 'You' : occupied ? 'Taken' : `Seat ${seatIndex + 1}`}
            </button>
          )
        })}
      </div>

      <div className="mb-3 rounded bg-white/5 p-2 text-xs text-zinc-300">
        Buy-in defaults to {formatLamports(view.minBuyInLamports)} fake chips for this prototype.
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={!canReady || pending}
          onClick={onReady}
          className="rounded-md bg-emerald-300 px-3 py-2 text-xs font-black text-zinc-950 disabled:opacity-40"
        >
          Ready
        </button>
        <button
          type="button"
          disabled={!connected || !seated || pending}
          onClick={onStand}
          className="rounded-md border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
        >
          Stand
        </button>
        <button
          type="button"
          disabled={!connected || pending}
          onClick={onLeave}
          className="rounded-md border border-red-400/30 bg-red-950/60 px-3 py-2 text-xs font-bold text-red-100 disabled:opacity-40"
        >
          Leave
        </button>
      </div>
    </div>
  )
}

