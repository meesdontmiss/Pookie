use anchor_lang::prelude::*;
use crate::{state::{GlobalConfig, PokerTable}, PookiePokerError};

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
    let config = &ctx.accounts.global_config;
    require!(!config.paused, PookiePokerError::Paused);
    require!(!config.real_money_enabled, PookiePokerError::RealMoneyDisabled);
    require!(rake_bps <= config.max_rake_bps, PookiePokerError::RakeTooHigh);
    require!(
        min_buy_in >= config.min_table_buy_in && max_buy_in <= config.max_table_buy_in && min_buy_in <= max_buy_in,
        PookiePokerError::InvalidBuyIn
    );

    let table = &mut ctx.accounts.table;
    table.table_id = table_id;
    table.creator = ctx.accounts.creator.key();
    table.status = 0;
    table.currency_mint = ctx.accounts.currency_mint.key();
    table.small_blind = small_blind;
    table.big_blind = big_blind;
    table.min_buy_in = min_buy_in;
    table.max_buy_in = max_buy_in;
    table.max_players = max_players;
    table.rake_bps = rake_bps;
    table.rake_cap = rake_cap;
    table.total_deposited = 0;
    table.total_withdrawn = 0;
    table.total_rake_collected = 0;
    table.hand_counter = 0;
    table.created_at = Clock::get()?.unix_timestamp;
    table.closed_at = 0;
    table.authority_backend_signer = ctx.accounts.backend_signer.key();
    table.bump = ctx.bumps.table;
    Ok(())
}

#[derive(Accounts)]
#[instruction(table_id: [u8; 32])]
pub struct CreateTable<'info> {
    #[account(mut, seeds = [b"global_config"], bump = global_config.bump)]
    pub global_config: Account<'info, GlobalConfig>,
    #[account(init, payer = creator, space = PokerTable::LEN, seeds = [b"table", table_id.as_ref()], bump)]
    pub table: Account<'info, PokerTable>,
    #[account(mut)]
    pub creator: Signer<'info>,
    /// CHECK: Currency mint validation will be added with allowed mint registry.
    pub currency_mint: UncheckedAccount<'info>,
    /// CHECK: Backend signer has limited table authority only.
    pub backend_signer: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

