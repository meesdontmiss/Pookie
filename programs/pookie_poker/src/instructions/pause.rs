use anchor_lang::prelude::*;
use crate::{state::GlobalConfig, PookiePokerError};

pub fn emergency_pause(ctx: Context<EmergencyPause>, paused: bool) -> Result<()> {
    require!(
        ctx.accounts.authority.key() == ctx.accounts.global_config.authority,
        PookiePokerError::Unauthorized
    );
    ctx.accounts.global_config.paused = paused;
    Ok(())
}

#[derive(Accounts)]
pub struct EmergencyPause<'info> {
    #[account(mut, seeds = [b"global_config"], bump = global_config.bump)]
    pub global_config: Account<'info, GlobalConfig>,
    pub authority: Signer<'info>,
}

