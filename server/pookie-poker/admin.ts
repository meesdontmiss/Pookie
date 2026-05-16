import type { TablePublicState } from '../../shared/pookie-poker'

export type PokerAdminSnapshot = {
  activeTables: number
  seatedPlayers: number
  totalTableStackLamports: string
  totalRakeLamports: string
  failedSettlements: number
  suspiciousTables: number
  realMoneyEnabled: boolean
  custodyModel: 'play_money' | 'backend_hot_cold_wallets'
  neonConfigured: boolean
  geofenceEnabled: boolean
  kycEnabled: boolean
}

export function buildAdminSnapshot(tables: TablePublicState[]): PokerAdminSnapshot {
  const totalTableStacks = tables.reduce(
    (sum, table) => sum + table.players.reduce((playerSum, player) => playerSum + BigInt(player.stackLamports), 0n),
    0n,
  )
  const rake = tables.reduce((sum, table) => sum + BigInt(table.rakeInfo.rakeTakenThisHandLamports), 0n)
  const realMoneyEnabled = process.env.POOKIE_POKER_REAL_MONEY_ENABLED === 'true'

  return {
    activeTables: tables.filter((table) => table.status === 'active').length,
    seatedPlayers: tables.reduce((sum, table) => sum + table.players.length, 0),
    totalTableStackLamports: totalTableStacks.toString(),
    totalRakeLamports: rake.toString(),
    failedSettlements: 0,
    suspiciousTables: 0,
    realMoneyEnabled,
    custodyModel: realMoneyEnabled ? 'backend_hot_cold_wallets' : 'play_money',
    neonConfigured: Boolean(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || process.env.POOKIE_POKER_DATABASE_URL),
    geofenceEnabled: process.env.POOKIE_POKER_GEOFENCE_ENABLED === 'true',
    kycEnabled: process.env.POOKIE_POKER_KYC_ENABLED === 'true',
  }
}
