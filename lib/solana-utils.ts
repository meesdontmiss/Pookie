/**
 * Solana Utilities - Transaction building and signing helpers
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
} from '@solana/web3.js'

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'

/**
 * Get Solana connection
 */
export function getSolanaConnection(): Connection {
  return new Connection(RPC_URL, 'confirmed')
}

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol: number): number {
  return Math.round(sol * LAMPORTS_PER_SOL)
}

/**
 * Convert lamports to SOL
 */
export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL
}

/**
 * Build an unsigned transfer transaction
 * Player will sign this on the client side
 */
export async function buildTransferTransaction(
  fromPubkey: string,
  toPubkey: string,
  amountSol: number
): Promise<string> {
  const connection = getSolanaConnection()
  
  const fromPublicKey = new PublicKey(fromPubkey)
  const toPublicKey = new PublicKey(toPubkey)
  const lamports = solToLamports(amountSol)

  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')

  // Create transfer instruction
  const transferInstruction = SystemProgram.transfer({
    fromPubkey: fromPublicKey,
    toPubkey: toPublicKey,
    lamports,
  })

  // Build transaction
  const transaction = new Transaction({
    feePayer: fromPublicKey,
    blockhash,
    lastValidBlockHeight,
  }).add(transferInstruction)

  // Serialize to base64 for client to sign
  const serialized = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  })

  return serialized.toString('base64')
}

/**
 * Verify a transaction signature exists on-chain
 */
export async function verifyTransaction(signature: string): Promise<boolean> {
  try {
    const connection = getSolanaConnection()
    const status = await connection.getSignatureStatus(signature, {
      searchTransactionHistory: true,
    })

    return status?.value?.confirmationStatus === 'confirmed' || 
           status?.value?.confirmationStatus === 'finalized'
  } catch (error) {
    console.error('Error verifying transaction:', error)
    return false
  }
}

/**
 * Get wallet balance in SOL
 */
export async function getWalletBalance(publicKey: string): Promise<number> {
  try {
    const connection = getSolanaConnection()
    const pubKey = new PublicKey(publicKey)
    const balance = await connection.getBalance(pubKey)
    return lamportsToSol(balance)
  } catch (error) {
    console.error('Error fetching balance:', error)
    return 0
  }
}

/**
 * Validate Solana public key format
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address)
    return true
  } catch {
    return false
  }
}

/**
 * Get transaction details
 */
export async function getTransactionDetails(signature: string) {
  try {
    const connection = getSolanaConnection()
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    })
    return tx
  } catch (error) {
    console.error('Error fetching transaction:', error)
    return null
  }
}

