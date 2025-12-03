/**
 * Refund Service - Sends SOL back from escrow wallet to player
 */

import { Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { getSolanaConnection, solToLamports } from './solana-utils'

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

export interface RefundParams {
  escrowPublicKey: string
  playerPublicKey: string
  amountSol: number
}

export async function refundFromEscrow(params: RefundParams) {
  const { escrowPublicKey, playerPublicKey, amountSol } = params
  if (amountSol <= 0) throw new Error('amountSol must be > 0')

  const connection = getSolanaConnection()
  const escrowPub = new PublicKey(escrowPublicKey)
  const playerPub = new PublicKey(playerPublicKey)
  const signer = getEscrowKeypairForPublicKey(escrowPublicKey)

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  const tx = new Transaction({
    feePayer: escrowPub,
    blockhash,
    lastValidBlockHeight,
  }).add(
    SystemProgram.transfer({
      fromPubkey: escrowPub,
      toPubkey: playerPub,
      lamports: solToLamports(amountSol),
    })
  )

  tx.sign(signer)

  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  })

  const confirmation = await connection.confirmTransaction(signature, 'confirmed')
  if (confirmation.value.err) {
    throw new Error('Refund transaction failed: ' + JSON.stringify(confirmation.value.err))
  }

  return { signature }
}


