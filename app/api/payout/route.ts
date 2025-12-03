/**
 * Payout API
 * Sends SOL from escrow wallet to winner and house.
 * Secured by PAYOUT_SERVER_SECRET via x-payout-secret header.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { payoutFromEscrow } from '@/lib/payout-service'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  matchId: z.string().optional(),
  escrowPublicKey: z.string().min(32),
  winnerPublicKey: z.string().min(32),
  totalPotSol: z.number().positive(),
  houseCutPercentage: z.number().min(0).max(0.99).optional(),
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
    const { matchId, escrowPublicKey, winnerPublicKey, totalPotSol } = parsed.data

    const adminWallet = process.env.NEXT_PUBLIC_ADMIN_WALLET || process.env.ADMIN_WALLET
    if (!adminWallet) {
      return NextResponse.json({ error: 'Missing admin wallet env (NEXT_PUBLIC_ADMIN_WALLET or ADMIN_WALLET)' }, { status: 500 })
    }

    const houseCutPercentage =
      typeof parsed.data.houseCutPercentage === 'number'
        ? parsed.data.houseCutPercentage
        : Number(process.env.HOUSE_CUT_PERCENTAGE ?? '0.04')

    const result = await payoutFromEscrow({
      escrowPublicKey,
      winnerPublicKey,
      totalPotSol,
      adminWalletPublicKey: adminWallet,
      houseCutPercentage,
    })

    return NextResponse.json({
      ok: true,
      matchId: matchId || null,
      signature: result.signature,
      winnerAmountSol: result.winnerAmountSol,
      houseAmountSol: result.houseAmountSol,
    })
  } catch (error) {
    console.error('❌ Payout error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


