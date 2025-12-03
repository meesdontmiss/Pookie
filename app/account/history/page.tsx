"use client"

import { useEffect, useMemo, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'

interface MatchHistoryItem {
  id: string
  lobbyId: string
  gameMode: string | null
  status: string
  startedAt: string | null
  completedAt: string | null
  winnerWallet: string | null
  roster: Array<{ wallet: string; username?: string; isAi?: boolean }>
}

interface TransactionHistoryItem {
  id: string
  transactionType: string
  amount: number
  description: string | null
  txSignature: string | null
  createdAt: string
}

interface AccountHistoryPayload {
  matches: MatchHistoryItem[]
  transactions: TransactionHistoryItem[]
}

type FilterOption = 'all' | 'wins' | 'losses'

const SOLSCAN_BASE = 'https://solscan.io/tx'
const SOLANA_CLUSTER = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'mainnet'

export default function AccountHistoryPage() {
  const { publicKey } = useWallet()
  const [walletInput, setWalletInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterOption>('all')
  const [data, setData] = useState<AccountHistoryPayload>({ matches: [], transactions: [] })

  const walletAddress = walletInput.trim() || publicKey?.toBase58() || ''

  useEffect(() => {
    if (!walletAddress) return
    setLoading(true)
    setError(null)
    fetch(`/api/account/${walletAddress}/history`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to load history')
        return res.json()
      })
      .then((payload: AccountHistoryPayload) => setData(payload))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [walletAddress])

  const filteredMatches = useMemo(() => {
    return data.matches.filter((match) => {
      const normalized = walletAddress.toLowerCase()
      const isWinner = match.winnerWallet?.toLowerCase() === normalized
      if (filter === 'wins') return isWinner
      if (filter === 'losses') return match.status === 'completed' && !isWinner
      return true
    })
  }, [data.matches, filter, walletAddress])

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-bold mb-2">Match Receipts & Transaction History</h1>
          <p className="text-slate-300">Full transparency for every wagered or free match you’ve played.</p>
        </header>

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <label className="text-sm text-slate-300 font-semibold">Wallet Address</label>
            <input
              className="rounded-xl bg-slate-800 border border-slate-700 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Enter wallet or connect above"
              value={walletInput}
              onChange={(e) => setWalletInput(e.target.value)}
            />
          </div>
          <div className="flex gap-2 text-sm">
            {(['all', 'wins', 'losses'] as FilterOption[]).map((opt) => (
              <button
                key={opt}
                onClick={() => setFilter(opt)}
                className={`px-3 py-1 rounded-full border ${
                  filter === opt ? 'bg-cyan-500 text-black border-cyan-400' : 'border-slate-700'
                }`}
              >
                {opt === 'all' ? 'All Matches' : opt === 'wins' ? 'Wins' : 'Losses'}
              </button>
            ))}
          </div>
          {loading && <p className="text-sm text-blue-400">Loading history…</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Match History</h2>
            <span className="text-sm text-slate-400">{filteredMatches.length} entries</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-400 text-left">
                <tr>
                  <th className="py-2">Date</th>
                  <th>Lobby</th>
                  <th>Status</th>
                  <th>Players</th>
                  <th>Winner</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredMatches.map((match) => {
                  const date = match.startedAt ? new Date(match.startedAt).toLocaleString() : '—'
                  const winner =
                    match.winnerWallet && match.roster.find((p) => p.wallet === match.winnerWallet)?.username
                  const isWinner = match.winnerWallet?.toLowerCase() === walletAddress.toLowerCase()
                  return (
                    <tr key={match.id}>
                      <td className="py-3">{date}</td>
                      <td>{match.lobbyId}</td>
                      <td>
                        <span
                          className={`px-3 py-1 rounded-full text-xs ${
                            match.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-300'
                              : 'bg-slate-700 text-slate-200'
                          }`}
                        >
                          {match.status}
                        </span>
                      </td>
                      <td className="text-slate-300">
                        {match.roster.map((player, idx) => (
                          <span key={player.wallet} className="inline-block mr-1">
                            {player.username || player.wallet.slice(0, 4) + '…'}
                            {idx < match.roster.length - 1 ? ',' : ''}
                          </span>
                        ))}
                      </td>
                      <td className={isWinner ? 'text-emerald-400 font-semibold' : ''}>
                        {winner || match.winnerWallet || '—'}
                      </td>
                      <td>
                        <details className="bg-slate-800/60 rounded-lg px-3 py-1">
                          <summary className="cursor-pointer text-cyan-300">View</summary>
                          <div className="mt-2 space-y-1 text-slate-300">
                            <p>
                              Match ID: <span className="text-slate-100">{match.id}</span>
                            </p>
                            <p>
                              Result:{' '}
                              <span className={isWinner ? 'text-emerald-400' : 'text-red-400'}>
                                {match.status === 'completed'
                                  ? isWinner
                                    ? 'Victory'
                                    : 'Defeat'
                                  : match.status}
                              </span>
                            </p>
                            <p>
                              Transparency:{' '}
                              <a
                                className="text-cyan-400 underline"
                                href={`https://supabase.com/project/history?match=${match.id}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                View record
                              </a>
                            </p>
                          </div>
                        </details>
                      </td>
                    </tr>
                  )
                })}
                {filteredMatches.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="text-center text-slate-400 py-6">
                      No matches found for this wallet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Transactions</h2>
            <span className="text-sm text-slate-400">{data.transactions.length} entries</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-400 text-left">
                <tr>
                  <th className="py-2">Date</th>
                  <th>Type</th>
                  <th>Amount (SOL)</th>
                  <th>Description</th>
                  <th>Signature</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data.transactions.map((txn) => {
                  const date = new Date(txn.createdAt).toLocaleString()
                  const solscanLink =
                    txn.txSignature && `${SOLSCAN_BASE}/${txn.txSignature}${SOLANA_CLUSTER === 'mainnet' ? '' : `?cluster=${SOLANA_CLUSTER}`}`
                  return (
                    <tr key={txn.id}>
                      <td className="py-3">{date}</td>
                      <td>{txn.transactionType}</td>
                      <td className="text-slate-100">{txn.amount?.toFixed(3)}</td>
                      <td className="text-slate-300">{txn.description || '—'}</td>
                      <td>
                        {solscanLink ? (
                          <a
                            className="text-cyan-400 underline"
                            href={solscanLink}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View on Solscan
                          </a>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {data.transactions.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="text-center text-slate-400 py-6">
                      No transactions recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}


