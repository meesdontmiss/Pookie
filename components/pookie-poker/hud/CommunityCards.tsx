import type { Card as PokerCard } from '@/shared/pookie-poker'
import { Card } from './Card'

export function CommunityCards({ cards }: { cards: PokerCard[] }) {
  const display = [...cards]
  while (display.length < 5) display.push(undefined as unknown as PokerCard)
  return (
    <div className="flex items-center justify-center gap-2">
      {display.map((card, index) => (
        <Card key={index} card={card} hidden={!card} />
      ))}
    </div>
  )
}

