use anchor_lang::prelude::*;
use crate::{state::{HandReceipt, PokerTable}, PookiePokerError};

pub fn dispute_hand(ctx: Context<DisputeHand>) -> Result<()> {
    require!(
        ctx.accounts.backend_signer.key() == ctx.accounts.table.authority_backend_signer,
        PookiePokerError::Unauthorized
    );
    ctx.accounts.hand_receipt.disputed = true;
    Ok(())
}

#[derive(Accounts)]
pub struct DisputeHand<'info> {
    pub table: Account<'info, PokerTable>,
    #[account(mut)]
    pub hand_receipt: Account<'info, HandReceipt>,
    pub backend_signer: Signer<'info>,
}

