export type ComplianceCheckInput = {
  wallet: string
  ipHash?: string
  deviceHash?: string
  region?: string
  tableType: 'public' | 'private'
  realMoneyRequested: boolean
}

export type ComplianceDecision = {
  allowed: boolean
  code: string
  message: string
  requiresKyc: boolean
  requiresGeofence: boolean
  riskScore: number
}

export function evaluatePokerCompliance(input: ComplianceCheckInput): ComplianceDecision {
  const realMoneyEnabled = process.env.POOKIE_POKER_REAL_MONEY_ENABLED === 'true'
  const geofenceEnabled = process.env.POOKIE_POKER_GEOFENCE_ENABLED === 'true'
  const kycEnabled = process.env.POOKIE_POKER_KYC_ENABLED === 'true'

  if (input.realMoneyRequested || realMoneyEnabled) {
    return {
      allowed: false,
      code: 'REAL_MONEY_DISABLED',
      message: 'Real-money poker is disabled until legal, KYC, and geolocation gates are configured.',
      requiresKyc: true,
      requiresGeofence: true,
      riskScore: 100,
    }
  }

  const riskScore = scorePlayMoneyRisk(input)
  return {
    allowed: true,
    code: 'PLAY_MONEY_ALLOWED',
    message: 'Play-money table access allowed.',
    requiresKyc: kycEnabled,
    requiresGeofence: geofenceEnabled,
    riskScore,
  }
}

function scorePlayMoneyRisk(input: ComplianceCheckInput) {
  let score = 0
  if (!input.wallet) score += 25
  if (!input.deviceHash) score += 10
  if (!input.ipHash) score += 10
  if (input.tableType === 'private') score += 5
  return Math.min(score, 100)
}

