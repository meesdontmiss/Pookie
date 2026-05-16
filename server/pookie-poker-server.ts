import http from 'http'
import { Server } from 'socket.io'
import { registerPookiePokerNamespace } from './pookie-poker/socket'
import { PookiePokerTableManager } from './pookie-poker/table-manager'
import { buildAdminSnapshot } from './pookie-poker/admin'
import { evaluatePokerCompliance } from './pookie-poker/compliance'

const manager = new PookiePokerTableManager()
const realMoneyEnabled = () => process.env.POOKIE_POKER_REAL_MONEY_ENABLED === 'true'

const server = http.createServer((req, res) => {
  const url = req.url ?? '/'
  res.setHeader('content-type', 'application/json')
  if (url === '/health') {
    res.end(
      JSON.stringify({
        ok: true,
        module: 'pookie-poker',
        realMoneyEnabled: realMoneyEnabled(),
        custodyModel: realMoneyEnabled() ? 'backend_hot_cold_wallets' : 'play_money',
        smartContractsEnabled: false,
        database: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || process.env.POOKIE_POKER_DATABASE_URL ? 'neon' : 'memory',
        tables: manager.listTables().length,
      }),
    )
    return
  }
  if (url === '/pookie-poker/tables') {
    res.end(JSON.stringify({ tables: manager.listTables() }))
    return
  }
  if (url === '/pookie-poker/admin/snapshot') {
    res.end(JSON.stringify(buildAdminSnapshot(manager.listTables())))
    return
  }
  if (url === '/pookie-poker/compliance/play-money-check') {
    res.end(
      JSON.stringify(
        evaluatePokerCompliance({
          wallet: 'anonymous',
          tableType: 'public',
          realMoneyRequested: false,
        }),
      ),
    )
    return
  }
  if (url === '/pookie-poker/custody/config') {
    res.end(
      JSON.stringify({
        model: realMoneyEnabled() ? 'backend_custody' : 'play_money',
        smartContractsEnabled: false,
        hotWalletAddressConfigured: Boolean(process.env.POOKIE_POKER_HOT_WALLET_ADDRESS),
        coldWalletAddressConfigured: Boolean(process.env.POOKIE_POKER_COLD_WALLET_ADDRESS),
        rakeWalletAddressConfigured: Boolean(process.env.POOKIE_POKER_RAKE_WALLET_ADDRESS),
        neonConfigured: Boolean(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || process.env.POOKIE_POKER_DATABASE_URL),
      }),
    )
    return
  }
  res.statusCode = 404
  res.end(JSON.stringify({ ok: false, error: 'Not found' }))
})
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
})

registerPookiePokerNamespace(io, manager)

const PORT = Number(process.env.POOKIE_POKER_PORT || process.env.PORT || 4010)
server.listen(PORT, () => {
  console.log(`pookie poker socket listening on ${PORT}`)
})
