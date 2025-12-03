/**
 * Escrow Service - Manages rotating escrow wallets for match wagers
 * Pattern from Cock Combat with Solana-specific implementation
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)!
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)!

export interface EscrowWallet {
  id: 'A' | 'B'
  publicKey: string
}

export class EscrowService {
  private static supabase = createClient(supabaseUrl, supabaseServiceKey)

  /**
   * Get the currently active escrow wallet
   */
  static async getActiveWallet(): Promise<EscrowWallet> {
    const { data, error } = await this.supabase
      .from('escrow_state')
      .select('active_wallet, wallet_a, wallet_b')
      .single()

    if (error || !data) {
      throw new Error('Failed to fetch escrow state: ' + error?.message)
    }

    const isA = data.active_wallet === 'A'
    return {
      id: isA ? 'A' : 'B',
      publicKey: isA ? data.wallet_a : data.wallet_b,
    }
  }

  /**
   * Rotate to the other escrow wallet
   * Call this after a match completes and payout is processed
   */
  static async rotateWallet(): Promise<EscrowWallet> {
    const { data: current } = await this.supabase
      .from('escrow_state')
      .select('active_wallet, wallet_a, wallet_b')
      .single()

    if (!current) {
      throw new Error('No escrow state found')
    }

    const newActive = current.active_wallet === 'A' ? 'B' : 'A'

    const { error } = await this.supabase
      .from('escrow_state')
      .update({
        active_wallet: newActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)

    if (error) {
      throw new Error('Failed to rotate escrow wallet: ' + error.message)
    }

    console.log(`🔄 Rotated escrow wallet: ${current.active_wallet} → ${newActive}`)

    return {
      id: newActive,
      publicKey: newActive === 'A' ? current.wallet_a : current.wallet_b,
    }
  }

  /**
   * Get both escrow wallet addresses (for admin purposes)
   */
  static async getAllWallets(): Promise<{ walletA: string; walletB: string; active: 'A' | 'B' }> {
    const { data, error } = await this.supabase
      .from('escrow_state')
      .select('active_wallet, wallet_a, wallet_b')
      .single()

    if (error || !data) {
      throw new Error('Failed to fetch escrow wallets')
    }

    return {
      walletA: data.wallet_a,
      walletB: data.wallet_b,
      active: data.active_wallet as 'A' | 'B',
    }
  }

  /**
   * Manually set the active wallet (admin only)
   */
  static async setActiveWallet(walletId: 'A' | 'B'): Promise<void> {
    const { error } = await this.supabase
      .from('escrow_state')
      .update({
        active_wallet: walletId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)

    if (error) {
      throw new Error('Failed to set active wallet: ' + error.message)
    }

    console.log(`✅ Manually set escrow wallet to: ${walletId}`)
  }

  /**
   * Update escrow wallet addresses (admin only - use with caution!)
   */
  static async updateWalletAddresses(walletA: string, walletB: string): Promise<void> {
    const { error } = await this.supabase
      .from('escrow_state')
      .update({
        wallet_a: walletA,
        wallet_b: walletB,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)

    if (error) {
      throw new Error('Failed to update wallet addresses: ' + error.message)
    }

    console.log('✅ Updated escrow wallet addresses')
  }
}

export default EscrowService

