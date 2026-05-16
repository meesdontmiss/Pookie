import { z } from 'zod'

export const LamportStringSchema = z.string().regex(/^(0|[1-9]\d*)$/)

export const CardSchema = z.object({
  rank: z.enum(['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']),
  suit: z.enum(['c', 'd', 'h', 's']),
})

export const RakeConfigSchema = z.object({
  rakePercentBps: z.number().int().min(0).max(1000),
  rakeCapLamports: LamportStringSchema,
  noFlopNoDrop: z.boolean(),
  minPotForRakeLamports: LamportStringSchema,
})

export const PokerTableConfigSchema = z.object({
  tableId: z.string().min(3).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  tableName: z.string().min(1).max(80),
  tableType: z.enum(['public', 'private']),
  creatorWallet: z.string().optional(),
  inviteCode: z.string().optional(),
  passwordHash: z.string().optional(),
  gameType: z.literal('texas_holdem'),
  currency: z.enum(['SOL', 'POOKIE', 'USDC']),
  smallBlindLamports: LamportStringSchema,
  bigBlindLamports: LamportStringSchema,
  minBuyInLamports: LamportStringSchema,
  maxBuyInLamports: LamportStringSchema,
  maxPlayers: z.union([z.literal(2), z.literal(6), z.literal(9)]),
  rake: RakeConfigSchema,
  realMoneyEnabled: z.literal(false),
  compliancePolicy: z
    .object({
      regionPolicyId: z.string().optional(),
      requiresKyc: z.boolean(),
      requiresGeofence: z.boolean(),
      allowSpectators: z.boolean(),
    })
    .optional(),
})

export const PokerActionPayloadSchema = z.object({
  tableId: z.string().min(3).max(64),
  amountLamports: LamportStringSchema.optional(),
  idempotencyKey: z.string().max(96).optional(),
})

export function parseLamports(value: string): bigint {
  const parsed = LamportStringSchema.parse(value)
  return BigInt(parsed)
}

