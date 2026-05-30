import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from 'remotion';
import { GameScene } from '../components/GameScene';
import { INTRO_SEQUENCE } from '../lib/gameplay-scripts';

interface GameIntroProps {
  tagline: string;
}

/**
 * GameIntro — 5-second cinematic logo reveal with the REAL 3D arena behind it.
 *
 * Dramatic flythrough camera over the actual game arena with POOKIE balls,
 * snow, HDRI sky — overlaid with animated title card.
 *
 * 300 frames @ 60fps = 5 seconds
 */


export const GameIntro: React.FC<GameIntroProps> = ({ tagline }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({
    frame: frame - 30,
    fps,
    config: { damping: 10, stiffness: 60 },
  });

  const taglineOpacity = interpolate(frame, [120, 160], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const taglineY = interpolate(frame, [120, 160], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const outroOpacity = interpolate(frame, [250, 290], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Overlay fades in from full black, then the 3D scene reveals
  const sceneFadeIn = interpolate(frame, [0, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#020617' }}>
      {/* ── 3D scene — flythrough camera over the arena ── */}
      <AbsoluteFill style={{ opacity: sceneFadeIn * outroOpacity }}>
        <GameScene
          script={INTRO_SEQUENCE}
          showBlimp
          showSnow
          showClouds
        />
      </AbsoluteFill>

      {/* ── Dark overlay for readability ── */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, rgba(2,6,23,0.6) 0%, rgba(2,6,23,0.82) 70%)`,
          opacity: outroOpacity,
        }}
      />

      {/* ── Title card ── */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: outroOpacity,
        }}
      >
        {/* Pookie ball glow */}
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ff66cc 0%, #ec4899 50%, #8b5cf6 100%)',
            boxShadow: '0 0 40px rgba(236,72,153,0.5), 0 0 80px rgba(139,92,246,0.3)',
            transform: `scale(${Math.max(0, logoScale)})`,
            marginBottom: 32,
          }}
        />

        <h1
          style={{
            fontSize: 64,
            fontWeight: 900,
            color: 'white',
            textTransform: 'uppercase',
            letterSpacing: 6,
            margin: 0,
            transform: `scale(${Math.max(0, logoScale)})`,
            textShadow: '0 4px 20px rgba(0,0,0,0.8), 0 0 40px rgba(139,92,246,0.3)',
            fontFamily: 'Heavitas, Arial, sans-serif',
          }}
        >
          POOKIE
        </h1>
        <h2
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.7)',
            textTransform: 'uppercase',
            letterSpacing: 12,
            margin: 0,
            marginTop: 4,
            transform: `scale(${Math.max(0, logoScale)})`,
            fontFamily: 'Heavitas, Arial, sans-serif',
          }}
        >
          SUMO ROYALE
        </h2>

        <p
          style={{
            fontSize: 22,
            fontWeight: 500,
            color: '#ec4899',
            marginTop: 40,
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
          }}
        >
          {tagline}
        </p>
      </AbsoluteFill>

      {/* Initial flash */}
      <Sequence from={28} durationInFrames={10}>
        <AbsoluteFill
          style={{
            backgroundColor: 'white',
            opacity: interpolate(frame - 28, [0, 10], [0.6, 0], { extrapolateRight: 'clamp' }),
          }}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
