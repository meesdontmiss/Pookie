import crypto from 'crypto'
import type { NeonSql } from './neon'
import { getNeonSql } from './neon'

export type CustodyLedger = {
  enabled: boolean
  creditDeposit(input: CreditDepositInput): Promise<{ transactionId: string }>
  movePlayerToTable(input: MovePlayerToTableInput): Promise<{ transactionId: string }>
  settleTableToPlayer(input: SettleTableToPlayerInput): Promise<{ transactionId: string }>
  requestWithdrawal(input: WithdrawalRequestInput): Promise<{ withdrawalId: string }>
}

export type CreditDepositInput = {
  wallet: string
  amountLamports: bigint
  mint: string
  txSignature: string
  sourceAddress?: string
  hotWalletAddress: string
}

export type MovePlayerToTableInput = {
  wallet: string
  tableId: string
  amountLamports: bigint
  mint: string
  referenceId: string
}

export type SettleTableToPlayerInput = {
  wallet: string
  tableId: string
  amountLamports: bigint
  mint: string
  referenceId: string
}

export type WithdrawalRequestInput = {
  wallet: string
  destinationAddress: string
  amountLamports: bigint
  mint: string
  requestedBy: string
  riskScore: number
}

export function createCustodyLedger(sql = getNeonSql()): CustodyLedger {
  if (!sql) return new NoopCustodyLedger()
  return new NeonCustodyLedger(sql)
}

class NoopCustodyLedger implements CustodyLedger {
  enabled = false
  async creditDeposit() { return { transactionId: 'noop' } }
  async movePlayerToTable() { return { transactionId: 'noop' } }
  async settleTableToPlayer() { return { transactionId: 'noop' } }
  async requestWithdrawal() { return { withdrawalId: 'noop' } }
}

class NeonCustodyLedger implements CustodyLedger {
  enabled = true
  constructor(private readonly sql: NeonSql) {}

  async creditDeposit(input: CreditDepositInput) {
    assertPositive(input.amountLamports)
    const transactionId = randomId()
    const playerAccount = await this.ensureAccount('player', input.wallet, input.mint)
    const hotAccount = await this.ensureAccount('hot_wallet', input.hotWalletAddress, input.mint)

    await this.sql`insert into poker_deposits (
      wallet, amount_lamports, mint, source_address, hot_wallet_address, tx_signature, confirmations, status, credited_transaction_id
    ) values (
      ${input.wallet}, ${input.amountLamports.toString()}, ${input.mint}, ${input.sourceAddress ?? null},
      ${input.hotWalletAddress}, ${input.txSignature}, 1, 'credited', ${transactionId}
    ) on conflict (tx_signature) do nothing`

    await this.insertBalancedEntries(transactionId, [
      { accountId: hotAccount, direction: 'debit', amountLamports: input.amountLamports, entryType: 'deposit_onchain_received', referenceType: 'deposit', referenceId: input.txSignature },
      { accountId: playerAccount, direction: 'credit', amountLamports: input.amountLamports, entryType: 'deposit_player_credit', referenceType: 'deposit', referenceId: input.txSignature },
    ])
    return { transactionId }
  }

  async movePlayerToTable(input: MovePlayerToTableInput) {
    assertPositive(input.amountLamports)
    const transactionId = randomId()
    const playerAccount = await this.ensureAccount('player', input.wallet, input.mint)
    const tableAccount = await this.ensureAccount('table', input.tableId, input.mint)
    await this.insertBalancedEntries(transactionId, [
      { accountId: playerAccount, direction: 'debit', amountLamports: input.amountLamports, entryType: 'table_buy_in', referenceType: 'table', referenceId: input.referenceId },
      { accountId: tableAccount, direction: 'credit', amountLamports: input.amountLamports, entryType: 'table_buy_in', referenceType: 'table', referenceId: input.referenceId },
    ])
    return { transactionId }
  }

  async settleTableToPlayer(input: SettleTableToPlayerInput) {
    assertPositive(input.amountLamports)
    const transactionId = randomId()
    const tableAccount = await this.ensureAccount('table', input.tableId, input.mint)
    const playerAccount = await this.ensureAccount('player', input.wallet, input.mint)
    await this.insertBalancedEntries(transactionId, [
      { accountId: tableAccount, direction: 'debit', amountLamports: input.amountLamports, entryType: 'hand_settlement', referenceType: 'hand', referenceId: input.referenceId },
      { accountId: playerAccount, direction: 'credit', amountLamports: input.amountLamports, entryType: 'hand_settlement', referenceType: 'hand', referenceId: input.referenceId },
    ])
    return { transactionId }
  }

  async requestWithdrawal(input: WithdrawalRequestInput) {
    assertPositive(input.amountLamports)
    const rows = (await this.sql`insert into poker_withdrawal_requests (
      wallet, destination_address, amount_lamports, mint, status, risk_score, requested_by
    ) values (
      ${input.wallet}, ${input.destinationAddress}, ${input.amountLamports.toString()}, ${input.mint}, 'requested', ${input.riskScore}, ${input.requestedBy}
    ) returning id`) as Array<{ id: string }>
    return { withdrawalId: rows[0].id as string }
  }

  private async ensureAccount(ownerType: string, ownerId: string, mint: string) {
    const rows = (await this.sql`insert into poker_custody_accounts (owner_type, owner_id, mint)
      values (${ownerType}, ${ownerId}, ${mint})
      on conflict (owner_type, owner_id, mint) do update set status = poker_custody_accounts.status
      returning id`) as Array<{ id: string }>
    return rows[0].id as string
  }

  private async insertBalancedEntries(transactionId: string, entries: LedgerEntryInput[]) {
    const balance = entries.reduce(
      (sum, entry) => sum + (entry.direction === 'credit' ? entry.amountLamports : -entry.amountLamports),
      0n,
    )
    if (balance !== 0n) throw new Error('Ledger transaction is not balanced')

    for (const entry of entries) {
      await this.sql`insert into poker_ledger_entries (
        transaction_id, account_id, direction, amount_lamports, entry_type, reference_type, reference_id
      ) values (
        ${transactionId}, ${entry.accountId}, ${entry.direction}, ${entry.amountLamports.toString()},
        ${entry.entryType}, ${entry.referenceType ?? null}, ${entry.referenceId ?? null}
      )`
    }
  }
}

type LedgerEntryInput = {
  accountId: string
  direction: 'debit' | 'credit'
  amountLamports: bigint
  entryType: string
  referenceType?: string
  referenceId?: string
}

function assertPositive(amount: bigint) {
  if (amount <= 0n) throw new Error('Ledger amount must be positive')
}

function randomId() {
  return crypto.randomUUID()
}
