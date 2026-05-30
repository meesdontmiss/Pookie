'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'

export type VoiceRoomType = 'lobby' | 'match'
export type VoicePosition = [number, number, number]

interface VoicePeer {
  peerId: string
  username?: string
  connected: boolean
}

interface PeerConnectionState {
  pc: RTCPeerConnection
  audio?: HTMLAudioElement
}

interface UseVoiceChatOptions {
  socket: Socket | null
  connected: boolean
  roomType: VoiceRoomType
  roomId: string | null
  selfId: string | null
  username?: string | null
  positions?: Record<string, VoicePosition | undefined>
  proximity?: {
    enabled: boolean
    minDistance?: number
    maxDistance?: number
  }
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
]

function getDistanceVolume(
  from: VoicePosition | undefined,
  to: VoicePosition | undefined,
  minDistance: number,
  maxDistance: number,
) {
  if (!from || !to) return 1
  const dx = from[0] - to[0]
  const dy = from[1] - to[1]
  const dz = from[2] - to[2]
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
  if (distance <= minDistance) return 1
  if (distance >= maxDistance) return 0
  return Math.max(0, Math.min(1, 1 - (distance - minDistance) / (maxDistance - minDistance)))
}

export function useVoiceChat({
  socket,
  connected,
  roomType,
  roomId,
  selfId,
  username,
  positions,
  proximity,
}: UseVoiceChatOptions) {
  const [enabled, setEnabled] = useState(false)
  const [starting, setStarting] = useState(false)
  const [muted, setMutedState] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [peers, setPeers] = useState<Record<string, VoicePeer>>({})

  const streamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef<Map<string, PeerConnectionState>>(new Map())
  const positionsRef = useRef<Record<string, VoicePosition | undefined>>({})
  const selfIdRef = useRef<string | null>(selfId)
  const socketRef = useRef<Socket | null>(socket)
  const enabledRef = useRef(false)

  const minDistance = proximity?.minDistance ?? 4
  const maxDistance = proximity?.maxDistance ?? 24
  const proximityEnabled = Boolean(proximity?.enabled)

  useEffect(() => {
    socketRef.current = socket
  }, [socket])

  useEffect(() => {
    selfIdRef.current = selfId
  }, [selfId])

  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  useEffect(() => {
    positionsRef.current = positions ?? {}
    if (!proximityEnabled || !selfId) return
    const selfPosition = positions?.[selfId]
    for (const [peerId, peer] of peerConnectionsRef.current.entries()) {
      if (!peer.audio) continue
      peer.audio.volume = getDistanceVolume(selfPosition, positions?.[peerId], minDistance, maxDistance)
    }
  }, [positions, proximityEnabled, selfId, minDistance, maxDistance])

  const roomPayload = useMemo(() => ({
    roomType,
    roomId: roomId ?? '',
  }), [roomId, roomType])

  const cleanupPeer = useCallback((peerId: string) => {
    const peer = peerConnectionsRef.current.get(peerId)
    if (!peer) return
    try {
      peer.pc.onicecandidate = null
      peer.pc.ontrack = null
      peer.pc.close()
    } catch {}
    try {
      if (peer.audio) {
        peer.audio.pause()
        peer.audio.srcObject = null
      }
    } catch {}
    peerConnectionsRef.current.delete(peerId)
    setPeers((prev) => {
      const next = { ...prev }
      delete next[peerId]
      return next
    })
  }, [])

  const cleanupAll = useCallback((emitLeave: boolean) => {
    if (emitLeave && socketRef.current?.connected && roomPayload.roomId) {
      socketRef.current.emit('voice:leave', roomPayload)
    }
    for (const peerId of Array.from(peerConnectionsRef.current.keys())) {
      cleanupPeer(peerId)
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop()
      }
      streamRef.current = null
    }
    setPeers({})
    setEnabled(false)
    setStarting(false)
    setMutedState(false)
  }, [cleanupPeer, roomPayload])

  const createPeerConnection = useCallback((peerId: string, peerUsername?: string) => {
    const existing = peerConnectionsRef.current.get(peerId)
    if (existing) return existing.pc

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    const stream = streamRef.current
    if (stream) {
      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream)
      }
    }

    pc.onicecandidate = (event) => {
      if (!event.candidate || !socketRef.current?.connected || !roomPayload.roomId) return
      socketRef.current.emit('voice:ice-candidate', {
        ...roomPayload,
        to: peerId,
        candidate: event.candidate,
      })
    }

    pc.ontrack = (event) => {
      let peer = peerConnectionsRef.current.get(peerId)
      if (!peer) return
      if (!peer.audio) {
        peer.audio = new Audio()
        peer.audio.autoplay = true
        peer.audio.setAttribute('playsinline', 'true')
      }
      peer.audio.srcObject = event.streams[0]
      if (proximityEnabled && selfIdRef.current) {
        peer.audio.volume = getDistanceVolume(
          positionsRef.current[selfIdRef.current],
          positionsRef.current[peerId],
          minDistance,
          maxDistance,
        )
      } else {
        peer.audio.volume = 1
      }
      peer.audio.play().catch(() => {})
      setPeers((prev) => ({
        ...prev,
        [peerId]: { peerId, username: prev[peerId]?.username ?? peerUsername, connected: true },
      }))
    }

    pc.onconnectionstatechange = () => {
      const isConnected = pc.connectionState === 'connected'
      const isClosed = pc.connectionState === 'closed' || pc.connectionState === 'failed'
      if (isClosed) {
        cleanupPeer(peerId)
        return
      }
      setPeers((prev) => ({
        ...prev,
        [peerId]: { peerId, username: prev[peerId]?.username ?? peerUsername, connected: isConnected },
      }))
    }

    peerConnectionsRef.current.set(peerId, { pc })
    setPeers((prev) => ({
      ...prev,
      [peerId]: { peerId, username: prev[peerId]?.username ?? peerUsername, connected: false },
    }))
    return pc
  }, [cleanupPeer, maxDistance, minDistance, proximityEnabled, roomPayload])

  const createOffer = useCallback(async (peerId: string, peerUsername?: string) => {
    if (!socketRef.current?.connected || !roomPayload.roomId || !enabledRef.current) return
    const pc = createPeerConnection(peerId, peerUsername)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    socketRef.current.emit('voice:offer', { ...roomPayload, to: peerId, offer })
  }, [createPeerConnection, roomPayload])

  const start = useCallback(async () => {
    if (!socket || !connected || !roomId || !selfId) {
      setError('Connect to the room first.')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Microphone access is not available in this browser.')
      return
    }

    setStarting(true)
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      })
      streamRef.current = stream
      for (const track of stream.getAudioTracks()) {
        track.enabled = !muted
      }
      setEnabled(true)
      enabledRef.current = true
      socket.emit('voice:join', {
        ...roomPayload,
        peerId: selfId,
        username: username || selfId,
      })
    } catch (err: any) {
      setError(err?.name === 'NotAllowedError' ? 'Microphone permission was blocked.' : 'Could not start voice chat.')
      cleanupAll(false)
    } finally {
      setStarting(false)
    }
  }, [cleanupAll, connected, muted, roomId, roomPayload, selfId, socket, username])

  const stop = useCallback(() => {
    cleanupAll(true)
  }, [cleanupAll])

  const setMuted = useCallback((nextMuted: boolean) => {
    setMutedState(nextMuted)
    if (streamRef.current) {
      for (const track of streamRef.current.getAudioTracks()) {
        track.enabled = !nextMuted
      }
    }
  }, [])

  useEffect(() => {
    if (!socket) return

    const handleParticipants = ({ participants }: { participants?: Array<{ peerId: string; username?: string }> }) => {
      if (!enabledRef.current) return
      for (const participant of participants ?? []) {
        if (!participant.peerId || participant.peerId === selfIdRef.current) continue
        createOffer(participant.peerId, participant.username).catch(() => {
          cleanupPeer(participant.peerId)
        })
      }
    }

    const handleOffer = async ({ from, offer }: { from?: string; offer?: RTCSessionDescriptionInit }) => {
      if (!enabledRef.current || !from || !offer || from === selfIdRef.current) return
      try {
        const pc = createPeerConnection(from)
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        socket.emit('voice:answer', { ...roomPayload, to: from, answer })
      } catch {
        cleanupPeer(from)
      }
    }

    const handleAnswer = async ({ from, answer }: { from?: string; answer?: RTCSessionDescriptionInit }) => {
      if (!enabledRef.current || !from || !answer) return
      try {
        const pc = peerConnectionsRef.current.get(from)?.pc
        if (!pc) return
        await pc.setRemoteDescription(new RTCSessionDescription(answer))
      } catch {
        cleanupPeer(from)
      }
    }

    const handleIceCandidate = async ({ from, candidate }: { from?: string; candidate?: RTCIceCandidateInit }) => {
      if (!enabledRef.current || !from || !candidate) return
      try {
        const pc = peerConnectionsRef.current.get(from)?.pc
        if (!pc) return
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch {}
    }

    const handleUserLeft = ({ peerId }: { peerId?: string }) => {
      if (peerId) cleanupPeer(peerId)
    }

    const handleVoiceError = ({ message }: { message?: string }) => {
      setError(message || 'Voice chat failed.')
      cleanupAll(false)
    }

    const handleReplaced = () => {
      setError('Voice moved to another tab.')
      cleanupAll(false)
    }

    socket.on('voice:participants', handleParticipants)
    socket.on('voice:offer', handleOffer)
    socket.on('voice:answer', handleAnswer)
    socket.on('voice:ice-candidate', handleIceCandidate)
    socket.on('voice:user_left', handleUserLeft)
    socket.on('voice:error', handleVoiceError)
    socket.on('voice:replaced', handleReplaced)

    return () => {
      socket.off('voice:participants', handleParticipants)
      socket.off('voice:offer', handleOffer)
      socket.off('voice:answer', handleAnswer)
      socket.off('voice:ice-candidate', handleIceCandidate)
      socket.off('voice:user_left', handleUserLeft)
      socket.off('voice:error', handleVoiceError)
      socket.off('voice:replaced', handleReplaced)
    }
  }, [cleanupAll, cleanupPeer, createOffer, createPeerConnection, roomPayload, socket])

  useEffect(() => {
    if (!connected && enabledRef.current) cleanupAll(false)
  }, [cleanupAll, connected])

  useEffect(() => {
    return () => cleanupAll(true)
  }, [cleanupAll])

  return {
    enabled,
    starting,
    muted,
    error,
    peers: Object.values(peers),
    peerCount: Object.keys(peers).length,
    start,
    stop,
    setMuted,
  }
}
