'use client'

import Link from 'next/link'
import { useState } from 'react'
import { DEFAULT_POKIE_POKER_RAKE, type PokerTableConfig } from '@/shared/pookie-poker'
import { getPookiePokerSocket } from '@/lib/pookie-poker/socket-client'

export function CreatePrivateTable() {
  const [tableName, setTableName] = useState('Private Rooftop')
  const [bigBlind, setBigBlind] = useState('2000000')
  const [created, setCreated] = useState<{ tableId: string; inviteCode?: string } | null>(null)
  const [error, setError] = useState('')

  function createTable() {
    setError('')
    const tableId = `private-${Date.now().toString(36)}`
    const config: PokerTableConfig = {
      tableId,
      tableName,
      tableType: 'private',
      creatorWallet: 'play-money-host',
      gameType: 'texas_holdem',
      currency: 'SOL',
      smallBlindLamports: (BigInt(bigBlind || '0') / 2n).toString(),
      bigBlindLamports: bigBlind,
      minBuyInLamports: '100000000',
      maxBuyInLamports: '500000000',
      maxPlayers: 6,
      rake: { ...DEFAULT_POKIE_POKER_RAKE, rakePercentBps: 150 },
      realMoneyEnabled: false,
      compliancePolicy: {
        requiresKyc: false,
        requiresGeofence: false,
        allowSpectators: false,
      },
    }

    getPookiePokerSocket().emit('table:create', { config }, (ack) => {
      if (ack.ok && ack.data) {
        setCreated(ack.data)
      } else {
        setError(ack.error?.message ?? 'Could not create private table.')
      }
    })
  }

  return (
    <div className="rounded-md border border-white/10 bg-black/45 p-4 shadow-2xl backdrop-blur">
      <div className="mb-4">
        <h2 className="text-xl font-black">Create Private Table</h2>
        <p className="text-sm text-zinc-300">Invite-only play-money room with lower simulated rake.</p>
      </div>
      <div className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">Table Name</span>
          <input value={tableName} onChange={(event) => setTableName(event.target.value)} className="rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300" />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">Big Blind Lamports</span>
          <input value={bigBlind} onChange={(event) => setBigBlind(event.target.value.replace(/\D/g, ''))} className="rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300" />
        </label>
        <button type="button" onClick={createTable} className="rounded-md bg-cyan-300 px-4 py-3 text-sm font-black text-zinc-950">
          Create Invite Room
        </button>
      </div>
      {created ? (
        <div className="mt-4 rounded-md border border-emerald-300/25 bg-emerald-950/30 p-3 text-sm text-emerald-100">
          Room ready. Invite code {created.inviteCode ?? 'PRIVATE'} /{' '}
          <Link className="font-black underline" href={`/pookie-poker/table/${created.tableId}`}>
            enter table
          </Link>
        </div>
      ) : null}
      {error ? <div className="mt-4 rounded-md border border-red-400/25 bg-red-950/40 p-3 text-sm text-red-100">{error}</div> : null}
    </div>
  )
}
