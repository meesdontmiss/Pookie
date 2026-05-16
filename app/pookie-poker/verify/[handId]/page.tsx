export default function PookiePokerVerifyPage({ params }: { params: { handId: string } }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#050610] px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl rounded-md border border-white/10 bg-black/55 p-6 backdrop-blur">
        <h1 className="text-3xl font-black">Verify Hand</h1>
        <p className="mt-3 text-zinc-300">Hand `{params.handId}` will verify server seed reveal, deck commitment, action log hash, result hash, and rake once receipts are persisted.</p>
      </div>
    </div>
  )
}

