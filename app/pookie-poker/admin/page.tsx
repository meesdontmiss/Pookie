import Link from 'next/link'

const adminCards = [
  ['Active tables', 'Socket snapshot endpoint ready'],
  ['Custody', 'Hot/cold wallet model, disabled for play-money'],
  ['Rake', 'Logged per completed eligible hand'],
  ['Compliance', 'KYC/geofence hooks disabled by default'],
  ['Controls', 'Pause/freeze/close require auth wiring'],
  ['Ledger', 'Neon schema scaffold exists'],
] as const

export default function PookiePokerAdminPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] overflow-y-auto bg-[#050610] px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black">Pookie Poker Admin</h1>
            <p className="mt-3 max-w-2xl text-zinc-300">
              Monitoring shell for play-money tables, Neon ledger health, hot/cold wallet operations, compliance gates, and settlements.
            </p>
          </div>
          <Link href="/pookie-poker" className="rounded-md border border-cyan-300/40 bg-cyan-950/50 px-4 py-2 text-sm font-bold text-cyan-100">
            Lobby
          </Link>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {adminCards.map(([title, value]) => (
            <div key={title} className="rounded-md border border-white/10 bg-black/55 p-4 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.16em] text-zinc-400">{title}</div>
              <div className="mt-2 text-lg font-black">{value}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-md border border-red-400/20 bg-red-950/20 p-4 text-sm text-red-100">
          Admin writes are intentionally not enabled from the browser yet. Production pause, dispute, rake config, withdrawals, hot wallet sweeps, and cold storage actions must require auth, role checks, audit logging, and manual approval policy.
        </div>
      </div>
    </div>
  )
}
