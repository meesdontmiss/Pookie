/**
 * Wager API Route
 * Creates unsigned Solana transaction for player → escrow transfer
 * Client signs and submits the transaction, then confirms via socket
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { HARDCODED_LOBBIES } from '@/shared/hardcoded-lobbies'
import EscrowService from '@/lib/escrow-service'
import { buildTransferTransaction, isValidSolanaAddress } from '@/lib/solana-utils'

const RequestSchema = z.object({
  lobbyId: z.string().min(1),
  playerPublicKey: z.string().min(32),
})

export async function POST(request: Request) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const parsed = RequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { lobbyId, playerPublicKey } = parsed.data

    // Validate Solana public key format
    if (!isValidSolanaAddress(playerPublicKey)) {
      return NextResponse.json(
        { error: 'Invalid Solana public key format' },
        { status: 400 }
      )
    }

    // Find the lobby
    const lobby = HARDCODED_LOBBIES.find((l) => l.id === lobbyId)
    if (!lobby) {
      return NextResponse.json(
        { error: 'Lobby not found' },
        { status: 404 }
      )
    }

    // Free matches don't require wagers
    if (lobby.wager === 0) {
      return NextResponse.json({
        message: 'No wager required for free matches',
        isFree: true,
        lobbyId,
      })
    }

    // Get active escrow wallet
    const escrowWallet = await EscrowService.getActiveWallet()

    console.log(`💰 Building wager transaction:`, {
      lobby: lobby.name,
      wager: lobby.wager,
      player: playerPublicKey.slice(0, 8) + '...',
      escrow: escrowWallet.publicKey.slice(0, 8) + '...',
      escrowId: escrowWallet.id,
    })

    // Build unsigned transaction
    const unsignedTransaction = await buildTransferTransaction(
      playerPublicKey,
      escrowWallet.publicKey,
      lobby.wager
    )

    return NextResponse.json({
      success: true,
      transaction: unsignedTransaction,
      escrowWallet: escrowWallet.publicKey,
      escrowId: escrowWallet.id,
      amount: lobby.wager,
      lobbyId,
      message: 'Sign this transaction to confirm your wager',
    })

  } catch (error) {
    console.error('❌ Error creating wager transaction:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      {
        error: 'Failed to create wager transaction',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to check wager requirements for a lobby
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const lobbyId = searchParams.get('lobbyId')

    if (!lobbyId) {
      return NextResponse.json(
        { error: 'lobbyId query parameter required' },
        { status: 400 }
      )
    }

    const lobby = HARDCODED_LOBBIES.find((l) => l.id === lobbyId)
    if (!lobby) {
      return NextResponse.json(
        { error: 'Lobby not found' },
        { status: 404 }
      )
    }

    const escrowWallet = await EscrowService.getActiveWallet()

    return NextResponse.json({
      lobbyId: lobby.id,
      lobbyName: lobby.name,
      wagerAmount: lobby.wager,
      isFree: lobby.wager === 0,
      escrowWallet: escrowWallet.publicKey,
      escrowId: escrowWallet.id,
    })

  } catch (error) {
    console.error('❌ Error fetching wager info:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch wager information' },
      { status: 500 }
    )
  }
}

