export function formatLamports(lamports: string | bigint, symbol = 'SOL') {
  const value = typeof lamports === 'bigint' ? lamports : BigInt(lamports || '0')
  const whole = value / 1_000_000_000n
  const fractional = value % 1_000_000_000n
  const shortFraction = fractional.toString().padStart(9, '0').slice(0, 3)
  return `${whole}.${shortFraction} ${symbol}`
}

export function shortWallet(wallet: string) {
  return wallet.length > 12 ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}` : wallet
}

