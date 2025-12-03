import { getSupabaseAdmin } from './supabase-admin'

const supabase = getSupabaseAdmin()

export interface MatchHistoryItem {
  id: string
  lobbyId: string
  gameMode: string | null
  status: string
  startedAt: string | null
  completedAt: string | null
  winnerWallet: string | null
  roster: Array<{ wallet: string; username?: string; isAi?: boolean }>
}

export interface TransactionHistoryItem {
  id: string
  transactionType: string
  amount: number
  description: string | null
  txSignature: string | null
  createdAt: string
}

export interface AccountHistoryPayload {
  matches: MatchHistoryItem[]
  transactions: TransactionHistoryItem[]
}

export async function fetchAccountHistory(wallet: string): Promise<AccountHistoryPayload> {
  if (!wallet) {
    return { matches: [], transactions: [] }
  }

  const normalized = wallet.toLowerCase()

  const { data: matchesData, error: matchesError } = await supabase
    .from('match_state')
    .select('id,lobby_id,game_mode,status,started_at,completed_at,winner_wallet,roster')
    .contains('roster', [{ wallet: normalized }])
    .order('started_at', { ascending: false })
    .limit(100)

  if (matchesError) {
    throw new Error(`Failed to load match history: ${matchesError.message}`)
  }

  const { data: txData, error: txError } = await supabase
    .from('transactions')
    .select('id,transaction_type,amount,description,tx_signature,created_at')
    .eq('wallet_address', wallet)
    .order('created_at', { ascending: false })
    .limit(100)

  if (txError) {
    throw new Error(`Failed to load transaction history: ${txError.message}`)
  }

  const matches: MatchHistoryItem[] = (matchesData ?? []).map((row) => ({
    id: row.id,
    lobbyId: row.lobby_id,
    gameMode: row.game_mode,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    winnerWallet: row.winner_wallet,
    roster: Array.isArray(row.roster) ? row.roster : [],
  }))

  const transactions: TransactionHistoryItem[] = (txData ?? []).map((row) => ({
    id: row.id,
    transactionType: row.transaction_type,
    amount: row.amount,
    description: row.description,
    txSignature: row.tx_signature,
    createdAt: row.created_at,
  }))

  return { matches, transactions }
}


