# 🚀 Mainnet Launch Checklist

## ⚠️ PRODUCTION READY - REAL MONEY

This system is configured for **Solana Mainnet** with **real SOL**. Follow this checklist carefully.

---

## Pre-Launch Setup

### 1. Generate Production Wallets
- [ ] Generate 2 NEW Solana keypairs for escrow (A & B)
- [ ] **NEVER reuse devnet wallets for mainnet!**
- [ ] Store private keys securely (password manager, vault)
- [ ] Backup private keys in multiple secure locations

### 2. Fund Escrow Wallets
- [ ] Transfer at least **5 SOL** to Escrow Wallet A
- [ ] Transfer at least **5 SOL** to Escrow Wallet B
- [ ] Verify balances on Solana Explorer
- [ ] Set up balance monitoring/alerts

**Why 5 SOL each?**
- Each wallet needs to handle multiple matches before rotation
- Covers transaction fees (0.000005 SOL per tx)
- Provides buffer for simultaneous matches
- Adjust based on expected player volume

### 3. Configure Environment
- [ ] Set `NEXT_PUBLIC_SOLANA_RPC_URL` to mainnet
- [ ] Set `NEXT_PUBLIC_ADMIN_WALLET` to your real wallet
- [ ] Add escrow private keys (base64 encoded)
- [ ] Generate strong `PAYOUT_SERVER_SECRET` (32+ chars)
- [ ] Set `HOUSE_CUT_PERCENTAGE` (default: 0.04 = 4%)
- [ ] Configure production Supabase credentials
- [ ] Set production socket server URL

### 4. Database Setup
- [ ] Run migration in **production** Supabase
- [ ] Update escrow wallet public keys in migration
- [ ] Verify all tables created successfully
- [ ] Enable Row Level Security (RLS) policies
- [ ] Set up database backups

### 5. RPC Configuration (Recommended)
Free mainnet RPC can be slow/unreliable. Consider:
- [ ] **Alchemy** - https://www.alchemy.com/solana
- [ ] **QuickNode** - https://www.quicknode.com/chains/sol
- [ ] **Helius** - https://www.helius.dev/
- [ ] **GenesysGo** - https://genesysgo.com/

Benefits: Higher rate limits, better reliability, faster confirmations

---

## Testing Phase (SMALL AMOUNTS)

### Test with Minimal Wagers
1. [ ] Create a test lobby with **0.01 SOL** wager
2. [ ] Join with your own wallet
3. [ ] Request wager transaction
4. [ ] Sign and submit transaction
5. [ ] Verify funds arrive in escrow wallet
6. [ ] Check transaction on Solana Explorer
7. [ ] Verify database records created

### Test Full Flow
1. [ ] Complete a full match (2+ players)
2. [ ] Verify winner determined correctly
3. [ ] Check payout executes (Phase 3)
4. [ ] Verify house cut sent to admin wallet
5. [ ] Check all database records updated
6. [ ] Verify player stats updated

---

## Security Hardening

### API Security
- [ ] Verify `PAYOUT_SERVER_SECRET` is strong
- [ ] Ensure `/api/payout` only accepts server requests
- [ ] Rate limit `/api/wager` endpoint
- [ ] Add request validation and sanitization
- [ ] Log all financial transactions

### Wallet Security
- [ ] Escrow private keys stored in secure vault
- [ ] Admin wallet uses hardware wallet (recommended)
- [ ] Private keys NEVER in git or logs
- [ ] Access to production env vars restricted
- [ ] Regular security audits

### Monitoring
- [ ] Set up Sentry/error tracking
- [ ] Monitor escrow wallet balances
- [ ] Alert on failed transactions
- [ ] Track house cut accumulation
- [ ] Monitor for unusual activity

---

## Launch Day

### Final Checks
- [ ] All environment variables correct
- [ ] Escrow wallets funded and verified
- [ ] Database migration complete
- [ ] Socket server running
- [ ] RPC endpoint responding
- [ ] Test transaction successful

### Go Live
1. [ ] Start with **free lobbies only** (0 wager)
2. [ ] Monitor for issues
3. [ ] Enable **0.05 SOL** lobby
4. [ ] Monitor for 24 hours
5. [ ] Gradually enable higher wager lobbies
6. [ ] Monitor continuously

### Post-Launch Monitoring
- [ ] Check escrow balances every 6 hours
- [ ] Review transaction logs daily
- [ ] Monitor player feedback
- [ ] Track match completion rates
- [ ] Watch for failed payouts

---

## Emergency Procedures

### If Escrow Balance Low
1. Transfer more SOL to the low wallet
2. Check for stuck transactions
3. Review payout logs

### If Transaction Fails
1. Check RPC endpoint status
2. Verify wallet has sufficient balance
3. Check Solana network status
4. Review error logs
5. Implement refund if needed

### If Payout Fails
1. Check `PAYOUT_SERVER_SECRET` is correct
2. Verify escrow wallet has funds
3. Check admin wallet address
4. Review match_results table
5. Manual payout if needed (contact support)

---

## Maintenance

### Daily
- [ ] Check escrow wallet balances
- [ ] Review error logs
- [ ] Monitor player activity

### Weekly
- [ ] Audit transaction records
- [ ] Verify house cut accumulation
- [ ] Check for stuck matches
- [ ] Review player stats

### Monthly
- [ ] Consider rotating escrow wallets
- [ ] Audit security practices
- [ ] Review and optimize house cut
- [ ] Analyze player retention

---

## Support Contacts

**Critical Issues:**
- Solana Network Status: https://status.solana.com/
- RPC Provider Support: [Your provider's support]
- Supabase Status: https://status.supabase.com/

**Financial Issues:**
- Stuck transactions: Check Solana Explorer
- Failed payouts: Review match_results table
- Missing funds: Audit transaction history

---

## Success Metrics

Track these KPIs:
- [ ] Total matches completed
- [ ] Total SOL wagered
- [ ] Average match completion time
- [ ] Payout success rate (target: 99%+)
- [ ] Player retention rate
- [ ] House cut accumulated
- [ ] Transaction failure rate (target: <1%)

---

## 🎉 You're Ready!

Once all checkboxes are complete, you're ready to launch Pookie Sumo Ball on Solana Mainnet!

**Remember:**
- Start small (low wagers)
- Monitor closely
- Scale gradually
- Keep escrow wallets funded
- Respond quickly to issues

Good luck! 🚀

