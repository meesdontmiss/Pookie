import { neon } from '@neondatabase/serverless'

export type NeonSql = ReturnType<typeof neon>

let cachedSql: NeonSql | null = null

export function getNeonSql(): NeonSql | null {
  const connectionString =
    process.env.NEON_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.POOKIE_POKER_DATABASE_URL ||
    ''

  if (!connectionString) return null
  if (!cachedSql) cachedSql = neon(connectionString)
  return cachedSql
}

export function requireNeonSql(): NeonSql {
  const sql = getNeonSql()
  if (!sql) {
    throw new Error('Neon database is not configured. Set NEON_DATABASE_URL or DATABASE_URL.')
  }
  return sql
}

