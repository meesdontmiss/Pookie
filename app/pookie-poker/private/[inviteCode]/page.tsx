import Link from 'next/link'

export default function PrivatePookiePokerPage({ params }: { params: { inviteCode: string } }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#050610] px-6 py-10 text-white">
      <div className="mx-auto max-w-2xl rounded-md border border-white/10 bg-black/55 p-6 backdrop-blur">
        <h1 className="text-3xl font-black">Private Table</h1>
        <p className="mt-3 text-zinc-300">Invite code `{params.inviteCode}` is ready for the fake-chip private table flow.</p>
        <Link className="mt-6 inline-flex rounded-md bg-amber-300 px-5 py-3 text-sm font-black text-zinc-950" href="/pookie-poker/table/private-lounge-preview">
          Enter Private Lounge
        </Link>
      </div>
    </div>
  )
}

