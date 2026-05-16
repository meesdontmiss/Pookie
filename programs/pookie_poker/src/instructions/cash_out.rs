use anchor_lang::prelude::*;
use crate::state::{PlayerTableBalance, PokerTable};

pub fn request_cash_out(ctx: Context<RequestCashOut>, amount: u64) -> Result<()> {
    let table = &mut ctx.accounts.table;
    let balance = &mut ctx.accounts.player_balance;
    balance.active_stack = balance.active_stack.saturating_sub(amount);
    balance.withdrawable_amount = balance.withdrawable_amount.saturating_sub(amount);
    table.total_withdrawn = table.total_withdrawn.saturating_add(amount);
    Ok(())
}

#[derive(Accounts)]
pub struct RequestCashOut<'info> {
    #[account(mut)]
    pub table: Account<'info, PokerTable>,
    #[account(mut, seeds = [b"player_balance", table.table_id.as_ref(), player.key().as_ref()], bump = player_balance.bump)]
    pub player_balance: Account<'info, PlayerTableBalance>,
    #[account(mut)]
    pub player: Signer<'info>,
    /// CHECK: Table vault transfer plumbing is added in devnet phase.
    pub table_vault: UncheckedAccount<'info>,
}

