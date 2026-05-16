import type { HandReceipt, TablePublicState } from '../../shared/pookie-poker'
import type { ActionLogEntry, PlayerSettlement } from '../poker-engine'
import type { NeonSql } from './neon'
import { getNeonSql } from './neon'

export type PersistedHandPayload = {
  table: TablePublicState
  receipt: HandReceipt
  actions: ActionLogEntry[]
  settlements: PlayerSettlement[]
  settlementReference?: string
}

export interface PokerPersistence {
  upsertTable(table: TablePublicState): Promise<void>
  upsertPlayer(tableId: string, player: TablePublicState['players'][number]): Promise<void>
  markPlayerDisconnected(tableId: string, wallet: string): Promise<void>
  recordSettledHand(payload: PersistedHandPayload): Promise<void>
  recordAudit(actor: string, action: string, targetType: string, targetId: string, metadata?: Record<string, unknown>): Promise<void>
  recordCompliance(wallet: string | null, eventType: string, riskScore: number, metadata?: Record<string, unknown>): Promise<void>
}

export function createPokerPersistence(sql = getNeonSql()): PokerPersistence {
  if (!sql) return new NoopPokerPersistence()
  return new NeonPokerPersistence(sql)
}

class NoopPokerPersistence implements PokerPersistence {
  async upsertTable() {}
  async upsertPlayer() {}
  async markPlayerDisconnected() {}
  async recordSettledHand() {}
  async recordAudit() {}
  async recordCompliance() {}
}

class NeonPokerPersistence implements PokerPersistence {
  constructor(private readonly sql: NeonSql) {}

  async upsertTable(table: TablePublicState) {
    await this.sql`insert into poker_tables (
      table_id, table_type, game_type, currency_mint, small_blind_lamports, big_blind_lamports,
      min_buy_in_lamports, max_buy_in_lamports, max_players, rake_bps, rake_cap_lamports, status, updated_at
    ) values (
      ${table.tableId}, ${table.tableType}, ${table.gameType}, ${table.currency}, ${table.smallBlindLamports},
      ${table.bigBlindLamports}, ${table.minBuyInLamports}, ${table.maxBuyInLamports}, ${table.maxPlayers},
      ${table.rakeInfo.rakeBps}, ${table.rakeInfo.rakeCapLamports}, ${table.status}, now()
    )
    on conflict (table_id) do update set
      table_type = excluded.table_type,
      game_type = excluded.game_type,
      currency_mint = excluded.currency_mint,
      small_blind_lamports = excluded.small_blind_lamports,
      big_blind_lamports = excluded.big_blind_lamports,
      min_buy_in_lamports = excluded.min_buy_in_lamports,
      max_buy_in_lamports = excluded.max_buy_in_lamports,
      max_players = excluded.max_players,
      rake_bps = excluded.rake_bps,
      rake_cap_lamports = excluded.rake_cap_lamports,
      status = excluded.status,
      updated_at = now()`
  }

  async upsertPlayer(tableId: string, player: TablePublicState['players'][number]) {
    await this.sql`insert into poker_table_players (
      table_id, wallet, display_name, avatar_url, seat_index, stack_lamports, status, connected, last_seen_at
    ) values (
      ${tableId}, ${player.wallet}, ${player.displayName}, ${player.avatarUrl ?? null}, ${player.seatIndex},
      ${player.stackLamports}, ${player.folded ? 'folded' : player.allIn ? 'all_in' : 'seated'}, ${player.connected}, now()
    )
    on conflict (table_id, wallet) do update set
      display_name = excluded.display_name,
      avatar_url = excluded.avatar_url,
      seat_index = excluded.seat_index,
      stack_lamports = excluded.stack_lamports,
      status = excluded.status,
      connected = excluded.connected,
      last_seen_at = now()`
  }

  async markPlayerDisconnected(tableId: string, wallet: string) {
    await this.sql`update poker_table_players
      set connected = false, last_seen_at = now()
      where table_id = ${tableId} and wallet = ${wallet}`
  }

  async recordSettledHand(payload: PersistedHandPayload) {
    const handRows = (await this.sql`insert into poker_hands (
      table_id, hand_number, status, dealer_seat, server_seed_hash, server_seed_revealed,
      vrf_proof_hash, deck_commitment, board_cards_encrypted_or_public, action_log_hash,
      result_hash, rake_lamports, settlement_reference, completed_at
    ) values (
      ${payload.table.tableId}, ${payload.receipt.handNumber}, 'completed', ${payload.table.dealerSeat},
      ${payload.receipt.serverSeedHash}, ${payload.receipt.revealedServerSeed ?? null},
      ${payload.receipt.vrfProofHash ?? null}, ${payload.receipt.deckCommitment},
      ${JSON.stringify(payload.table.communityCards)}, ${payload.receipt.actionLogHash},
      ${payload.receipt.finalResultHash}, ${payload.receipt.rakeTakenLamports},
      ${payload.settlementReference ?? null}, ${payload.receipt.completedAt}
    )
    on conflict (table_id, hand_number) do update set
      status = excluded.status,
      server_seed_revealed = excluded.server_seed_revealed,
      action_log_hash = excluded.action_log_hash,
      result_hash = excluded.result_hash,
      rake_lamports = excluded.rake_lamports,
      settlement_reference = excluded.settlement_reference,
      completed_at = excluded.completed_at
    returning id`) as Array<{ id: string }>

    const handId = handRows[0]?.id as string | undefined
    if (!handId) throw new Error('Failed to persist poker hand')

    for (const action of payload.actions) {
      await this.sql`insert into poker_actions (
        hand_id, table_id, wallet, seat_index, action_type, amount_lamports, street,
        sequence_number, state_hash_before, state_hash_after, created_at
      ) values (
        ${handId}, ${payload.table.tableId}, ${action.wallet}, ${action.seatIndex}, ${action.action},
        ${action.amount.toString()}, ${action.street}, ${action.sequence}, ${action.stateHashBefore},
        ${action.stateHashAfter}, ${action.createdAt}
      ) on conflict (hand_id, sequence_number) do nothing`
    }

    for (const settlement of payload.settlements) {
      await this.sql`insert into poker_settlements (
        hand_id, table_id, wallet, delta_lamports, rake_contributed_lamports, final_stack_lamports
      ) values (
        ${handId}, ${payload.table.tableId}, ${settlement.wallet}, ${settlement.delta.toString()},
        ${settlement.rakeContributed.toString()}, ${settlement.finalStack?.toString() ?? '0'}
      )`
    }
  }

  async recordAudit(actor: string, action: string, targetType: string, targetId: string, metadata: Record<string, unknown> = {}) {
    await this.sql`insert into poker_audit_logs (actor, action, target_type, target_id, metadata_json)
      values (${actor}, ${action}, ${targetType}, ${targetId}, ${JSON.stringify(metadata)})`
  }

  async recordCompliance(wallet: string | null, eventType: string, riskScore: number, metadata: Record<string, unknown> = {}) {
    await this.sql`insert into poker_compliance_events (wallet, event_type, risk_score, metadata_json)
      values (${wallet}, ${eventType}, ${riskScore}, ${JSON.stringify(metadata)})`
  }
}
