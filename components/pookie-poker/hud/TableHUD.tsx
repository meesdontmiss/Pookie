import type { ClientTableView } from '@/shared/pookie-poker'
import { formatLamports } from '@/lib/pookie-poker/format'
import { CommunityCards } from './CommunityCards'
import { PotDisplay } from './PotDisplay'

export function TableHUD({ view }: { view: ClientTableView }) {
  const actor = view.players.find((player) => player.seatIndex === view.currentTurnSeat)

  return (
    <div className="pointer-events-none absolute inset-x-4 top-4 z-20 flex flex-col items-center gap-3">
      <div className="flex w-full max-w-5xl items-center justify-between rounded-md border border-white/10 bg-black/55 px-4 py-2 text-sm text-white backdrop-blur">
        <div>
          <div className="font-black">{view.tableName}</div>
          <div className="text-xs text-zinc-300">
            {formatLamports(view.smallBlindLamports)} / {formatLamports(view.bigBlindLamports)}
          </div>
        </div>
        <div className="text-center text-xs uppercase tracking-[0.18em] text-cyan-100">
          Hand #{view.handNumber} / {view.street} / {actor ? `${actor.displayName} to act` : view.status}
        </div>
        <div className="text-right text-xs text-zinc-300">{view.players.length}/{view.maxPlayers} seats</div>
      </div>
      <PotDisplay potLamports={view.potLamports} rakeBps={view.rakeInfo.rakeBps} />
      <CommunityCards cards={view.communityCards} />
    </div>
  )
}
