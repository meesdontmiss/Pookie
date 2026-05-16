use anchor_lang::prelude::*;
use crate::state::{PlayerTableBalance, PokerTable};

pub fn buy_in(ctx: Context<BuyIn>, amount: u64) -> Result<()> {
    let table = &mut ctx.accounts.table;
    let balance = &mut ctx.accounts.player_balance;
    balance.table_id = table.table_id;
    balance.player = ctx.accounts.player.key();
    balance.deposited_amount = balance.deposited_amount.saturating_add(amount);
    balance.active_stack = balance.active_stack.saturating_add(amount);
    balance.last_action_at = Clock::get()?.unix_timestamp;
    balance.bump = ctx.bumps.player_balance;
    table.total_deposited = table.total_deposited.saturating_add(amount);
    Ok(())
}

#[derive(Accounts)]
pub struct BuyIn<'info> {
    #[account(mut)]
    pub table: Account<'info, PokerTable>,
    #[account(
        init_if_needed,
        payer = player,
        space = PlayerTableBalance::LEN,
        seeds = [b"player_balance", table.table_id.as_ref(), player.key().as_ref()],
        bump
    )]
    pub player_balance: Account<'info, PlayerTableBalance>,
    #[account(mut)]
    pub player: Signer<'info>,
    /// CHECK: Table vault transfer plumbing is added in devnet phase.
    pub table_vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

