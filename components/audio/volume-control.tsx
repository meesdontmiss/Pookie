"use client"

import { Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { useAudioContext, AudioType } from "@/lib/audio-context"
import { useState, useEffect, useCallback } from "react"

interface VolumeControlProps {
  audioType: AudioType
  label?: string
}

export function VolumeControl({ audioType, label }: VolumeControlProps) {
  const { setVolume, toggleMute } = useAudioContext()
  const [volume, setVolumeState] = useState(0.5)
  const [isMuted, setIsMuted] = useState(false)

  // Use a memoized callback to prevent recreating the function on each render
  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0]
    setVolumeState(newVolume)
  }, []);

  // Apply volume changes in a separate effect to avoid infinite loops
  useEffect(() => {
    // Only update the actual audio volume when the state changes
    setVolume(audioType, volume)
  }, [volume, audioType, setVolume]);

  const handleMuteToggle = useCallback(() => {
    setIsMuted(prev => !prev)
    toggleMute(audioType)
  }, [audioType, toggleMute]);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleMuteToggle}
        className="text-white hover:text-white/80"
      >
        {isMuted ? (
          <VolumeX className="h-5 w-5" />
        ) : (
          <Volume2 className="h-5 w-5" />
        )}
        <span className="sr-only">{label || "Toggle volume"}</span>
      </Button>
      
      <Slider
        defaultValue={[0.5]}
        max={1}
        step={0.01}
        value={[volume]}
        onValueChange={handleVolumeChange}
        className="w-24"
      />
    </div>
  )
} 