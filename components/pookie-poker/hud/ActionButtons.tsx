'use client'

import { useMemo, useState } from 'react'
import type { LegalAction, PokerAction } from '@/shared/pookie-poker'
import { formatLamports } from '@/lib/pookie-poker/format'
import { BetSlider } from './BetSlider'

export function ActionButtons({
  legalActions,
  onAction,
}: {
  legalActions: LegalAction[]
  onAction: (action: PokerAction, amountLamports?: string) => void
}) {
  const raise = legalActions.find((action) => action.type === 'raise' || action.type === 'bet')
  const min = Number(raise?.minAmountLamports ?? 0)
  const max = Number(raise?.maxAmountLamports ?? min)
  const [betAmount, setBetAmount] = useState(min)

  const actionMap = useMemo(() => new Set(legalActions.map((action) => action.type)), [legalActions])

  return (
    <div className="space-y-3 rounded-md border border-white/10 bg-zinc-950/80 p-3 shadow-2xl backdrop-blur-xl">
      {raise ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-300">
            <span>Bet size</span>
            <span>{formatLamports(BigInt(Math.round(betAmount)))}</span>
          </div>
          <BetSlider value={betAmount || min} min={min} max={max} onChange={setBetAmount} />
          <div className="grid grid-cols-4 gap-2">
            <button className="rounded bg-white/10 px-2 py-1 text-xs text-white" onClick={() => setBetAmount(Math.round(max / 2))}>
              1/2
            </button>
            <button className="rounded bg-white/10 px-2 py-1 text-xs text-white" onClick={() => setBetAmount(Math.round(max * 0.66))}>
              2/3
            </button>
            <button className="rounded bg-white/10 px-2 py-1 text-xs text-white" onClick={() => setBetAmount(max)}>
              Max
            </button>
            <button className="rounded bg-amber-300 px-2 py-1 text-xs font-bold text-zinc-950" onClick={() => onAction(raise.type, String(Math.round(betAmount || min)))}>
              {raise.type === 'bet' ? 'Bet' : 'Raise'}
            </button>
          </div>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button disabled={!actionMap.has('fold')} onClick={() => onAction('fold')} className="rounded-md border border-red-400/40 bg-red-950/70 px-4 py-3 text-sm font-bold text-red-100 disabled:opacity-40">
          Fold
        </button>
        <button disabled={!actionMap.has('check')} onClick={() => onAction('check')} className="rounded-md border border-cyan-300/30 bg-cyan-950/70 px-4 py-3 text-sm font-bold text-cyan-100 disabled:opacity-40">
          Check
        </button>
        <button disabled={!actionMap.has('call')} onClick={() => onAction('call')} className="rounded-md border border-emerald-300/30 bg-emerald-950/70 px-4 py-3 text-sm font-bold text-emerald-100 disabled:opacity-40">
          Call
        </button>
        <button disabled={!actionMap.has('allin')} onClick={() => onAction('allin')} className="rounded-md border border-amber-300/40 bg-amber-400 px-4 py-3 text-sm font-black text-zinc-950 disabled:opacity-40">
          All In
        </button>
      </div>
    </div>
  )
}

