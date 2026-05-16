export default function PookiePokerHistoryPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#050610] px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-black">Hand History</h1>
        <p className="mt-3 text-zinc-300">The backend records append-only action logs and deterministic hand receipts. Persistent history storage is the next integration step after the fake-chip socket loop.</p>
      </div>
    </div>
  )
}

