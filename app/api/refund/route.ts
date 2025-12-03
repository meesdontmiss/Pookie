/**
 * Refund API
 * Sends SOL back from escrow to a player (admin/server-only)
 * Secured via x-payout-secret (same secret used for payouts)
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { refundFromEscrow } from '@/lib/refund-service'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  escrowPublicKey: z.string().min(32),
  playerPublicKey: z.string().min(32),
  amountSol: z.number().positive(),
})

export async function POST(request: Request) {
  try {
    const secretHeader = request.headers.get('x-payout-secret') || request.headers.get('X-Payout-Secret')
    const payoutSecret = process.env.PAYOUT_SERVER_SECRET
    if (!payoutSecret) {
      return NextResponse.json({ error: 'Server not configured (missing PAYOUT_SERVER_SECRET)' }, { status: 500 })
    }
    if (secretHeader !== payoutSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
    }

    const result = await refundFromEscrow(parsed.data)
    return NextResponse.json({ ok: true, signature: result.signature })
  } catch (error) {
    console.error('❌ Refund error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


