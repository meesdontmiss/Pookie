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
import { FIGHT_SEQUENCE } from '../lib/gameplay-scripts';

interface GameplayHighlightProps {
  title: string;
  subtitle: string;
  ballColor: string;
  playerName: string;
}

/**
 * GameplayHighlight — Cinematic highlight reel using SCRIPTED 3D fight.
 *
 * Structure (at 60fps, 1800 frames = 30s):
 *   0–120:    Intro title card (3D scene behind it)
 *   120–1500: SCRIPTED FIGHT — real pushes, eliminations, falling off
 *   1500–1800: Outro with stats & CTA
 */

export const GameplayHighlight: React.FC<GameplayHighlightProps> = ({
  title,
  subtitle,
  ballColor,
  playerName,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const subtitleOpacity = interpolate(frame, [30, 60], [0, 1], { extrapolateRight: 'clamp' });
  const introFade = interpolate(frame, [90, 120], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const outroOpacity = interpolate(frame, [1500, 1560], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#020617' }}>
      {/* ── 3D SCENE — scripted fight sequence runs full duration ── */}
      <AbsoluteFill>
        <GameScene
          script={FIGHT_SEQUENCE}
          timeOffset={frame < 120 ? -2 : 2}
          showBlimp
          showSnow
          showClouds
        />
      </AbsoluteFill>

      {/* ── INTRO OVERLAY (0–120 frames / 0–2s) ── */}
      <Sequence from={0} durationInFrames={120}>
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: `radial-gradient(ellipse at center, rgba(2,6,23,0.85) 0%, rgba(2,6,23,0.95) 70%)`,
            opacity: introFade,
          }}
        >
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              backgroundColor: ballColor,
              boxShadow: `0 0 60px ${ballColor}, 0 0 120px ${ballColor}40`,
              transform: `scale(${titleScale})`,
              marginBottom: 32,
            }}
          />
          <h1
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: 'white',
              textTransform: 'uppercase',
              letterSpacing: 4,
              transform: `scale(${titleScale})`,
              textShadow: '0 4px 20px rgba(0,0,0,0.8)',
              margin: 0,
              fontFamily: 'Heavitas, Arial, sans-serif',
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontSize: 28,
              color: 'rgba(255,255,255,0.7)',
              opacity: subtitleOpacity,
              marginTop: 12,
              fontWeight: 500,
            }}
          >
            {subtitle}
          </p>
        </AbsoluteFill>
      </Sequence>

      {/* ── HUD OVERLAY during gameplay ── */}
      <Sequence from={120} durationInFrames={1380}>
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          {/* Player badge */}
          <div
            style={{
              position: 'absolute',
              top: 24,
              left: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              backgroundColor: 'rgba(2,6,23,0.72)',
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid rgba(148,163,184,0.25)',
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: ballColor,
                boxShadow: `0 0 8px ${ballColor}`,
              }}
            />
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'white',
                textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                fontFamily: 'Heavitas, Arial, sans-serif',
              }}
            >
              {playerName}
            </span>
          </div>

          {/* Alive counter */}
          <div
            style={{
              position: 'absolute',
              top: 24,
              right: 24,
              backgroundColor: 'rgba(2,6,23,0.72)',
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid rgba(148,163,184,0.25)',
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'white',
                fontFamily: 'Heavitas, Arial, sans-serif',
              }}
            >
              Alive: 4
            </span>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* ── OUTRO (1500–1800 frames / 25–30s) ── */}
      <Sequence from={1500} durationInFrames={300}>
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(ellipse at center, rgba(2,6,23,0.88) 0%, rgba(2,6,23,0.96) 70%)',
            opacity: outroOpacity,
          }}
        >
          <h2
            style={{
              fontSize: 48,
              fontWeight: 800,
              color: 'white',
              textTransform: 'uppercase',
              margin: 0,
              fontFamily: 'Heavitas, Arial, sans-serif',
            }}
          >
            GG WP
          </h2>
          <p style={{ fontSize: 22, color: ballColor, marginTop: 16, fontWeight: 600 }}>
            pookiesumoroyale.com
          </p>
          <div
            style={{
              marginTop: 40,
              padding: '12px 32px',
              borderRadius: 12,
              border: `2px solid ${ballColor}`,
              backgroundColor: `${ballColor}20`,
            }}
          >
            <span style={{ fontSize: 18, color: 'white', fontWeight: 700 }}>
              PLAY NOW — WIN SOL
            </span>
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
