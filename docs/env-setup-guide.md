# Environment Setup Guide - MAINNET PRODUCTION

## Required Environment Variables

Add these to your `.env.local` file:

```env
# Solana Configuration - MAINNET
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# Optional: Use a premium RPC for better performance
# NEXT_PUBLIC_SOLANA_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Admin Wallet (receives house cut) - YOUR REAL WALLET
NEXT_PUBLIC_ADMIN_WALLET=YourMainnetWalletPublicKey

# Escrow Wallets (generate 2 NEW keypairs for mainnet)
# ⚠️ THESE ARE REAL PRIVATE KEYS - KEEP EXTREMELY SECRET!
SOLANA_PRIVATE_KEY_ESCROW_A=base64_encoded_private_key_here
SOLANA_PRIVATE_KEY_ESCROW_B=base64_encoded_private_key_here

# Payout Configuration
PAYOUT_SERVER_SECRET=generate_strong_random_secret_key_here
HOUSE_CUT_PERCENTAGE=0.04

# Supabase - PRODUCTION
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Socket Server - PRODUCTION
NEXT_PUBLIC_SOCKET_URL=https://your-production-server.com
NEXT_PUBLIC_SOCKET_PATH=/socket.io
```

---

## Setup Steps - MAINNET PRODUCTION

### 1. Generate Escrow Wallets (MAINNET)

⚠️ **CRITICAL:** Generate NEW wallets specifically for mainnet production!

Run this Node.js script to generate 2 Solana keypairs:

```javascript
const { Keypair } = require('@solana/web3.js');

// Generate Wallet A
const walletA = Keypair.generate();
console.log('Wallet A Public Key:', walletA.publicKey.toString());
console.log('Wallet A Private Key (base64):', Buffer.from(walletA.secretKey).toString('base64'));

// Generate Wallet B
const walletB = Keypair.generate();
console.log('\nWallet B Public Key:', walletB.publicKey.toString());
console.log('Wallet B Private Key (base64):', Buffer.from(walletB.secretKey).toString('base64'));
```

### 2. Fund Escrow Wallets (MAINNET - REAL SOL)

⚠️ **YOU MUST FUND THESE WALLETS WITH REAL SOL!**

Transfer SOL from your main wallet to both escrow wallets:
```bash
# Check your main wallet balance
solana balance <YOUR_MAIN_WALLET>

# Transfer to Wallet A (recommended: at least 5 SOL to start)
solana transfer <WALLET_A_PUBLIC_KEY> 5 --from <YOUR_MAIN_WALLET_KEYPAIR>

# Transfer to Wallet B (recommended: at least 5 SOL to start)
solana transfer <WALLET_B_PUBLIC_KEY> 5 --from <YOUR_MAIN_WALLET_KEYPAIR>

# Verify balances
solana balance <WALLET_A_PUBLIC_KEY>
solana balance <WALLET_B_PUBLIC_KEY>
```

**Why fund both?** The system rotates between A and B after each payout. Both need sufficient SOL to handle multiple matches.

### 3. Update Supabase Migration

In `supabase/migrations/001_pookie_economy.sql`, replace:
```sql
'REPLACE_WITH_ESCROW_WALLET_A_PUBLIC_KEY'
'REPLACE_WITH_ESCROW_WALLET_B_PUBLIC_KEY'
```

With your actual wallet public keys.

### 4. Run Migration

In Supabase SQL Editor, paste and run the entire migration file.

### 5. Generate Payout Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use the output as your `PAYOUT_SERVER_SECRET`.

---

## Security Notes - PRODUCTION CRITICAL

🚨 **MAINNET SECURITY CHECKLIST:**

- [ ] **NEVER commit `.env.local` to git!** Add to `.gitignore`
- [ ] **Keep private keys EXTREMELY SECRET!** These control real money
- [ ] **Use strong PAYOUT_SERVER_SECRET** (32+ random characters)
- [ ] **Backup escrow wallet private keys** in a secure location (password manager, hardware wallet backup)
- [ ] **Monitor escrow wallet balances** - set up alerts if balance drops too low
- [ ] **Use premium RPC endpoint** for reliability (Alchemy, Quicknode, etc.)
- [ ] **Enable Supabase RLS** (Row Level Security) for production
- [ ] **Set up monitoring** for failed transactions
- [ ] **Test with small amounts first** before going live

⚠️ **WALLET SECURITY:**
- Store escrow private keys in a secure vault (1Password, AWS Secrets Manager, etc.)
- Never share private keys via email, chat, or any insecure channel
- Consider using a hardware wallet for the admin wallet
- Rotate escrow wallets every few months

---

## Production Checklist

### Pre-Launch
- [ ] Escrow wallets generated (NEW, mainnet-only)
- [ ] Escrow wallets funded with real SOL (5+ SOL each recommended)
- [ ] Admin wallet set to your real wallet
- [ ] Supabase tables created in production database
- [ ] All environment variables set correctly
- [ ] Premium RPC endpoint configured (optional but recommended)
- [ ] PAYOUT_SERVER_SECRET is strong and unique

### Testing (Small Amounts)
- [ ] Can fetch wager transaction from `/api/wager`
- [ ] Wallet can sign transaction
- [ ] Transaction appears on Solana explorer (mainnet)
- [ ] Test with 0.01 SOL wager first
- [ ] Verify escrow receives funds
- [ ] Test full match → payout flow

### Monitoring
- [ ] Set up balance alerts for escrow wallets
- [ ] Monitor Supabase for failed transactions
- [ ] Check logs for API errors
- [ ] Track house cut accumulation

