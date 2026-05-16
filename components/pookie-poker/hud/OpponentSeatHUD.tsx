import type { PlayerPublicState } from '@/shared/pookie-poker'
import { formatLamports } from '@/lib/pookie-poker/format'
import { Card } from './Card'
import { DealerButton } from './DealerButton'
import { PlayerTimer } from './PlayerTimer'

export function OpponentSeatHUD({ player, active, dealer }: { player: PlayerPublicState; active: boolean; dealer: boolean }) {
  return (
    <div className={['min-w-40 rounded-md border bg-black/65 p-2 text-white backdrop-blur', active ? 'border-amber-300 shadow-[0_0_28px_rgba(251,191,36,0.35)]' : 'border-white/10'].join(' ')}>
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded bg-gradient-to-br from-cyan-300 to-fuchsia-400 text-xs font-black text-zinc-950">
          {player.displayName.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">{player.displayName}</div>
          <div className="text-xs text-zinc-300">{formatLamports(player.stackLamports)}</div>
        </div>
        {dealer ? <DealerButton compact /> : null}
        <PlayerTimer active={active} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex gap-1">
          <Card hidden compact />
          <Card hidden compact />
        </div>
        <div className="text-right">
          <span className="rounded bg-white/10 px-2 py-1 text-[10px] uppercase text-zinc-200">{player.lastAction ?? (player.folded ? 'folded' : 'in')}</span>
          {player.currentBetLamports !== '0' ? <div className="mt-1 text-[10px] text-amber-100">Bet {formatLamports(player.currentBetLamports)}</div> : null}
        </div>
      </div>
    </div>
  )
}
