use anchor_lang::prelude::*;
use crate::{state::{HandReceipt, PokerTable}, PookiePokerError};

pub fn settle_hand(
    ctx: Context<SettleHand>,
    hand_number: u64,
    action_log_hash: [u8; 32],
    deck_commitment: [u8; 32],
    randomness_proof_hash: [u8; 32],
    result_hash: [u8; 32],
    rake_amount: u64,
) -> Result<()> {
    let table = &mut ctx.accounts.table;
    require!(
        ctx.accounts.backend_signer.key() == table.authority_backend_signer,
        PookiePokerError::Unauthorized
    );
    require!(rake_amount <= table.rake_cap, PookiePokerError::RakeTooHigh);
    let receipt = &mut ctx.accounts.hand_receipt;
    receipt.table_id = table.table_id;
    receipt.hand_number = hand_number;
    receipt.deck_commitment = deck_commitment;
    receipt.randomness_proof_hash = randomness_proof_hash;
    receipt.starting_stacks_hash = [0; 32];
    receipt.action_log_hash = action_log_hash;
    receipt.final_result_hash = result_hash;
    receipt.rake_taken = rake_amount;
    receipt.completed_at = Clock::get()?.unix_timestamp;
    receipt.disputed = false;
    receipt.bump = ctx.bumps.hand_receipt;
    table.hand_counter = hand_number;
    table.total_rake_collected = table.total_rake_collected.saturating_add(rake_amount);
    Ok(())
}

#[derive(Accounts)]
#[instruction(hand_number: u64)]
pub struct SettleHand<'info> {
    #[account(mut)]
    pub table: Account<'info, PokerTable>,
    #[account(
        init,
        payer = backend_signer,
        space = HandReceipt::LEN,
        seeds = [b"hand", table.table_id.as_ref(), &hand_number.to_le_bytes()],
        bump
    )]
    pub hand_receipt: Account<'info, HandReceipt>,
    #[account(mut)]
    pub backend_signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

