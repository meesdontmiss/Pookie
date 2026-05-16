export function TableLog({ lines }: { lines: string[] }) {
  return (
    <div className="h-full rounded-md border border-white/10 bg-black/55 p-3 text-xs text-zinc-300 backdrop-blur">
      <div className="mb-2 font-bold uppercase tracking-[0.16em] text-zinc-100">Table Log</div>
      <div className="space-y-2 overflow-hidden">
        {lines.slice(-8).map((line, index) => (
          <div key={`${line}-${index}`} className="border-b border-white/5 pb-2">
            {line}
          </div>
        ))}
      </div>
    </div>
  )
}

