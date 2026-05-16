import type { RakeConfig } from '../../shared/pookie-poker'

export function calculateRake(potLamports: bigint, sawFlop: boolean, config: RakeConfig): bigint {
  if (config.noFlopNoDrop && !sawFlop) return 0n
  if (potLamports < BigInt(config.minPotForRakeLamports)) return 0n

  const uncapped = (potLamports * BigInt(config.rakePercentBps)) / 10_000n
  const cap = BigInt(config.rakeCapLamports)
  return uncapped > cap ? cap : uncapped
}

