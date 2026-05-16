'use client'

import { io, type Socket } from 'socket.io-client'
import type { PokerClientToServerEvents, PokerServerToClientEvents } from '@/shared/pookie-poker'

export type PookiePokerSocket = Socket<PokerServerToClientEvents, PokerClientToServerEvents>

let socket: PookiePokerSocket | null = null

export function getPookiePokerSocket() {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_POOKIE_POKER_SOCKET_URL || 'http://localhost:4010/pookie-poker'
    socket = io(url, {
      transports: ['websocket', 'polling'],
    })
  }
  return socket
}

