use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod pookie_poker {
    use super::*;

    pub fn initialize_global_config(
        ctx: Context<InitializeGlobalConfig>,
        default_rake_bps: u16,
        max_rake_bps: u16,
        min_table_buy_in: u64,
        max_table_buy_in: u64,
    ) -> Result<()> {
        instructions::initialize_global_config(
            ctx,
            default_rake_bps,
            max_rake_bps,
            min_table_buy_in,
            max_table_buy_in,
        )
    }

    pub fn create_table(
        ctx: Context<CreateTable>,
        table_id: [u8; 32],
        small_blind: u64,
        big_blind: u64,
        min_buy_in: u64,
        max_buy_in: u64,
        max_players: u8,
        rake_bps: u16,
        rake_cap: u64,
    ) -> Result<()> {
        instructions::create_table(
            ctx,
            table_id,
            small_blind,
            big_blind,
            min_buy_in,
            max_buy_in,
            max_players,
            rake_bps,
            rake_cap,
        )
    }

    pub fn buy_in(ctx: Context<BuyIn>, amount: u64) -> Result<()> {
        instructions::buy_in(ctx, amount)
    }

    pub fn settle_hand(
        ctx: Context<SettleHand>,
        hand_number: u64,
        action_log_hash: [u8; 32],
        deck_commitment: [u8; 32],
        randomness_proof_hash: [u8; 32],
        result_hash: [u8; 32],
        rake_amount: u64,
    ) -> Result<()> {
        instructions::settle_hand(
            ctx,
            hand_number,
            action_log_hash,
            deck_commitment,
            randomness_proof_hash,
            result_hash,
            rake_amount,
        )
    }

    pub fn request_cash_out(ctx: Context<RequestCashOut>, amount: u64) -> Result<()> {
        instructions::request_cash_out(ctx, amount)
    }

    pub fn emergency_pause(ctx: Context<EmergencyPause>, paused: bool) -> Result<()> {
        instructions::emergency_pause(ctx, paused)
    }

    pub fn dispute_hand(ctx: Context<DisputeHand>) -> Result<()> {
        instructions::dispute_hand(ctx)
    }
}

#[error_code]
pub enum PookiePokerError {
    #[msg("Pookie Poker is paused")]
    Paused,
    #[msg("Real-money poker is disabled")]
    RealMoneyDisabled,
    #[msg("Rake exceeds max rake")]
    RakeTooHigh,
    #[msg("Buy-in outside configured limits")]
    InvalidBuyIn,
    #[msg("Unauthorized signer")]
    Unauthorized,
}

