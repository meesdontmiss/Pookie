'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, SkipForward, SkipBack, Music, Volume2, VolumeX } from 'lucide-react'

export default function MusicPlayer() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTrack, setCurrentTrack] = useState(0)
  const [volume, setVolume] = useState(0.5)
  const [isMuted, setIsMuted] = useState(false)
  const [playlist, setPlaylist] = useState<string[]>([])
  const audioRef = useRef<HTMLAudioElement>(null)

  // Load playlist from /public/music folder
  useEffect(() => {
    const loadPlaylist = async () => {
      try {
        // In production, you'd fetch this from an API or manifest
        // For now, we'll manually check for numbered files
        const tracks: string[] = []
        for (let i = 1; i <= 20; i++) {
          // Try to load tracks numbered 1-20
          const response = await fetch(`/music/${i}_`, { method: 'HEAD' })
          if (response.ok) {
            tracks.push(`/music/${i}_`)
          }
        }
        setPlaylist(tracks)
      } catch (error) {
        console.log('No tracks found yet')
      }
    }
    loadPlaylist()
  }, [])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const nextTrack = () => {
    if (playlist.length > 0) {
      setCurrentTrack((prev) => (prev + 1) % playlist.length)
      setIsPlaying(true)
    }
  }

  const prevTrack = () => {
    if (playlist.length > 0) {
      setCurrentTrack((prev) => (prev - 1 + playlist.length) % playlist.length)
      setIsPlaying(true)
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const getTrackName = (path: string) => {
    const filename = path.split('/').pop() || ''
    const name = filename.replace(/^\d+_/, '').replace(/\.[^/.]+$/, '')
    return name || 'Unknown Track'
  }

  return (
    <>
      {/* Audio element */}
      {playlist.length > 0 && (
        <audio
          ref={audioRef}
          src={playlist[currentTrack]}
          onEnded={nextTrack}
          autoPlay={isPlaying}
        />
      )}

      {/* Music Player UI */}
      <div className="fixed bottom-6 left-6 z-50">
        {/* Collapsed Circle Button */}
        {!isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-11 h-11 rounded-full bg-lime-400 hover:bg-lime-300 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
            aria-label="Open music player"
          >
            <Music className="w-5 h-5 text-black stroke-[2.5] group-hover:scale-110 transition-transform" />
          </button>
        )}

        {/* Expanded Player */}
        {isExpanded && (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl p-3 w-64 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-lime-400 flex items-center justify-center">
                  <Music className="w-3 h-3 text-black" />
                </div>
                <span className="text-white font-semibold text-xs">Now Playing</span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-white/60 hover:text-white transition-colors text-lg leading-none"
                aria-label="Minimize player"
              >
                ×
              </button>
            </div>

            {/* Track Info */}
            <div className="mb-2">
              <p className="text-white font-medium text-xs truncate">
                {playlist.length > 0 ? getTrackName(playlist[currentTrack]) : 'No tracks loaded'}
              </p>
              <p className="text-white/50 text-[10px] mt-0.5">
                Track {currentTrack + 1} of {playlist.length}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3 mb-2">
              <button
                onClick={prevTrack}
                disabled={playlist.length === 0}
                className="text-white/80 hover:text-white disabled:text-white/30 transition-colors"
                aria-label="Previous track"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={togglePlay}
                disabled={playlist.length === 0}
                className="w-9 h-9 rounded-full bg-lime-400 hover:bg-lime-300 disabled:bg-gray-600 shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 text-black fill-black" />
                ) : (
                  <Play className="w-4 h-4 text-black fill-black ml-0.5" />
                )}
              </button>
              <button
                onClick={nextTrack}
                disabled={playlist.length === 0}
                className="text-white/80 hover:text-white disabled:text-white/30 transition-colors"
                aria-label="Next track"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="text-white/80 hover:text-white transition-colors"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value))
                  if (isMuted) setIsMuted(false)
                }}
                className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-lime-400 [&::-webkit-slider-thumb]:cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </>
  )
}

