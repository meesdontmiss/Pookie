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
    const body = await request.json()

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
