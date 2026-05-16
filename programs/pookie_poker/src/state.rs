use anchor_lang::prelude::*;

#[account]
pub struct GlobalConfig {
    pub authority: Pubkey,
    pub treasury_wallet: Pubkey,
    pub rake_vault: Pubkey,
    pub paused: bool,
    pub real_money_enabled: bool,
    pub min_table_buy_in: u64,
    pub max_table_buy_in: u64,
    pub default_rake_bps: u16,
    pub max_rake_bps: u16,
    pub created_at: i64,
    pub bump: u8,
}

impl GlobalConfig {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 1 + 1 + 8 + 8 + 2 + 2 + 8 + 1;
}

#[account]
pub struct PokerTable {
    pub table_id: [u8; 32],
    pub creator: Pubkey,
    pub status: u8,
    pub currency_mint: Pubkey,
    pub small_blind: u64,
    pub big_blind: u64,
    pub min_buy_in: u64,
    pub max_buy_in: u64,
    pub max_players: u8,
    pub rake_bps: u16,
    pub rake_cap: u64,
    pub total_deposited: u64,
    pub total_withdrawn: u64,
    pub total_rake_collected: u64,
    pub hand_counter: u64,
    pub created_at: i64,
    pub closed_at: i64,
    pub authority_backend_signer: Pubkey,
    pub bump: u8,
}

impl PokerTable {
    pub const LEN: usize = 8 + 32 + 32 + 1 + 32 + 8 + 8 + 8 + 8 + 1 + 2 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 32 + 1;
}

#[account]
pub struct PlayerTableBalance {
    pub table_id: [u8; 32],
    pub player: Pubkey,
    pub deposited_amount: u64,
    pub active_stack: u64,
    pub locked_amount: u64,
    pub withdrawable_amount: u64,
    pub seated: bool,
    pub seat_index: u8,
    pub last_action_at: i64,
    pub nonce: u64,
    pub bump: u8,
}

impl PlayerTableBalance {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 1 + 1 + 8 + 8 + 1;
}

#[account]
pub struct HandReceipt {
    pub table_id: [u8; 32],
    pub hand_number: u64,
    pub deck_commitment: [u8; 32],
    pub randomness_proof_hash: [u8; 32],
    pub starting_stacks_hash: [u8; 32],
    pub action_log_hash: [u8; 32],
    pub final_result_hash: [u8; 32],
    pub rake_taken: u64,
    pub completed_at: i64,
    pub disputed: bool,
    pub bump: u8,
}

impl HandReceipt {
    pub const LEN: usize = 8 + 32 + 8 + 32 + 32 + 32 + 32 + 32 + 8 + 8 + 1 + 1;
}

