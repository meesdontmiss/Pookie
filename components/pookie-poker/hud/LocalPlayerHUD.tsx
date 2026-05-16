'use client'

import type { ClientTableView, PokerAction } from '@/shared/pookie-poker'
import { formatLamports } from '@/lib/pookie-poker/format'
import { ActionButtons } from './ActionButtons'
import { Card } from './Card'
import { DealerButton } from './DealerButton'

export function LocalPlayerHUD({ view, onAction }: { view: ClientTableView; onAction: (action: PokerAction, amountLamports?: string) => void }) {
  const seated = view.me?.seatIndex !== undefined
  const myTurn = seated && view.currentTurnSeat === view.me?.seatIndex

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_1.5fr]">
      <div className="rounded-md border border-white/10 bg-black/75 p-3 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <span>{view.me?.displayName ?? 'Spectator'}</span>
              {view.me?.seatIndex === view.dealerSeat ? <DealerButton compact /> : null}
            </div>
            <div className="text-xs text-zinc-300">Stack {formatLamports(view.me?.stackLamports ?? '0')}</div>
            {view.me?.currentBetLamports && view.me.currentBetLamports !== '0' ? (
              <div className="text-xs text-amber-100">Committed {formatLamports(view.me.currentBetLamports)}</div>
            ) : null}
            <div className={myTurn ? 'mt-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-200' : 'mt-2 text-xs text-zinc-400'}>
              {!seated ? 'Choose a seat to play' : myTurn ? 'Your action' : view.status === 'waiting' ? 'Ready when seated' : 'Waiting for action'}
            </div>
          </div>
          <div className="flex gap-2">
            <Card card={view.me?.holeCards?.[0]} hidden={!view.me?.holeCards?.[0]} />
            <Card card={view.me?.holeCards?.[1]} hidden={!view.me?.holeCards?.[1]} />
          </div>
        </div>
      </div>
      <ActionButtons legalActions={view.legalActions ?? []} onAction={onAction} />
    </div>
  )
}
