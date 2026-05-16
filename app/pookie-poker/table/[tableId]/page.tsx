import { PokerTableClient } from '@/components/pookie-poker/table/PokerTableClient'

export default function PookiePokerTablePage({ params }: { params: { tableId: string } }) {
  return <PokerTableClient tableId={params.tableId} />
}

