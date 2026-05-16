'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import type { ClientTableView, PokerAction, SeatVisualState } from '@/shared/pookie-poker'
import { getOrCreatePokerIdentity, type PookiePokerClientIdentity } from '@/lib/pookie-poker/client-identity'
import { MOCK_TABLE_VIEW } from '@/lib/pookie-poker/mock-data'
import { getPookiePokerSocket } from '@/lib/pookie-poker/socket-client'
import { CashierDrawer } from '../hud/CashierDrawer'
import { LocalPlayerHUD } from '../hud/LocalPlayerHUD'
import { OpponentSeatHUD } from '../hud/OpponentSeatHUD'
import { TableControls } from '../hud/TableControls'
import { TableHUD } from '../hud/TableHUD'
import { TableLog } from '../hud/TableLog'
import { ShowdownOverlay } from '../hud/ShowdownOverlay'

const PokerScene = dynamic(() => import('../three/PokerScene').then((mod) => mod.PokerScene), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center bg-[#070815] text-cyan-100">Loading rooftop table...</div>,
})

export function PokerTableClient({ tableId }: { tableId: string }) {
  const wallet = useWallet()
  const [identity, setIdentity] = useState<PookiePokerClientIdentity | null>(null)
  const [view, setView] = useState<ClientTableView>({ ...MOCK_TABLE_VIEW, tableId })
  const [log, setLog] = useState<string[]>(['Opening Pookie Poker table.', 'Connect to the poker socket, choose a seat, then ready up.'])
  const [connected, setConnected] = useState(false)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    setIdentity(getOrCreatePokerIdentity(wallet.publicKey?.toBase58()))
  }, [wallet.publicKey])

  const appendLog = useCallback((line: string) => {
    setLog((lines) => [...lines.slice(-12), line])
  }, [])

  useEffect(() => {
    if (!identity) return

    const socket = getPookiePokerSocket()
    const currentIdentity = identity

    function applyServerView(nextView: ClientTableView) {
      setConnected(true)
      setView(nextView)
    }

    function joinTable() {
      socket.emit('table:join', { tableId, wallet: currentIdentity.wallet, displayName: currentIdentity.displayName }, (ack) => {
        if (!ack.ok || !ack.data) {
          appendLog(ack.error?.message ?? 'Could not join table.')
          return
        }
        applyServerView(ack.data)
        appendLog('Joined as spectator. Pick a seat to play.')
      })
    }

    function handleConnect() {
      appendLog('Poker socket connected.')
      joinTable()
    }

    function handleDisconnect() {
      setConnected(false)
      appendLog('Poker socket disconnected. Local demo view remains visible.')
    }

    socket.on('table:state', applyServerView)
    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)

    if (socket.connected) {
      handleConnect()
    } else {
      socket.connect()
    }

    return () => {
      socket.off('table:state', applyServerView)
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
    }
  }, [appendLog, identity, tableId])

  const seats = useMemo<SeatVisualState[]>(() => {
    return Array.from({ length: view.maxPlayers }, (_, seatIndex) => {
      const player = view.players.find((candidate) => candidate.seatIndex === seatIndex)
      return {
        seatIndex,
        wallet: player?.wallet,
        displayName: player?.displayName,
        occupied: Boolean(player),
        activeTurn: view.currentTurnSeat === seatIndex,
        folded: player?.folded ?? false,
        allIn: player?.allIn ?? false,
        winner: false,
        lastAction:
          player?.lastAction === 'fold' ||
          player?.lastAction === 'check' ||
          player?.lastAction === 'call' ||
          player?.lastAction === 'bet' ||
          player?.lastAction === 'raise' ||
          player?.lastAction === 'allin'
            ? player.lastAction
            : undefined,
        stackLamports: player?.stackLamports ?? '0',
      }
    })
  }, [view])

  function withPending(work: () => void) {
    if (pending) return
    setPending(true)
    work()
  }

  function handleSit(seatIndex: number) {
    if (!connected) {
      appendLog('Start the poker server to sit at a live table.')
      return
    }
    withPending(() => {
      getPookiePokerSocket().emit('table:sit', { tableId, seatIndex, buyInLamports: view.minBuyInLamports }, (ack) => {
        setPending(false)
        if (ack.ok && ack.data) {
          setView(ack.data)
          appendLog(`Sat in seat ${seatIndex + 1}.`)
        } else {
          appendLog(ack.error?.message ?? 'Seat request failed.')
        }
      })
    })
  }

  function handleReady() {
    if (!connected) return
    withPending(() => {
      getPookiePokerSocket().emit('hand:ready', { tableId }, (ack) => {
        setPending(false)
        if (ack.ok && ack.data) {
          setView(ack.data)
          appendLog(ack.data.status === 'active' ? 'Hand started.' : 'Ready. Waiting for another seated player.')
        } else {
          appendLog(ack.error?.message ?? 'Ready failed.')
        }
      })
    })
  }

  function handleStand() {
    if (!connected) return
    withPending(() => {
      getPookiePokerSocket().emit('table:stand', { tableId }, (ack) => {
        setPending(false)
        if (ack.ok && ack.data) {
          setView(ack.data)
          appendLog('Stood up from the table.')
        } else {
          appendLog(ack.error?.message ?? 'Could not stand right now.')
        }
      })
    })
  }

  function handleLeave() {
    if (!connected) return
    withPending(() => {
      getPookiePokerSocket().emit('table:leave', { tableId }, (ack) => {
        setPending(false)
        if (ack.ok) {
          appendLog('Left table room.')
        } else {
          appendLog(ack.error?.message ?? 'Could not leave table.')
        }
      })
    })
  }

  function handleAction(action: PokerAction, amountLamports?: string) {
    if (!connected) {
      appendLog(`Demo action selected: ${action}.`)
      return
    }

    const socket = getPookiePokerSocket()
    const payload = { tableId, amountLamports }
    const callback = (ack: { ok: boolean; data?: ClientTableView; error?: { message: string } }) => {
      if (ack.ok && ack.data) {
        setView(ack.data)
        appendLog(`Server accepted ${action}.`)
      } else {
        appendLog(ack.error?.message ?? `Server rejected ${action}.`)
      }
    }

    if (action === 'fold') socket.emit('action:fold', payload, callback)
    else if (action === 'check') socket.emit('action:check', payload, callback)
    else if (action === 'call') socket.emit('action:call', payload, callback)
    else if (action === 'bet') socket.emit('action:bet', payload, callback)
    else if (action === 'raise') socket.emit('action:raise', payload, callback)
    else if (action === 'allin') socket.emit('action:allin', payload, callback)
    else appendLog(`${action} will be available during showdown.`)
  }

  const opponents = view.players.filter((player) => player.wallet !== view.me?.wallet)

  return (
    <div className="relative h-[calc(100vh-4rem)] overflow-hidden bg-[#050610] text-white">
      <div className="absolute inset-0">
        <PokerScene seats={seats} />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,transparent_0,rgba(5,6,16,0.16)_34%,rgba(5,6,16,0.78)_100%)]" />
      <TableHUD view={view} />
      <ShowdownOverlay view={view} />

      <div className="pointer-events-none absolute inset-x-3 top-44 z-20 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:inset-x-8 lg:grid-cols-5">
        {opponents.map((player) => (
          <div key={player.wallet} className="pointer-events-auto">
            <OpponentSeatHUD player={player} active={view.currentTurnSeat === player.seatIndex} dealer={view.dealerSeat === player.seatIndex} />
          </div>
        ))}
      </div>

      <div className="absolute bottom-4 left-4 right-4 z-30 grid gap-3 lg:grid-cols-[250px_1fr_280px]">
        <div className="hidden lg:block">
          <TableLog lines={log} />
        </div>
        <div className="space-y-3">
          <div className="lg:hidden">
            <TableControls
              view={view}
              connected={connected}
              pending={pending}
              onSit={handleSit}
              onReady={handleReady}
              onStand={handleStand}
              onLeave={handleLeave}
            />
          </div>
          <LocalPlayerHUD view={view} onAction={handleAction} />
        </div>
        <div className="hidden space-y-3 lg:block">
          <TableControls
            view={view}
            connected={connected}
            pending={pending}
            onSit={handleSit}
            onReady={handleReady}
            onStand={handleStand}
            onLeave={handleLeave}
          />
          <CashierDrawer view={view} />
        </div>
      </div>
    </div>
  )
}
