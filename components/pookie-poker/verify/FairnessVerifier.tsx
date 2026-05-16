'use client'

import { useState } from 'react'
import { cardLabel } from '@/lib/pookie-poker/cards'
import { verifyPokerHand, type FairnessVerificationResult } from '@/lib/pookie-poker/fairness'

export function FairnessVerifier({ handId }: { handId: string }) {
  const [tableId, setTableId] = useState('neon-rooftop-1')
  const [handNumber, setHandNumber] = useState('1')
  const [serverSeed, setServerSeed] = useState('')
  const [serverSeedHash, setServerSeedHash] = useState('')
  const [deckCommitment, setDeckCommitment] = useState('')
  const [result, setResult] = useState<FairnessVerificationResult | null>(null)
  const [error, setError] = useState('')

  async function handleVerify() {
    setError('')
    setResult(null)
    try {
      setResult(
        await verifyPokerHand({
          tableId,
          handNumber: Number(handNumber),
          serverSeed,
          expectedServerSeedHash: serverSeedHash,
          expectedDeckCommitment: deckCommitment,
        }),
      )
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Could not verify hand')
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
      <div className="rounded-md border border-white/10 bg-black/55 p-5 backdrop-blur">
        <div className="text-xs uppercase tracking-[0.16em] text-cyan-200">Verifier</div>
        <h1 className="mt-2 text-3xl font-black">Verify Hand {handId}</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          Paste the revealed server seed and receipt hashes. The verifier recomputes the seed hash, deterministic deck, and deck commitment locally in your browser.
        </p>

        <div className="mt-5 grid gap-3">
          <Field label="Table ID" value={tableId} onChange={setTableId} />
          <Field label="Hand Number" value={handNumber} onChange={setHandNumber} />
          <Field label="Revealed Server Seed" value={serverSeed} onChange={setServerSeed} />
          <Field label="Expected Server Seed Hash" value={serverSeedHash} onChange={setServerSeedHash} />
          <Field label="Expected Deck Commitment" value={deckCommitment} onChange={setDeckCommitment} />
          <button type="button" onClick={handleVerify} className="rounded-md bg-amber-300 px-4 py-3 text-sm font-black text-zinc-950">
            Verify
          </button>
        </div>
        {error ? <div className="mt-3 rounded bg-red-950/50 p-3 text-sm text-red-100">{error}</div> : null}
      </div>

      <div className="rounded-md border border-white/10 bg-black/55 p-5 backdrop-blur">
        <div className="text-xs uppercase tracking-[0.16em] text-zinc-400">Result</div>
        {!result ? (
          <div className="mt-4 text-sm text-zinc-300">No verification run yet.</div>
        ) : (
          <div className="mt-4 space-y-4 text-sm">
            <ResultRow label="Server seed hash" value={result.serverSeedMatches ? 'Match' : 'Mismatch'} ok={result.serverSeedMatches} />
            <ResultRow label="Deck commitment" value={result.deckCommitmentMatches ? 'Match' : 'Mismatch'} ok={result.deckCommitmentMatches} />
            <HashBlock label="Computed seed hash" value={result.serverSeedHash} />
            <HashBlock label="Computed deck commitment" value={result.deckCommitment} />
            <div>
              <div className="mb-2 text-xs uppercase tracking-[0.16em] text-zinc-400">Deck Preview</div>
              <div className="grid grid-cols-6 gap-2">
                {result.deckPreview.map((card, index) => (
                  <div key={`${card.rank}${card.suit}-${index}`} className="rounded border border-white/10 bg-white px-2 py-2 text-center font-black text-zinc-950">
                    {cardLabel(card)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300" />
    </label>
  )
}

function ResultRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded bg-white/5 p-3">
      <span className="text-zinc-300">{label}</span>
      <span className={ok ? 'font-black text-emerald-200' : 'font-black text-red-200'}>{value}</span>
    </div>
  )
}

function HashBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-[0.16em] text-zinc-400">{label}</div>
      <div className="break-all rounded bg-zinc-950 p-3 font-mono text-xs text-zinc-200">{value}</div>
    </div>
  )
}

