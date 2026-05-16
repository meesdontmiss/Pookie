use anchor_lang::prelude::*;
use crate::state::GlobalConfig;

pub fn initialize_global_config(
    ctx: Context<InitializeGlobalConfig>,
    default_rake_bps: u16,
    max_rake_bps: u16,
    min_table_buy_in: u64,
    max_table_buy_in: u64,
) -> Result<()> {
    let config = &mut ctx.accounts.global_config;
    config.authority = ctx.accounts.authority.key();
    config.treasury_wallet = ctx.accounts.treasury_wallet.key();
    config.rake_vault = ctx.accounts.rake_vault.key();
    config.paused = false;
    config.real_money_enabled = false;
    config.min_table_buy_in = min_table_buy_in;
    config.max_table_buy_in = max_table_buy_in;
    config.default_rake_bps = default_rake_bps;
    config.max_rake_bps = max_rake_bps;
    config.created_at = Clock::get()?.unix_timestamp;
    config.bump = ctx.bumps.global_config;
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeGlobalConfig<'info> {
    #[account(init, payer = authority, space = GlobalConfig::LEN, seeds = [b"global_config"], bump)]
    pub global_config: Account<'info, GlobalConfig>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: Treasury is configured by authority and should be multisig in production.
    pub treasury_wallet: UncheckedAccount<'info>,
    /// CHECK: Rake vault PDA or token account scaffold.
    pub rake_vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

