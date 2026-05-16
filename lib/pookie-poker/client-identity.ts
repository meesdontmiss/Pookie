'use client'

const STORAGE_KEY = 'pookie-poker-demo-identity'

export type PookiePokerClientIdentity = {
  wallet: string
  displayName: string
}

export function getOrCreatePokerIdentity(walletAddress?: string | null): PookiePokerClientIdentity {
  if (walletAddress) {
    return {
      wallet: walletAddress,
      displayName: 'Wallet Player',
    }
  }

  const existing = readStoredIdentity()
  if (existing) return existing

  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase()
  const identity = {
    wallet: `play-money-${suffix}`,
    displayName: `Pookie ${suffix.slice(0, 3)}`,
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity))
  } catch {}
  return identity
}

function readStoredIdentity(): PookiePokerClientIdentity | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PookiePokerClientIdentity>
    if (!parsed.wallet || !parsed.displayName) return null
    return {
      wallet: parsed.wallet,
      displayName: parsed.displayName,
    }
  } catch {
    return null
  }
}

