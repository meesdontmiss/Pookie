# 🧪 Phase 2 Testing Guide

## Quick Start Testing

### 1. Start the Servers

**Terminal 1 - Socket Server:**
```bash
npm run socket-server
```
Should see: `[sumo-socket] listening on 4001`

**Terminal 2 - Next.js Dev Server:**
```bash
npm run dev
```
Should see: `Ready on http://localhost:3000`

---

### 2. Connect Your Wallet

1. Open `http://localhost:3000`
2. Click "Connect Wallet" (if you have one in the UI)
3. Or use the wallet adapter button
4. Approve connection in Phantom/Solflare

---

### 3. Test Free Lobby

1. Navigate to Pookie Sumo Ball lobby page
2. Find "Free Test Match" (0 SOL)
3. Click "JOIN FREE"
4. Lobby panel opens on the side
5. Click "READY UP"
6. ✅ Should immediately ready (no wallet prompt)

**Expected:**
- No transaction
- Instant ready
- Green "Ready" badge

---

### 4. Test Paid Lobby (0.05 SOL)

1. Join "Small Sumo" lobby (0.05 SOL)
2. Lobby panel opens
3. See "PAY 0.05 SOL & READY" button
4. Click button

**What happens:**
1. Button shows "PROCESSING WAGER..."
2. Wallet pops up (Phantom/Solflare)
3. Review transaction:
   - **To:** Escrow wallet address
   - **Amount:** 0.05 SOL
   - **Fee:** ~0.000005 SOL
4. Click "Approve"
5. Wait 1-2 seconds
6. ✅ "Wager submitted ✅" appears
7. Yellow "Paid" badge shows
8. Auto-ready (green "Ready" badge)

**Check Solana Explorer:**
```
https://explorer.solana.com/tx/[YOUR_SIGNATURE]
```
Should show successful transaction to escrow wallet.

---

### 5. Test Transaction Rejection

1. Join paid lobby
2. Click "PAY X SOL & READY"
3. **Reject** transaction in wallet
4. ❌ Error message appears
5. Button re-enabled
6. Can retry

---

### 6. Test Multiple Players

**Option A: Two Browsers**
1. Open Chrome (Player 1)
2. Open Firefox (Player 2)
3. Both connect wallets
4. Both join same lobby
5. Both wager
6. Both ready
7. Countdown starts at 5
8. Match starts when countdown reaches 0

**Option B: Two Wallets**
1. Use Phantom (Player 1)
2. Use Solflare (Player 2)
3. Same flow as above

**Expected:**
- Both see each other in player list
- Both see "Paid" badges after wagering
- Countdown starts when majority ready + all wagered
- Match starts after countdown

---

## 🔍 What to Look For

### ✅ Success Indicators:
- Wallet prompts for approval
- Transaction appears in wallet history
- "Wager submitted ✅" message
- "Paid" badge shows in player list
- Player auto-readies after wager
- Other players see your "Paid" status
- Countdown starts when conditions met

### ❌ Error Indicators:
- "Wallet not connected" - Connect wallet first
- "User rejected the request" - You declined transaction
- "Insufficient funds" - Not enough SOL
- "Transaction failed" - Network issue or RPC problem
- "Failed to create wager transaction" - API error

---

## 🐛 Troubleshooting

### Wallet Not Prompting
**Problem:** Click button but no wallet popup
**Solutions:**
1. Check wallet extension is installed
2. Refresh page
3. Disconnect and reconnect wallet
4. Check browser console for errors

### Transaction Stuck
**Problem:** "PROCESSING WAGER..." forever
**Solutions:**
1. Check Solana network status: https://status.solana.com/
2. Check RPC endpoint is responding
3. Refresh page and retry
4. Check wallet has sufficient SOL + fees

### "Wager submitted" but No Badge
**Problem:** Success message but no "Paid" badge
**Solutions:**
1. Check server logs for `confirm_wager` event
2. Verify socket connection (should see "✅ Lobby socket connected")
3. Refresh page
4. Check `lobby_state` broadcast in network tab

### Countdown Not Starting
**Problem:** All players ready but no countdown
**Solutions:**
1. Check all players have "Paid" badges (paid lobbies)
2. Verify majority are ready (at least 50%+1)
3. Check server logs for `tryStartCountdown`
4. Ensure at least 2 players in free lobby, 4 in paid

### Socket Connection Issues
**Problem:** "❌ Lobby socket disconnected"
**Solutions:**
1. Verify socket server is running on port 4001
2. Check `NEXT_PUBLIC_SOCKET_URL` in `.env.local`
3. Check firewall isn't blocking port 4001
4. Restart socket server

---

## 📊 Monitoring

### Check Escrow Balance
```bash
solana balance <ESCROW_A_PUBLIC_KEY>
solana balance <ESCROW_B_PUBLIC_KEY>
```

Should increase by wager amount after each transaction.

### Check Transaction on Explorer
```bash
# Copy signature from console logs
# Visit: https://explorer.solana.com/tx/[SIGNATURE]
```

Should show:
- Status: Success ✅
- From: Your wallet
- To: Escrow wallet
- Amount: Lobby wager

### Server Logs
Watch for:
```
✅ Wager confirmed: Player (5Xj8...abc123)
📤 Confirming wager: { lobbyId: 'small-sumo-4', amount: 0.05, txSignature: '...' }
```

---

## 🎯 Test Checklist

### Basic Flow:
- [ ] Free lobby works without wallet
- [ ] Paid lobby requires wallet
- [ ] Wallet prompts for approval
- [ ] Transaction confirms on-chain
- [ ] "Paid" badge appears
- [ ] Player auto-readies
- [ ] Can unready after wagering

### Edge Cases:
- [ ] Reject transaction (error shown)
- [ ] Insufficient balance (error shown)
- [ ] Disconnect wallet mid-wager (error shown)
- [ ] Multiple players in same lobby
- [ ] Leave lobby before wagering
- [ ] Leave lobby after wagering

### UI/UX:
- [ ] Button text changes correctly
- [ ] Loading states show
- [ ] Error messages clear
- [ ] Success confirmation visible
- [ ] Badges update in real-time
- [ ] Countdown displays correctly

---

## 💰 Cost of Testing

### Per Test:
- **0.05 SOL lobby:** 0.05 + ~0.000005 = **~0.050005 SOL**
- **0.1 SOL lobby:** 0.1 + ~0.000005 = **~0.100005 SOL**

### Recommended Testing Budget:
- 10 tests × 0.05 SOL = **0.5 SOL**
- Plus buffer for fees = **0.6 SOL total**

**Note:** SOL goes to escrow wallet. Phase 3 will implement payouts to return SOL to winners.

---

## 🚨 Important Reminders

1. **This is MAINNET** - Real SOL is being transferred
2. **Start small** - Test with 0.05 SOL first
3. **Monitor balances** - Check escrow wallets regularly
4. **No refunds yet** - Phase 4 will add refund system
5. **Save signatures** - Keep transaction signatures for audit

---

## 📞 Need Help?

If you encounter issues:
1. Check browser console for errors
2. Check server logs for errors
3. Verify `.env.local` configuration
4. Check Solana network status
5. Try with a different wallet
6. Restart servers

---

## ✅ Success!

If you can:
1. ✅ Join a paid lobby
2. ✅ Click "PAY X SOL & READY"
3. ✅ Approve transaction in wallet
4. ✅ See "Wager submitted ✅"
5. ✅ See "Paid" badge
6. ✅ Auto-ready

**Phase 2 is working perfectly!** 🎉

Ready for Phase 3 (verification & payouts) when you are!

