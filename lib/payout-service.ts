/**
 * Payout Service - Sends SOL from escrow wallet to winner and house
 */

import { Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { getSolanaConnection, solToLamports } from './solana-utils'

function getEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env: ${name}`)
  return v
}

function getEscrowKeypairForPublicKey(escrowPublicKey: string): Keypair {
  const aPub = process.env.ESCROW_WALLET_A_PUBLIC_KEY
  const aPriv = process.env.ESCROW_WALLET_A_PRIVATE_KEY
  const bPub = process.env.ESCROW_WALLET_B_PUBLIC_KEY
  const bPriv = process.env.ESCROW_WALLET_B_PRIVATE_KEY

  const target = escrowPublicKey.trim()

  if (aPub && aPriv && aPub.trim() === target) {
    const secret = Buffer.from(aPriv.trim(), 'base64')
    return Keypair.fromSecretKey(new Uint8Array(secret))
  }
  if (bPub && bPriv && bPub.trim() === target) {
    const secret = Buffer.from(bPriv.trim(), 'base64')
    return Keypair.fromSecretKey(new Uint8Array(secret))
  }

  throw new Error('Escrow private key not found for provided public key')
}

export interface PayoutParams {
  escrowPublicKey: string
  winnerPublicKey: string
  totalPotSol: number
  adminWalletPublicKey: string
  houseCutPercentage: number
}

export async function payoutFromEscrow(params: PayoutParams) {
  const { escrowPublicKey, winnerPublicKey, totalPotSol, adminWalletPublicKey, houseCutPercentage } = params

  if (totalPotSol <= 0) throw new Error('totalPotSol must be > 0')
  if (houseCutPercentage < 0 || houseCutPercentage >= 1) throw new Error('houseCutPercentage must be in [0,1)')

  const winnerAmountSol = Number((totalPotSol * (1 - houseCutPercentage)).toFixed(9))
  const houseAmountSol = Number((totalPotSol * houseCutPercentage).toFixed(9))

  const escrowPub = new PublicKey(escrowPublicKey)
  const winnerPub = new PublicKey(winnerPublicKey)
  const adminPub = new PublicKey(adminWalletPublicKey)

  const connection = getSolanaConnection()
  const signer = getEscrowKeypairForPublicKey(escrowPublicKey)

  // Build atomic transaction with two transfers (winner + house)
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  const tx = new Transaction({
    feePayer: escrowPub,
    blockhash,
    lastValidBlockHeight,
  })
    .add(
      SystemProgram.transfer({
        fromPubkey: escrowPub,
        toPubkey: winnerPub,
        lamports: solToLamports(winnerAmountSol),
      })
    )
    .add(
      SystemProgram.transfer({
        fromPubkey: escrowPub,
        toPubkey: adminPub,
        lamports: solToLamports(houseAmountSol),
      })
    )

  tx.sign(signer)

  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  })

  const confirmation = await connection.confirmTransaction(signature, 'confirmed')
  if (confirmation.value.err) {
    throw new Error('Payout transaction failed: ' + JSON.stringify(confirmation.value.err))
  }

  return {
    signature,
    winnerAmountSol,
    houseAmountSol,
  }
}


