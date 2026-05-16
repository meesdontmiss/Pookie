import type { ClientTableView } from '@/shared/pookie-poker'
import { formatLamports } from '@/lib/pookie-poker/format'

export function CashierDrawer({ view }: { view: ClientTableView }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/55 p-3 text-sm text-zinc-200 backdrop-blur">
      <div className="mb-3 font-bold uppercase tracking-[0.16em] text-white">Cashier</div>
      <div className="space-y-2">
        <div className="flex justify-between gap-4">
          <span>Mode</span>
          <span className="font-bold text-emerald-200">Play Money</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Buy-in</span>
          <span>{formatLamports(view.minBuyInLamports)} - {formatLamports(view.maxBuyInLamports)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Real money</span>
          <span className="font-bold text-red-200">Disabled</span>
        </div>
      </div>
    </div>
  )
}

