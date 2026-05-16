import { formatLamports } from '@/lib/pookie-poker/format'

export function PotDisplay({ potLamports, rakeBps }: { potLamports: string; rakeBps: number }) {
  return (
    <div className="rounded-md border border-amber-300/30 bg-black/55 px-4 py-2 text-center shadow-[0_0_24px_rgba(250,204,21,0.15)] backdrop-blur">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/80">Pot</div>
      <div className="text-lg font-black text-amber-100">{formatLamports(potLamports)}</div>
      <div className="text-[10px] text-zinc-300">{rakeBps / 100}% rake, capped</div>
    </div>
  )
}

