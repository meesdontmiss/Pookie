'use client'

import { Loader2, Mic, MicOff, Volume2 } from 'lucide-react'

interface VoiceChatControlProps {
  enabled: boolean
  starting: boolean
  muted: boolean
  peerCount: number
  error?: string | null
  disabled?: boolean
  compact?: boolean
  onStart: () => void
  onStop: () => void
  onMuteChange: (muted: boolean) => void
}

export function VoiceChatControl({
  enabled,
  starting,
  muted,
  peerCount,
  error,
  disabled,
  compact,
  onStart,
  onStop,
  onMuteChange,
}: VoiceChatControlProps) {
  const baseButtonClass = compact
    ? 'h-10 w-10 rounded-lg border border-white/15 bg-black/55 text-white backdrop-blur-md shadow-lg transition hover:bg-black/70 disabled:cursor-not-allowed disabled:opacity-50'
    : 'h-9 rounded-lg border border-white/15 bg-white/10 px-3 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50'

  if (!enabled) {
    return (
      <div className={compact ? 'flex flex-col items-end gap-1' : 'flex items-center gap-2'}>
        <button
          type="button"
          onClick={onStart}
          disabled={disabled || starting}
          title="Enable voice chat"
          className={`${baseButtonClass} inline-flex items-center justify-center gap-2`}
        >
          {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
          {!compact && <span>{starting ? 'VOICE...' : 'VOICE'}</span>}
        </button>
        {error && !compact && <span className="min-w-0 flex-1 truncate text-[10px] text-red-300">{error}</span>}
      </div>
    )
  }

  return (
    <div className={compact ? 'flex flex-col items-end gap-1' : 'flex items-center gap-2'}>
      <div className={compact ? 'flex gap-1' : 'flex flex-1 gap-2'}>
        <button
          type="button"
          onClick={() => onMuteChange(!muted)}
          title={muted ? 'Unmute microphone' : 'Mute microphone'}
          className={`${baseButtonClass} inline-flex items-center justify-center gap-2`}
        >
          {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {!compact && <span>{muted ? 'MUTED' : 'LIVE'}</span>}
        </button>
        <button
          type="button"
          onClick={onStop}
          title="Disable voice chat"
          className={`${baseButtonClass} inline-flex items-center justify-center gap-2`}
        >
          <Volume2 className="h-4 w-4" />
          {!compact && <span>{peerCount}</span>}
        </button>
      </div>
      {compact && (
        <span className="rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white/85 backdrop-blur">
          {peerCount}
        </span>
      )}
      {error && !compact && <span className="min-w-0 flex-1 truncate text-[10px] text-red-300">{error}</span>}
    </div>
  )
}
