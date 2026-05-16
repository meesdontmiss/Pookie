'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { TablePublicState } from '@/shared/pookie-poker'
import { POKIE_POKER_LOBBY_TABLES } from '@/lib/pookie-poker/mock-data'
import { formatLamports } from '@/lib/pookie-poker/format'
import { getPookiePokerSocket } from '@/lib/pookie-poker/socket-client'
import { CreatePrivateTable } from './CreatePrivateTable'

export function PokerLobby() {
  const [showPrivate, setShowPrivate] = useState(false)
  const [liveTables, setLiveTables] = useState<TablePublicState[]>([])
  const [connected, setConnected] = useState(false)

  const fallbackTables = useMemo<TablePublicState[]>(
    () =>
      POKIE_POKER_LOBBY_TABLES.map((table) => ({
        tableId: table.tableId,
        tableName: table.tableName,
        tableType: table.tableType,
        status: 'waiting',
        gameType: table.gameType,
        currency: table.currency,
        handNumber: 0,
        street: 'preflop',
        smallBlindLamports: table.smallBlindLamports,
        bigBlindLamports: table.bigBlindLamports,
        minBuyInLamports: table.minBuyInLamports,
        maxBuyInLamports: table.maxBuyInLamports,
        maxPlayers: table.maxPlayers,
        potLamports: '0',
        sidePots: [],
        communityCards: [],
        dealerSeat: 0,
        players: [],
        rakeInfo: {
          rakeBps: table.rake.rakePercentBps,
          rakeCapLamports: table.rake.rakeCapLamports,
          rakeTakenThisHandLamports: '0',
        },
      })),
    [],
  )

  const tables = useMemo(
    () => (liveTables.length > 0 ? liveTables : fallbackTables).filter((table) => showPrivate || table.tableType === 'public'),
    [fallbackTables, liveTables, showPrivate],
  )

  useEffect(() => {
    const socket = getPookiePokerSocket()
    const loadTables = () => {
      socket.emit('table:list', undefined, (ack) => {
        if (ack.ok && ack.data) {
          setLiveTables(ack.data.tables)
          setConnected(true)
        }
      })
    }

    socket.on('connect', loadTables)
    socket.on('disconnect', () => setConnected(false))
    socket.on('table:list_update', (payload) => {
      setLiveTables(payload.tables)
      setConnected(true)
    })

    if (socket.connected) loadTables()

    return () => {
      socket.off('connect', loadTables)
      socket.off('disconnect')
      socket.off('table:list_update')
    }
  }, [])

  return (
    <div className="min-h-[calc(100vh-4rem)] overflow-y-auto bg-[#050610] text-white">
      <section className="relative min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(34,211,238,0.18),transparent_30%),linear-gradient(135deg,rgba(88,28,135,0.42),transparent_45%),linear-gradient(180deg,#060712,#0a0f1c)]" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-[linear-gradient(180deg,transparent,rgba(6,78,59,0.22))]" />
        <div className="relative mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex min-h-[560px] flex-col justify-between">
            <div>
              <h1 className="max-w-3xl text-5xl font-black leading-[0.95] text-white sm:text-7xl">Pookie Poker</h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-zinc-300">
                Play-money Texas Hold&apos;em prototype with a deterministic backend engine, private rooms, fake-chip buy-ins, and a rooftop casino table view.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/pookie-poker/table/neon-rooftop-1" className="rounded-md bg-amber-300 px-5 py-3 text-sm font-black text-zinc-950">
                  Join Featured Table
                </Link>
                <button onClick={() => setShowPrivate((value) => !value)} className="rounded-md border border-cyan-300/40 bg-cyan-950/50 px-5 py-3 text-sm font-bold text-cyan-100">
                  {showPrivate ? 'Hide Private' : 'Show Private'}
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Real money" value="Off" />
              <Stat label="Default rake" value="4%" />
              <Stat label="Socket" value={connected ? 'Live' : 'Demo'} />
            </div>
          </div>

          <div className="space-y-4">
          <div className="rounded-md border border-white/10 bg-black/45 p-4 shadow-2xl backdrop-blur">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">Tables</h2>
                <p className="text-sm text-zinc-300">Public cash tables and invite-only previews.</p>
              </div>
              <span className={connected ? 'rounded bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-200' : 'rounded bg-amber-400/15 px-3 py-1 text-xs font-bold text-amber-200'}>
                {connected ? 'LIVE PLAY MONEY' : 'DEMO TABLES'}
              </span>
            </div>
            <div className="space-y-3">
              {tables.map((table) => (
                <Link key={table.tableId} href={`/pookie-poker/table/${table.tableId}`} className="grid rounded-md border border-white/10 bg-zinc-950/70 p-4 transition hover:border-amber-300/50 hover:bg-zinc-900/90 sm:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black">{table.tableName}</h3>
                      <span className="rounded bg-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-zinc-200">{table.tableType}</span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-300">
                      {formatLamports(table.smallBlindLamports)} / {formatLamports(table.bigBlindLamports)} / {table.maxPlayers}-max / {table.rakeInfo.rakeBps / 100}% rake
                    </p>
                  </div>
                  <div className="mt-4 text-sm font-bold text-amber-200 sm:mt-0 sm:self-center">
                    {table.players.length}/{table.maxPlayers} / {table.status}
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-4 rounded-md border border-red-400/20 bg-red-950/20 p-3 text-sm text-red-100">
              POOKIE_POKER_REAL_MONEY_ENABLED=false is the required default. The money path is backend hot/cold custody on Neon, with no poker smart contract.
            </div>
          </div>
          <CreatePrivateTable />
          </div>
        </div>
        <div className="relative mx-auto mt-8 max-w-7xl rounded-md border border-white/10 bg-black/35 p-4 text-sm text-zinc-300 backdrop-blur">
          Play-money prototype only. No cash-out, no real-money staking, no production launch without jurisdiction gating, age/KYC checks, geolocation, AML monitoring, responsible gaming limits, and admin kill switch review.
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/45 p-4 backdrop-blur">
      <div className="text-xs uppercase tracking-[0.16em] text-zinc-400">{label}</div>
      <div className="mt-1 text-2xl font-black text-white">{value}</div>
    </div>
  )
}
