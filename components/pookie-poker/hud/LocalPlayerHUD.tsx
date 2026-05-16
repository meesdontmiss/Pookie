'use client'

import type { ClientTableView, PokerAction } from '@/shared/pookie-poker'
import { formatLamports } from '@/lib/pookie-poker/format'
import { ActionButtons } from './ActionButtons'
import { Card } from './Card'

export function LocalPlayerHUD({ view, onAction }: { view: ClientTableView; onAction: (action: PokerAction, amountLamports?: string) => void }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_1.5fr]">
      <div className="rounded-md border border-white/10 bg-black/75 p-3 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-white">{view.me?.displayName ?? 'Spectator'}</div>
            <div className="text-xs text-zinc-300">Stack {formatLamports(view.me?.stackLamports ?? '0')}</div>
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

