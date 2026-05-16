export function PlayerTimer({ active }: { active: boolean }) {
  return (
    <span
      className="grid h-9 w-9 place-items-center rounded-full"
      style={{
        background: active
          ? 'conic-gradient(#facc15 0deg, #facc15 250deg, rgba(255,255,255,0.12) 250deg)'
          : 'rgba(255,255,255,0.08)',
      }}
      aria-label={active ? 'Player turn timer active' : 'Player timer inactive'}
    >
      <span className="grid h-7 w-7 place-items-center rounded-full bg-zinc-950 text-[10px] font-black text-white">
        {active ? 'ACT' : '--'}
      </span>
    </span>
  )
}

