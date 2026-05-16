import { FairnessVerifier } from '@/components/pookie-poker/verify/FairnessVerifier'

export default function PookiePokerVerifyPage({ params }: { params: { handId: string } }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] overflow-y-auto bg-[#050610] px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <FairnessVerifier handId={params.handId} />
      </div>
    </div>
  )
}
