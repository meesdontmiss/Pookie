'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const CinematicSumoBg = dynamic(() => import('@/components/lobby/cinematic-sumo-bg'), { ssr: false });

export default function CinematicExportPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<'idle' | 'prepping' | 'recording' | 'finalizing' | 'error'>('idle');
  const chunksRef = useRef<BlobPart[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const TARGET_W = 1920;
  const TARGET_H = 1080;

  useEffect(() => {
    const handle = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const s = Math.min(vw / TARGET_W, vh / TARGET_H);
      setScale(s);
    };
    handle();
    window.addEventListener('resize', handle);
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      try { recorderRef.current?.stop(); } catch {}
      window.removeEventListener('resize', handle);
    };
  }, []);

  const recordFor = useCallback(async (seconds: number) => {
    try {
      setStatus('prepping');
      chunksRef.current = [];
      // Wait a tick for the canvas to mount
      await new Promise((r) => setTimeout(r, 200));
      const canvas = containerRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
      if (!canvas) {
        setStatus('error');
        alert('Could not find the canvas to record.');
        return;
      }
      const stream = (canvas as any).captureStream?.(60) as MediaStream | undefined;
      if (!stream) {
        setStatus('error');
        alert('Canvas captureStream is not available in this browser.');
        return;
      }
      const mimeCandidates = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
      ];
      const mimeType = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';
      // High bitrate for near-original quality (≈20–30 Mbps @1080p)
      const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 25000000 });
      recorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        setStatus('finalizing');
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pookie-sumo-cinematic.webm';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setIsRecording(false);
        setStatus('idle');
      };
      rec.start(250);
      setIsRecording(true);
      setStatus('recording');
      timeoutRef.current = window.setTimeout(() => {
        try { rec.stop(); } catch {}
      }, seconds * 1000);
    } catch (e) {
      console.error(e);
      setStatus('error');
      setIsRecording(false);
      alert('Recording failed. See console for details.');
    }
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      {/* Fixed logical render size (1080p) scaled to fit window; captureStream uses the canvas logical size */}
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: `${TARGET_W}px`,
          height: `${TARGET_H}px`,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: 'center center',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.05) inset',
        }}
      >
        {/* Use singleLayer for reliable capture (one canvas) */}
        <CinematicSumoBg singleLayer />
      </div>

      {/* Controls overlay */}
      <div
        style={{
          position: 'fixed',
          top: 76,
          left: 12,
          display: 'flex',
          gap: 8,
          background: 'rgba(3, 7, 18, 0.6)',
          border: '1px solid rgba(255,255,255,0.15)',
          backdropFilter: 'blur(8px)',
          borderRadius: 10,
          padding: '8px 10px',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
          zIndex: 2000,
        }}
      >
        <button
          disabled={isRecording}
          onClick={() => recordFor(20)}
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.2)',
            background: isRecording ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: '#fff',
            fontWeight: 700,
            cursor: isRecording ? 'not-allowed' : 'pointer',
          }}
        >
          {isRecording ? 'Recording…' : 'Record 20s'}
        </button>
        <button
          disabled={isRecording}
          onClick={() => recordFor(60)}
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.2)',
            background: isRecording ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #06b6d4, #0ea5e9)',
            color: '#fff',
            fontWeight: 700,
            cursor: isRecording ? 'not-allowed' : 'pointer',
          }}
        >
          {isRecording ? 'Recording…' : 'Record 60s'}
        </button>
        <button
          onClick={() => {
            try { recorderRef.current?.stop(); } catch {}
          }}
          disabled={!isRecording}
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            color: '#fff',
            fontWeight: 700,
            cursor: isRecording ? 'pointer' : 'not-allowed',
            opacity: isRecording ? 1 : 0.6,
          }}
        >
          Stop & Download
        </button>
        <div style={{ alignSelf: 'center', fontSize: 12, opacity: 0.85 }}>
          Status: {status}
        </div>
      </div>
    </div>
  );
}


