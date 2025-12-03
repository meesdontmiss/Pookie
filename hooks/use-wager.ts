/**
 * Wager Hook - Handles wager transaction creation and signing
 */

'use client'

import { useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Transaction } from '@solana/web3.js'

export interface WagerState {
  isLoading: boolean
  error: string | null
  transaction: string | null
  escrowWallet: string | null
  amount: number | null
}

export function useWager() {
  const { connection } = useConnection()
  const { publicKey, signTransaction } = useWallet()
  const [state, setState] = useState<WagerState>({
    isLoading: false,
    error: null,
    transaction: null,
    escrowWallet: null,
    amount: null,
  })

  /**
   * Request wager transaction from API
   */
  const requestWager = async (lobbyId: string) => {
    if (!publicKey) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }))
      return null
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch('/api/wager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lobbyId,
          playerPublicKey: publicKey.toString(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create wager transaction')
      }

      // Free lobby - no wager needed
      if (data.isFree) {
        setState(prev => ({ ...prev, isLoading: false }))
        return { isFree: true, signature: null }
      }

      setState(prev => ({
        ...prev,
        transaction: data.transaction,
        escrowWallet: data.escrowWallet,
        amount: data.amount,
      }))

      return data

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }))
      return null
    }
  }

  /**
   * Sign and send the wager transaction
   */
  const signAndSendWager = async () => {
    if (!publicKey || !signTransaction) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }))
      return null
    }

    if (!state.transaction) {
      setState(prev => ({ ...prev, error: 'No transaction to sign' }))
      return null
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Deserialize transaction
      const transactionBuffer = Buffer.from(state.transaction, 'base64')
      const transaction = Transaction.from(transactionBuffer)

      // Sign transaction
      const signedTransaction = await signTransaction(transaction)

      // Send transaction
      const signature = await connection.sendRawTransaction(
        signedTransaction.serialize(),
        {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        }
      )

      console.log('💰 Wager transaction sent:', signature)

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, 'confirmed')

      if (confirmation.value.err) {
        throw new Error('Transaction failed: ' + JSON.stringify(confirmation.value.err))
      }

      console.log('✅ Wager transaction confirmed:', signature)

      setState(prev => ({ ...prev, isLoading: false }))

      return {
        signature,
        amount: state.amount,
        escrowWallet: state.escrowWallet,
      }

    } catch (error) {
      console.error('❌ Wager transaction error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Transaction failed'
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }))
      return null
    }
  }

  /**
   * Combined flow: request + sign + send
   */
  const executeWager = async (lobbyId: string) => {
    const wagerData = await requestWager(lobbyId)
    
    if (!wagerData) return null
    if (wagerData.isFree) return { isFree: true, signature: null }

    const result = await signAndSendWager()
    return result
  }

  const reset = () => {
    setState({
      isLoading: false,
      error: null,
      transaction: null,
      escrowWallet: null,
      amount: null,
    })
  }

  return {
    ...state,
    requestWager,
    signAndSendWager,
    executeWager,
    reset,
  }
}

