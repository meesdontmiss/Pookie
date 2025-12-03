#!/usr/bin/env node
/**
 * Simple stress harness to spawn headless clients that join lobbies,
 * ready up, and stream player state updates to exercise matchmaking +
 * match tick flows.
 *
 * Usage:
 *   STRESS_CLIENTS=10 STRESS_SOCKET_URL=http://localhost:4001 node scripts/stress-test.js
 */

const { io } = require('socket.io-client')
const pino = require('pino')

const logger = pino({ name: 'stress', level: process.env.LOG_LEVEL || 'info' })

const SOCKET_URL = process.env.STRESS_SOCKET_URL || process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4001'
const SOCKET_PATH = process.env.STRESS_SOCKET_PATH || process.env.NEXT_PUBLIC_SOCKET_PATH || '/socket.io'
const LOBBY_ID = process.env.STRESS_LOBBY_ID || 'free-test-match'
const CLIENTS = Number(process.env.STRESS_CLIENTS || 3)
const READY_DELAY_MS = Number(process.env.STRESS_READY_DELAY_MS || 3000)
const RUNTIME_MS = Number(process.env.STRESS_RUNTIME_MS || 60_000)
const STATE_INTERVAL_MS = Number(process.env.STRESS_STATE_INTERVAL_MS || 200)

let activeClients = 0
let completedClients = 0
let errors = 0

class StressClient {
  constructor(index) {
    this.index = index
    this.identity = `stress_${LOBBY_ID}_${index}_${Date.now()}`
    this.username = `Stress #${index}`
    this.socket = null
    this.matchId = null
    this.stateInterval = null
    this.running = false
  }

  log(meta, msg) {
    logger.info({ client: this.index, ...meta }, msg)
  }

  async start() {
    return new Promise((resolve) => {
      const transports = process.env.STRESS_USE_POLLING ? ['polling', 'websocket'] : ['websocket']
      this.socket = io(SOCKET_URL, {
        path: SOCKET_PATH,
        transports,
        addTrailingSlash: false,
      })

      const finish = (reason) => {
        if (this.running) {
          this.running = false
          completedClients += 1
        }
        this.log({ reason }, 'Client finished')
        if (this.stateInterval) clearInterval(this.stateInterval)
        if (this.socket && this.socket.connected) {
          this.socket.disconnect()
        }
        resolve()
      }

      this.socket.on('connect', () => {
        this.running = true
        this.log({ socketId: this.socket.id }, 'Connected')
        this.socket.emit('register_identity', this.identity)
        this.socket.emit('message', {
          type: 'join_lobby',
          lobbyId: LOBBY_ID,
          username: this.username,
          wallet: this.identity,
        } )
        setTimeout(() => {
          this.socket.emit('message', {
            type: 'set_ready',
            lobbyId: LOBBY_ID,
            ready: true,
          })
          this.log({}, 'Ready sent')
        }, READY_DELAY_MS + Math.random() * 1000)
      })

      this.socket.on('disconnect', () => {
        if (this.running) {
          errors += 1
          this.log({}, 'Unexpected disconnect')
        }
        finish('disconnect')
      })

      this.socket.on('connect_error', (err) => {
        errors += 1
        this.log({ err: err?.message }, 'Connect error')
        finish('connect_error')
      })

      this.socket.on('message', (msg) => {
        if (!msg || typeof msg !== 'object') return
        if (msg.type === 'match_start') {
          this.matchId = msg.payload?.matchId
          if (this.matchId) {
            this.log({ matchId: this.matchId }, 'Match start received')
            this.socket.emit('join_match_room', { matchSessionId: this.matchId })
            this.beginStateLoop()
          }
        }
      })

      this.socket.on('match_finished', ({ winner }) => {
        this.log({ winner }, 'Match finished event')
        finish('match_finished')
      })

      setTimeout(() => {
        if (this.running) {
          finish('timeout')
        }
      }, RUNTIME_MS)
    })
  }

  beginStateLoop() {
    if (this.stateInterval) return
    this.stateInterval = setInterval(() => {
      if (!this.socket || !this.matchId) return
      const t = Date.now() / 1000
      const radius = 5 + this.index
      const x = Math.cos(t + this.index) * radius
      const z = Math.sin(t + this.index) * radius
      const y = 1 + Math.sin(t * 1.5) * 0.25
      const rotation = [0, Math.sin(t / 2), 0, Math.cos(t / 2)]
      this.socket.emit('playerStateUpdate', {
        position: [x, y, z],
        rotation,
      })
    }, STATE_INTERVAL_MS)
  }
}

async function main() {
  logger.info({ SOCKET_URL, SOCKET_PATH, LOBBY_ID, CLIENTS }, 'Starting stress test')
  const clients = Array.from({ length: CLIENTS }).map((_, idx) => new StressClient(idx))
  activeClients = clients.length
  await Promise.all(clients.map((client) => client.start()))
  logger.info({ clients: CLIENTS, completed: completedClients, errors }, 'Stress test finished')
}

main().catch((err) => {
  logger.error({ err }, 'Stress test failed')
  process.exit(1)
})

