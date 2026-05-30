/**
 * Solana RPC Proxy
 * Proxies JSON-RPC requests to Helius so the API key is never exposed to the client.
 * Client should call /api/rpc instead of the raw Helius URL.
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const HELIUS_API_KEY = process.env.HELIUS_API_KEY
const RPC_URL =
  process.env.SOLANA_RPC_URL ||
  (HELIUS_API_KEY
    ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
    : 'https://api.mainnet-beta.solana.com')

// Allowed browser origins (prevents other sites from burning the paid RPC key).
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || process.env.NEXT_PUBLIC_APP_URL || 'https://www.pookiethepeng.com')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)
  .concat(process.env.NODE_ENV !== 'production' ? ['http://localhost:3000', 'http://localhost:3001'] : [])

// Reject oversized payloads outright (raw JSON-RPC bodies are tiny).
const MAX_BODY_BYTES = 100 * 1024

function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  // Same-origin browser GET/POST may omit Origin; only block cross-origin mismatches.
  if (!origin) return true
  return ALLOWED_ORIGINS.includes(origin)
}

// Allowed JSON-RPC methods (whitelist to prevent abuse)
const ALLOWED_METHODS = new Set([
  'getLatestBlockhash',
  'getBalance',
  'getTransaction',
  'getSignatureStatuses',
  'sendTransaction',
  'simulateTransaction',
  'getAccountInfo',
  'getSlot',
  'getBlockHeight',
  'getFeeForMessage',
])

export async function POST(request: Request) {
  try {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 })
    }

    const contentLength = Number(request.headers.get('content-length') || '0')
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }

    const raw = await request.text()
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }
    const body = JSON.parse(raw)

    // Validate JSON-RPC method is allowed
    const method = body?.method
    if (!method || !ALLOWED_METHODS.has(method)) {
      return NextResponse.json(
        { error: `Method not allowed: ${method}` },
        { status: 403 }
      )
    }

    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('RPC proxy error:', error)
    return NextResponse.json(
      { error: 'RPC proxy request failed' },
      { status: 500 }
    )
  }
}
