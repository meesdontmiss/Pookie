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

interface KillMontageProps {
  kills: number;
  playerName: string;
  ballColor: string;
}

// Colors referenced in the fight script — kept for potential future HUD use
const _VICTIM_COLORS = ['#9ae6ff', '#ffab00', '#76ff03', '#e040fb', '#ff5252', '#64ffda', '#ffd740', '#b388ff'];

/**
 * KillMontage — Fast-paced elimination highlight reel.
 *
 * Full 3D scene with real arena/models + dramatic chase-cam angles per kill,
 * screen-shake overlays, and kill counter HUD.
 *
 * 900 frames @ 60fps = 15 seconds
 */
export const KillMontage: React.FC<KillMontageProps> = ({
  kills,
  playerName,
  ballColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const framesPerKill = Math.floor(750 / kills);
  const currentKillIndex = Math.min(
    Math.floor(Math.max(0, frame - 90) / framesPerKill),
    kills - 1,
  );

  // Use the scripted fight sequence for real gameplay motion

  // Shake on each kill transition
  const killFrame = Math.max(0, frame - 90 - currentKillIndex * framesPerKill);
  const shakeIntensity = interpolate(killFrame, [0, 10, 30], [0, 6, 0], { extrapolateRight: 'clamp' });
  const shakeX = Math.sin(killFrame * 2.5) * shakeIntensity;
  const shakeY = Math.cos(killFrame * 3.1) * shakeIntensity;
  const flash = interpolate(killFrame, [0, 5, 20], [0.4, 0.2, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#020617' }}>
      {/* ── 3D scene — scripted fight with dynamic camera ── */}
      <AbsoluteFill style={{ transform: frame >= 90 && frame < 840 ? `translate(${shakeX}px, ${shakeY}px)` : undefined }}>
        <GameScene
          script={FIGHT_SEQUENCE}
          timeOffset={1.5}
          showBlimp={false}
          showSnow
          showClouds={false}
        />
      </AbsoluteFill>

      {/* Impact flash overlay */}
      {frame >= 90 && frame < 840 && flash > 0 && (
        <AbsoluteFill style={{ backgroundColor: ballColor, opacity: flash, pointerEvents: 'none' }} />
      )}

      {/* ── Intro (0–90 frames) ── */}
      <Sequence from={0} durationInFrames={90}>
        <AbsoluteFill
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle, rgba(2,6,23,0.9) 0%, rgba(2,6,23,0.97) 70%)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transform: `scale(${spring({ frame, fps, config: { damping: 10, stiffness: 80 } })})`,
            }}
          >
            <span
              style={{
                fontSize: 96,
                fontWeight: 900,
                color: ballColor,
                textShadow: `0 0 40px ${ballColor}, 0 0 80px ${ballColor}40`,
                fontFamily: 'Heavitas, Arial, sans-serif',
              }}
            >
              {kills}
            </span>
            <span
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: 'white',
                textTransform: 'uppercase',
                letterSpacing: 8,
                fontFamily: 'Heavitas, Arial, sans-serif',
              }}
            >
              ELIMINATIONS
            </span>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* ── Kill counter HUD (90–840) ── */}
      <Sequence from={90} durationInFrames={750}>
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          {/* Kill counter badge */}
          <div
            style={{
              position: 'absolute',
              bottom: 48,
              right: 48,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              backgroundColor: 'rgba(2,6,23,0.8)',
              padding: '12px 24px',
              borderRadius: 12,
              border: `2px solid ${ballColor}60`,
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: ballColor,
                boxShadow: `0 0 12px ${ballColor}`,
              }}
            />
            <span style={{ fontSize: 28, fontWeight: 800, color: 'white', fontFamily: 'Heavitas, Arial, sans-serif' }}>
              {currentKillIndex + 1}/{kills}
            </span>
          </div>

          {/* Player name */}
          <div
            style={{
              position: 'absolute',
              top: 40,
              left: 40,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              backgroundColor: 'rgba(2,6,23,0.72)',
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid rgba(148,163,184,0.25)',
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                backgroundColor: ballColor,
                boxShadow: `0 0 6px ${ballColor}`,
              }}
            />
            <span style={{ fontSize: 18, fontWeight: 700, color: 'white', fontFamily: 'Heavitas, Arial, sans-serif' }}>
              {playerName}
            </span>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* ── Outro (840–900 frames) ── */}
      <Sequence from={840} durationInFrames={60}>
        <AbsoluteFill
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(2,6,23,0.92)',
            opacity: interpolate(frame - 840, [0, 20], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          <span
            style={{
              fontSize: 64,
              fontWeight: 900,
              color: ballColor,
              textShadow: `0 0 30px ${ballColor}`,
              fontFamily: 'Heavitas, Arial, sans-serif',
            }}
          >
            UNSTOPPABLE
          </span>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
