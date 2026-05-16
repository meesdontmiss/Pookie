export function DealerButton({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={[
        'grid shrink-0 place-items-center rounded-full border border-white/80 bg-white font-black text-zinc-950 shadow-[0_4px_12px_rgba(0,0,0,0.35)]',
        compact ? 'h-5 w-5 text-[10px]' : 'h-7 w-7 text-xs',
      ].join(' ')}
      aria-label="Dealer button"
      title="Dealer"
    >
      D
    </span>
  )
}

