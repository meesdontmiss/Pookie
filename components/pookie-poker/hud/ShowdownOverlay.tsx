import type { ClientTableView } from '@/shared/pookie-poker'
import { formatLamports } from '@/lib/pookie-poker/format'

export function ShowdownOverlay({ view }: { view: ClientTableView }) {
  if (view.street !== 'showdown') return null

  return (
    <div className="pointer-events-none absolute inset-x-4 top-1/2 z-40 -translate-y-1/2 rounded-md border border-amber-300/40 bg-black/75 p-5 text-center text-white shadow-[0_0_40px_rgba(251,191,36,0.22)] backdrop-blur-xl">
      <div className="text-xs font-bold uppercase tracking-[0.22em] text-amber-200">Showdown</div>
      <div className="mt-2 text-3xl font-black">Pot {formatLamports(view.potLamports)}</div>
      <div className="mt-1 text-sm text-zinc-300">Cards are revealed only when the backend marks them visible.</div>
    </div>
  )
}

