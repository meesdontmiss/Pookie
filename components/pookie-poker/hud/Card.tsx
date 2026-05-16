import type { Card as PokerCard } from '@/shared/pookie-poker'
import { cardLabel, isRedSuit } from '@/lib/pookie-poker/cards'

export function Card({ card, hidden = false, compact = false }: { card?: PokerCard; hidden?: boolean; compact?: boolean }) {
  const red = card ? isRedSuit(card.suit) : false
  return (
    <div
      className={[
        'grid shrink-0 place-items-center rounded-md border shadow-[0_8px_20px_rgba(0,0,0,0.28)]',
        compact ? 'h-12 w-9 text-sm' : 'h-20 w-14 text-xl',
        hidden || !card
          ? 'border-cyan-300/25 bg-[linear-gradient(135deg,#10172d,#4a1d63_50%,#0b1021)] text-cyan-100'
          : 'border-white/70 bg-white text-zinc-950',
      ].join(' ')}
      aria-label={hidden || !card ? 'Hidden card' : cardLabel(card)}
    >
      {hidden || !card ? (
        <span className="h-5 w-5 rounded-full border border-cyan-200/60 bg-cyan-300/20" />
      ) : (
        <span className={red ? 'text-red-600' : 'text-zinc-950'}>{cardLabel(card)}</span>
      )}
    </div>
  )
}

