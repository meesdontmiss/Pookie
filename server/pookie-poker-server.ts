import http from 'http'
import { Server } from 'socket.io'
import { registerPookiePokerNamespace } from './pookie-poker/socket'
import { PookiePokerTableManager } from './pookie-poker/table-manager'

const manager = new PookiePokerTableManager()

const server = http.createServer((req, res) => {
  const url = req.url ?? '/'
  res.setHeader('content-type', 'application/json')
  if (url === '/health') {
    res.end(
      JSON.stringify({
        ok: true,
        module: 'pookie-poker',
        realMoneyEnabled: false,
        tables: manager.listTables().length,
      }),
    )
    return
  }
  if (url === '/pookie-poker/tables') {
    res.end(JSON.stringify({ tables: manager.listTables() }))
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
