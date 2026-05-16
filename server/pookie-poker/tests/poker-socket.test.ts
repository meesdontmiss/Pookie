import assert from 'node:assert/strict'
import http from 'http'
import type { AddressInfo } from 'net'
import { io as clientIo, type Socket as ClientSocket } from 'socket.io-client'
import { Server } from 'socket.io'
import { registerPookiePokerNamespace } from '../socket'
import { PookiePokerTableManager } from '../table-manager'

type Ack<T = any> = { ok: boolean; data?: T; error?: { message: string } }

async function main() {
  const httpServer = http.createServer()
  const io = new Server(httpServer, { cors: { origin: '*' } })
  registerPookiePokerNamespace(io, new PookiePokerTableManager(true))

  await new Promise<void>((resolve) => httpServer.listen(0, resolve))
  const address = httpServer.address()
  assert.equal(typeof address, 'object')
  const port = (address as AddressInfo).port
  const url = `http://127.0.0.1:${port}/pookie-poker`

  const a = await connect(url)
  const b = await connect(url)
  const spectator = await connect(url)

  try {
    const list = await emit(a, 'table:list')
    assert.equal(list.ok, true)
    assert.equal(list.data.tables.length >= 1, true)

    await emit(a, 'table:join', { tableId: 'neon-rooftop-1', wallet: 'qa-a', displayName: 'QA A' })
    await emit(a, 'table:sit', { tableId: 'neon-rooftop-1', seatIndex: 0, buyInLamports: '200000000' })
    await emit(b, 'table:join', { tableId: 'neon-rooftop-1', wallet: 'qa-b', displayName: 'QA B' })
    await emit(b, 'table:sit', { tableId: 'neon-rooftop-1', seatIndex: 1, buyInLamports: '200000000' })
    await emit(spectator, 'table:join', { tableId: 'neon-rooftop-1', wallet: 'qa-spectator', displayName: 'Rail' })

    await emit(a, 'hand:ready', { tableId: 'neon-rooftop-1' })
    const started = await emit(b, 'hand:ready', { tableId: 'neon-rooftop-1' })
    assert.equal(started.ok, true)
    assert.equal(started.data.status, 'active')

    const aView = await emit(a, 'reconnect:resume', { tableId: 'neon-rooftop-1', wallet: 'qa-a' })
    const bView = await emit(b, 'reconnect:resume', { tableId: 'neon-rooftop-1', wallet: 'qa-b' })
    const railView = await emit(spectator, 'reconnect:resume', { tableId: 'neon-rooftop-1', wallet: 'qa-spectator' })

    assert.equal(aView.data.me.holeCards.length, 2)
    assert.equal(bView.data.me.holeCards.length, 2)
    assert.equal(JSON.stringify(aView.data.players).includes('holeCards'), false)
    assert.equal(JSON.stringify(railView.data).includes('holeCards'), false)

    const wrongActor = aView.data.currentTurnSeat === 0 ? b : a
    const rejected = await emit(wrongActor, 'action:check', { tableId: 'neon-rooftop-1' })
    assert.equal(rejected.ok, false)
    assert.match(rejected.error?.message ?? '', /out of turn|Cannot check/)

    console.log('ok - websocket privacy and turn validation')
  } finally {
    a.disconnect()
    b.disconnect()
    spectator.disconnect()
    io.close()
    httpServer.close()
  }
}

function connect(url: string): Promise<ClientSocket> {
  const socket = clientIo(url, { transports: ['websocket'], forceNew: true })
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('socket connect timeout')), 5000)
    socket.once('connect', () => {
      clearTimeout(timer)
      resolve(socket)
    })
    socket.once('connect_error', reject)
  })
}

function emit(socket: ClientSocket, event: string, payload?: unknown): Promise<Ack> {
  return new Promise((resolve) => {
    socket.emit(event, payload, resolve)
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
