import "server-only"
import { timingSafeEqual } from "crypto"

/**
 * Constant-time string comparison to avoid leaking secrets via response timing.
 * Returns false for null/undefined/empty inputs.
 */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
