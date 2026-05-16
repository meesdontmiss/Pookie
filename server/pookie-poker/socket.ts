import type { Server, Socket } from 'socket.io'
import type { PokerClientToServerEvents, PokerServerToClientEvents, PokerTableConfig } from '../../shared/pookie-poker'
import { PokerActionPayloadSchema, PokerTableConfigSchema } from '../../shared/pookie-poker'
import { PookiePokerTableManager } from './table-manager'

type PokerSocket = Socket<PokerClientToServerEvents, PokerServerToClientEvents>

export function registerPookiePokerNamespace(io: Server, manager = new PookiePokerTableManager()) {
  const namespace = io.of('/pookie-poker')

  namespace.on('connection', (socket: PokerSocket) => {
    socket.on('table:list', (_payload, ack) => {
      ack?.({ ok: true, data: { tables: manager.listTables() } })
    })

    socket.on('table:create', async (payload, ack) => {
      try {
        const config = PokerTableConfigSchema.parse(payload.config) as PokerTableConfig
        const data = manager.createTable(config)
        ack?.({ ok: true, data })
        broadcastTableList(namespace, manager)
      } catch (error) {
        ack?.(failure(error))
      }
    })

    socket.on('table:join', async (payload, ack) => {
      try {
        await socket.join(`table:${payload.tableId}`)
        socket.data.wallet = payload.wallet
        socket.data.tableId = payload.tableId
        const view = manager.join(payload.tableId, payload.wallet, payload.displayName)
        ack?.({ ok: true, data: view })
        socket.emit('table:state', view)
        socket.to(`table:${payload.tableId}`).emit('table:player_joined', {
          tableId: payload.tableId,
          wallet: payload.wallet,
          displayName: view.me?.displayName ?? payload.wallet,
        })
        broadcastFiltered(namespace, manager, payload.tableId)
        broadcastTableList(namespace, manager)
      } catch (error) {
        ack?.(failure(error))
      }
    })

    socket.on('table:leave', async (payload, ack) => {
      try {
        const wallet = requireWallet(socket)
        manager.leave(payload.tableId, wallet)
        await socket.leave(`table:${payload.tableId}`)
        ack?.({ ok: true })
        socket.to(`table:${payload.tableId}`).emit('table:player_left', { tableId: payload.tableId, wallet })
        broadcastFiltered(namespace, manager, payload.tableId)
        broadcastTableList(namespace, manager)
      } catch (error) {
        ack?.(failure(error))
      }
    })

    socket.on('table:sit', async (payload, ack) => {
      try {
        const wallet = requireWallet(socket)
        const view = await manager.withTableLock(payload.tableId, () =>
          manager.sit(payload.tableId, wallet, payload.seatIndex, BigInt(payload.buyInLamports)),
        )
        ack?.({ ok: true, data: view })
        broadcastFiltered(namespace, manager, payload.tableId)
        broadcastTableList(namespace, manager)
      } catch (error) {
        ack?.(failure(error))
      }
    })

    socket.on('table:stand', async (payload, ack) => {
      try {
        const wallet = requireWallet(socket)
        const view = await manager.withTableLock(payload.tableId, () => manager.stand(payload.tableId, wallet))
        ack?.({ ok: true, data: view })
        broadcastFiltered(namespace, manager, payload.tableId)
        broadcastTableList(namespace, manager)
      } catch (error) {
        ack?.(failure(error))
      }
    })

    socket.on('hand:ready', async (payload, ack) => {
      try {
        const wallet = requireWallet(socket)
        const view = await manager.withTableLock(payload.tableId, () => manager.ready(payload.tableId, wallet))
        ack?.({ ok: true, data: view })
        broadcastFiltered(namespace, manager, payload.tableId)
        broadcastTableList(namespace, manager)
      } catch (error) {
        ack?.(failure(error))
      }
    })

    const registerAction = (event: keyof Pick<PokerClientToServerEvents, 'action:fold' | 'action:check' | 'action:call' | 'action:bet' | 'action:raise' | 'action:allin'>, action: Parameters<PookiePokerTableManager['action']>[2]) => {
      socket.on(event, async (payload, ack) => {
        try {
          const wallet = requireWallet(socket)
          const parsed = PokerActionPayloadSchema.parse(payload)
          const view = await manager.withTableLock(parsed.tableId, () =>
            manager.action(parsed.tableId, wallet, action, parsed.amountLamports ? BigInt(parsed.amountLamports) : 0n),
          )
          ack?.({ ok: true, data: view })
          namespace.to(`table:${parsed.tableId}`).emit('hand:action_broadcast', {
            tableId: parsed.tableId,
            wallet,
            action,
            amountLamports: parsed.amountLamports,
          })
          broadcastFiltered(namespace, manager, parsed.tableId)
          broadcastTableList(namespace, manager)
        } catch (error) {
          ack?.(failure(error))
        }
      })
    }

    registerAction('action:fold', 'fold')
    registerAction('action:check', 'check')
    registerAction('action:call', 'call')
    registerAction('action:bet', 'bet')
    registerAction('action:raise', 'raise')
    registerAction('action:allin', 'allin')

    socket.on('reconnect:resume', async (payload, ack) => {
      try {
        await socket.join(`table:${payload.tableId}`)
        socket.data.wallet = payload.wallet
        socket.data.tableId = payload.tableId
        const view = manager.join(payload.tableId, payload.wallet)
        ack?.({ ok: true, data: view })
        socket.emit('table:state', view)
      } catch (error) {
        ack?.(failure(error))
      }
    })

    socket.on('disconnect', () => {
      const wallet = socket.data.wallet
      const tableId = socket.data.tableId
      if (wallet && tableId) {
        manager.leave(tableId, wallet)
        broadcastFiltered(namespace, manager, tableId)
        broadcastTableList(namespace, manager)
      }
    })
  })

  return namespace
}

async function broadcastFiltered(namespace: ReturnType<Server['of']>, manager: PookiePokerTableManager, tableId: string) {
  const sockets = await namespace.in(`table:${tableId}`).fetchSockets()
  for (const socket of sockets) {
    const wallet = socket.data.wallet as string | undefined
    socket.emit('table:state', manager.viewFor(tableId, wallet))
  }
}

function broadcastTableList(namespace: ReturnType<Server['of']>, manager: PookiePokerTableManager) {
  namespace.emit('table:list_update', { tables: manager.listTables() })
}

function requireWallet(socket: PokerSocket) {
  const wallet = socket.data.wallet as string | undefined
  if (!wallet) throw new Error('Wallet identity required')
  return wallet
}

function failure(error: unknown) {
  return {
    ok: false,
    error: {
      code: 'POOKIE_POKER_ERROR',
      message: error instanceof Error ? error.message : 'Unknown poker error',
    },
  }
}
