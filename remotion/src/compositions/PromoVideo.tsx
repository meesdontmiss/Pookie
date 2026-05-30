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
import {
  FIGHT_SEQUENCE,
  INTRO_SEQUENCE,
  VICTORY_SEQUENCE,
} from '../lib/gameplay-scripts';

/**
 * PromoVideo — THE single promotional video for Pookie Sumo Royale.
 *
 * 60 seconds @ 60fps = 3600 frames. One continuous, cohesive video that
 * explains the platform to new users using real 3D game assets and
 * scripted gameplay choreography.
 *
 * TIMELINE:
 *   0:00–0:05  Cinematic arena reveal (players drop from sky)
 *   0:05–0:09  Title + tagline
 *   0:09–0:12  Core concept text
 *   0:12–0:30  FULL FIGHT (18s of real scripted gameplay with HUD)
 *   0:30–0:34  Victory moment
 *   0:34–0:40  How it works (wager → fight → win)
 *   0:40–0:48  Lobby & color system
 *   0:48–0:54  Feature bullets
 *   0:54–1:00  CTA
 */

const FONT = 'Heavitas, Inter, system-ui, sans-serif';

export const PromoVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: '#020617' }}>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          0:00–0:05 — ARENA REVEAL
          Camera swoops down from above, players drop onto the platform.
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Sequence durationInFrames={300}>
        <GameScene script={INTRO_SEQUENCE} showBlimp showSnow showClouds />
        {/* Fade from black */}
        <AbsoluteFill
          style={{
            backgroundColor: '#020617',
            opacity: interpolate(frame, [0, 50], [1, 0], { extrapolateRight: 'clamp' }),
          }}
        />
      </Sequence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          0:05–0:09 — TITLE
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Sequence from={300} durationInFrames={240}>
        <GameScene script={INTRO_SEQUENCE} timeOffset={-5} showBlimp showSnow showClouds />
        <AbsoluteFill style={{
          background: 'radial-gradient(ellipse, rgba(2,6,23,0.75) 0%, rgba(2,6,23,0.92) 70%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <TitleCard frame={frame - 300} fps={fps} />
        </AbsoluteFill>
      </Sequence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          0:09–0:12 — CONCEPT
          "Push them off. Last one standing wins SOL."
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Sequence from={540} durationInFrames={180}>
        <GameScene script={FIGHT_SEQUENCE} timeOffset={-9} showBlimp={false} showSnow showClouds={false} />
        <AbsoluteFill style={{
          background: 'linear-gradient(to top, rgba(2,6,23,0.88) 0%, transparent 40%)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 80,
        }}>
          <ConceptText frame={frame - 540} fps={fps} />
        </AbsoluteFill>
      </Sequence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          0:12–0:30 — THE FIGHT (18s)
          Full scripted gameplay. Players charge, push, eliminate.
          Dynamic camera. Kill feed HUD. Alive counter.
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Sequence from={720} durationInFrames={1080}>
        <GameScene script={FIGHT_SEQUENCE} showBlimp showSnow showClouds />
        <FightHUD frame={frame - 720} fps={fps} />
      </Sequence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          0:30–0:34 — VICTORY
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Sequence from={1800} durationInFrames={240}>
        <GameScene script={VICTORY_SEQUENCE} showBlimp showSnow showClouds />
        <VictoryOverlay frame={frame - 1800} fps={fps} />
      </Sequence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          0:34–0:40 — HOW IT WORKS
          Wager → Fight → Win
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Sequence from={2040} durationInFrames={360}>
        <GameScene
          cameraMode="orbit"
          orbitSpeed={0.03}
          players={[
            { id: 'w1', ballColor: '#ff66cc', phase: 0, orbitRadius: 6 },
            { id: 'w2', ballColor: '#00e5ff', phase: Math.PI, orbitRadius: 6 },
          ]}
          showBlimp showSnow showClouds={false}
        />
        <HowItWorks frame={frame - 2040} fps={fps} />
      </Sequence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          0:40–0:48 — LOBBY & COLORS
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Sequence from={2400} durationInFrames={480}>
        <GameScene
          cameraMode="orbit"
          orbitSpeed={0.04}
          players={[
            { id: 'c1', ballColor: '#ff66cc', phase: 0, orbitRadius: 5 },
            { id: 'c2', ballColor: '#00e5ff', phase: Math.PI * 0.5, orbitRadius: 5 },
            { id: 'c3', ballColor: '#ffab00', phase: Math.PI, orbitRadius: 5 },
            { id: 'c4', ballColor: '#76ff03', phase: Math.PI * 1.5, orbitRadius: 5 },
            { id: 'c5', ballColor: '#e040fb', phase: Math.PI * 0.25, orbitRadius: 7 },
            { id: 'c6', ballColor: '#ff5252', phase: Math.PI * 0.75, orbitRadius: 7 },
            { id: 'c7', ballColor: '#64ffda', phase: Math.PI * 1.25, orbitRadius: 7 },
            { id: 'c8', ballColor: '#ffd740', phase: Math.PI * 1.75, orbitRadius: 7 },
          ]}
          showBlimp={false} showSnow showClouds={false}
        />
        <LobbySection frame={frame - 2400} fps={fps} />
      </Sequence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          0:48–0:54 — FEATURES
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Sequence from={2880} durationInFrames={360}>
        <GameScene cameraMode="flythrough" showBlimp showSnow showClouds />
        <Features frame={frame - 2880} fps={fps} />
      </Sequence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          0:54–1:00 — CTA
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Sequence from={3240} durationInFrames={360}>
        <GameScene
          cameraMode="static"
          players={[{ id: 'cta', ballColor: '#ff66cc', phase: 0, orbitRadius: 0.01 }]}
          showBlimp showSnow showClouds
        />
        <CTA frame={frame - 3240} fps={fps} />
      </Sequence>

      {/* Global cross-section transitions */}
      <Transitions frame={frame} />
    </AbsoluteFill>
  );
};

// ════════════════════════════════════════════════════════════════════
// SECTION COMPONENTS
// ════════════════════════════════════════════════════════════════════

const TitleCard: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const scale = spring({ frame: frame - 15, fps, config: { damping: 12, stiffness: 80 } });
  const tagOp = interpolate(frame, [50, 80], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const tagY = interpolate(frame, [50, 80], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <>
      <div style={{
        width: 90, height: 90, borderRadius: '50%',
        background: 'linear-gradient(135deg, #ff66cc 0%, #8b5cf6 100%)',
        boxShadow: '0 0 50px rgba(255,102,204,0.5), 0 0 100px rgba(139,92,246,0.3)',
        transform: `scale(${Math.max(0, scale)})`,
        marginBottom: 24,
      }} />
      <h1 style={{
        fontSize: 72, fontWeight: 900, color: 'white', fontFamily: FONT,
        textTransform: 'uppercase', letterSpacing: 3, margin: 0,
        transform: `scale(${Math.max(0, scale)})`,
        textShadow: '0 4px 30px rgba(0,0,0,0.9)',
      }}>
        POOKIE SUMO ROYALE
      </h1>
      <p style={{
        fontSize: 26, color: 'rgba(255,255,255,0.75)', marginTop: 14,
        fontWeight: 500, fontFamily: FONT, opacity: tagOp,
        transform: `translateY(${tagY}px)`,
      }}>
        The On-Chain Sumo Battle Royale
      </p>
    </>
  );
};

const ConceptText: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const l1 = spring({ frame: frame - 8, fps, config: { damping: 14 } });
  const l2 = spring({ frame: frame - 35, fps, config: { damping: 14 } });
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{
        fontSize: 44, fontWeight: 800, color: 'white', margin: 0, fontFamily: FONT,
        opacity: Math.max(0, l1), transform: `translateY(${(1 - Math.max(0, l1)) * 25}px)`,
        textShadow: '0 4px 20px rgba(0,0,0,0.9)',
      }}>
        Push them off the arena.
      </p>
      <p style={{
        fontSize: 44, fontWeight: 800, color: '#ff66cc', margin: 0, marginTop: 10, fontFamily: FONT,
        opacity: Math.max(0, l2), transform: `translateY(${(1 - Math.max(0, l2)) * 25}px)`,
        textShadow: '0 4px 20px rgba(0,0,0,0.9)',
      }}>
        Last one standing wins SOL.
      </p>
    </div>
  );
};

const FightHUD: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const t = frame / fps;
  const elim1 = t > 5;
  const elim2 = t > 11;
  const elim3 = t > 16.5;
  const alive = 4 - (elim1 ? 1 : 0) - (elim2 ? 1 : 0) - (elim3 ? 1 : 0);

  const kills: { name: string; at: number; color: string }[] = [];
  if (elim1) kills.push({ name: 'GoldRush99', at: 5, color: '#ffab00' });
  if (elim2) kills.push({ name: 'LimeTime', at: 11, color: '#76ff03' });
  if (elim3) kills.push({ name: 'xBlueIce', at: 16.5, color: '#00e5ff' });

  // Flash on elimination
  const flashOp = (() => {
    for (const k of [5, 11, 16.5]) {
      const d = t - k;
      if (d >= 0 && d < 0.4) return interpolate(d, [0, 0.1, 0.4], [0, 0.35, 0], { extrapolateRight: 'clamp' });
    }
    return 0;
  })();

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* Flash */}
      {flashOp > 0 && <AbsoluteFill style={{ backgroundColor: '#ff66cc', opacity: flashOp }} />}

      {/* Top HUD */}
      <div style={{ position: 'absolute', top: 20, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0 28px' }}>
        <div style={{ ...hudBadge }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ff66cc', boxShadow: '0 0 6px #ff66cc' }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: 'white', fontFamily: FONT }}>YOU</span>
        </div>
        <div style={{ ...hudBadge }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'white', fontFamily: FONT }}>
            ALIVE {alive}/4
          </span>
        </div>
      </div>

      {/* Kill feed */}
      <div style={{ position: 'absolute', bottom: 24, left: 24, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {kills.map((k, i) => {
          const age = t - k.at;
          const op = interpolate(age, [0, 0.25, 5, 6], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 7, opacity: op,
              background: 'rgba(2,6,23,0.82)', padding: '5px 10px', borderRadius: 5,
              border: '1px solid rgba(255,102,204,0.3)',
            }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#ff66cc' }} />
              <span style={{ fontSize: 12, color: 'white', fontWeight: 600 }}>YOU</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>eliminated</span>
              <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: k.color }} />
              <span style={{ fontSize: 12, color: 'white', fontWeight: 600 }}>{k.name}</span>
            </div>
          );
        })}
      </div>

      {/* "ELIMINATED" flash text on kills */}
      {kills.map((k, i) => {
        const age = t - k.at;
        if (age < 0 || age > 1.5) return null;
        const s = spring({ frame: Math.round(age * fps), fps, config: { damping: 8, stiffness: 120 } });
        const fadeOut = interpolate(age, [0.8, 1.5], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return (
          <AbsoluteFill key={i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: fadeOut,
          }}>
            <span style={{
              fontSize: 52, fontWeight: 900, color: 'white', fontFamily: FONT,
              transform: `scale(${Math.max(0, s)})`,
              textShadow: `0 0 30px ${k.color}, 0 4px 15px rgba(0,0,0,0.8)`,
            }}>
              ELIMINATED
            </span>
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};

const VictoryOverlay: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const pop = spring({ frame: frame - 20, fps, config: { damping: 8, stiffness: 100 } });
  const solPop = spring({ frame: frame - 60, fps, config: { damping: 10, stiffness: 80 } });
  const glow = Math.sin(frame * 0.08) * 0.3 + 0.7;

  return (
    <AbsoluteFill style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: `radial-gradient(ellipse, rgba(255,102,204,${0.12 * glow}) 0%, transparent 55%)`,
    }}>
      <span style={{
        fontSize: 84, fontWeight: 900, color: 'white', fontFamily: FONT,
        transform: `scale(${Math.max(0, pop)})`,
        textShadow: '0 0 40px rgba(255,102,204,0.6), 0 4px 20px rgba(0,0,0,0.8)',
      }}>
        VICTORY ROYALE
      </span>
      <span style={{
        fontSize: 32, color: '#76ff03', marginTop: 16, fontWeight: 800, fontFamily: FONT,
        transform: `scale(${Math.max(0, solPop)})`,
        textShadow: '0 0 20px rgba(118,255,3,0.5)',
      }}>
        +0.5 SOL EARNED
      </span>
    </AbsoluteFill>
  );
};

const HowItWorks: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const steps = [
    { label: '1', title: 'WAGER', desc: 'Put up SOL to enter', color: '#ffab00', delay: 20 },
    { label: '2', title: 'FIGHT', desc: 'Push everyone off', color: '#ff66cc', delay: 55 },
    { label: '3', title: 'WIN', desc: 'Winner takes the pot', color: '#76ff03', delay: 90 },
  ];

  return (
    <AbsoluteFill style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse, rgba(2,6,23,0.8) 0%, rgba(2,6,23,0.94) 70%)',
    }}>
      <h2 style={{
        fontSize: 48, fontWeight: 900, color: 'white', fontFamily: FONT, margin: 0, marginBottom: 36,
        opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        textShadow: '0 4px 20px rgba(0,0,0,0.8)',
      }}>
        HOW IT WORKS
      </h2>
      <div style={{ display: 'flex', gap: 32 }}>
        {steps.map((s, i) => {
          const pop = spring({ frame: frame - s.delay, fps, config: { damping: 12, stiffness: 90 } });
          return (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              transform: `scale(${Math.max(0, pop)})`, opacity: Math.max(0, pop),
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: `${s.color}25`, border: `3px solid ${s.color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontWeight: 900, color: s.color, fontFamily: FONT,
                boxShadow: `0 0 20px ${s.color}30`,
              }}>
                {s.label}
              </div>
              <span style={{ fontSize: 22, fontWeight: 800, color: 'white', fontFamily: FONT }}>{s.title}</span>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{s.desc}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const LobbySection: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const colors = ['#ff66cc', '#00e5ff', '#ffab00', '#76ff03', '#e040fb', '#ff5252', '#64ffda', '#ffd740'];
  const titleOp = interpolate(frame, [0, 25], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse, rgba(2,6,23,0.78) 0%, rgba(2,6,23,0.93) 70%)',
    }}>
      <h2 style={{
        fontSize: 46, fontWeight: 900, color: 'white', fontFamily: FONT, margin: 0,
        opacity: titleOp, textShadow: '0 4px 20px rgba(0,0,0,0.8)',
      }}>
        PICK YOUR COLOR
      </h2>

      <div style={{ display: 'flex', gap: 14, marginTop: 32 }}>
        {colors.map((c, i) => {
          const pop = spring({ frame: frame - 40 - i * 10, fps, config: { damping: 10, stiffness: 100 } });
          const selected = i === 0;
          return (
            <div key={i} style={{
              width: 48, height: 48, borderRadius: '50%', backgroundColor: c,
              boxShadow: selected ? `0 0 20px ${c}, 0 0 40px ${c}50` : `0 0 10px ${c}60`,
              transform: `scale(${Math.max(0, pop)})`,
              border: selected ? '3px solid white' : '3px solid transparent',
            }} />
          );
        })}
      </div>

      <p style={{
        fontSize: 16, color: 'rgba(255,255,255,0.55)', marginTop: 18,
        opacity: interpolate(frame, [120, 150], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      }}>
        8 unique colors per match — first come, first served
      </p>

      {/* Lobby card */}
      <div style={{
        marginTop: 28, background: 'rgba(2,6,23,0.92)', border: '1px solid rgba(148,163,184,0.2)',
        borderRadius: 12, padding: '14px 24px', minWidth: 340,
        opacity: interpolate(frame, [160, 190], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        transform: `translateY(${interpolate(frame, [160, 190], [12, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px)`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 15, color: 'white', fontWeight: 700, fontFamily: FONT }}>LOBBY #4291</span>
          <span style={{ fontSize: 13, color: '#76ff03', fontWeight: 600 }}>4/8 READY</span>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          {colors.slice(0, 4).map((c, i) => (
            <div key={i} style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: c, opacity: 0.9 }} />
          ))}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`e${i}`} style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: 'rgba(148,163,184,0.2)', border: '1px dashed rgba(148,163,184,0.3)' }} />
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>Wager: 0.1 SOL each • Prize: 0.8 SOL</div>
      </div>

      {/* Join button */}
      <div style={{
        marginTop: 20, padding: '10px 28px', borderRadius: 8,
        background: 'linear-gradient(135deg, #ff66cc, #8b5cf6)',
        opacity: interpolate(frame, [220, 250], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        transform: `scale(${interpolate(frame, [220, 260], [0.8, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})`,
      }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: 'white', fontFamily: FONT }}>JOIN MATCH</span>
      </div>
    </AbsoluteFill>
  );
};

const Features: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const items = [
    'Up to 8 players per match',
    'Solana escrow — instant payouts',
    'Server-authoritative anti-cheat',
    'Keyboard + mobile touch controls',
    'Real-time physics — no lag',
  ];

  return (
    <AbsoluteFill style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse, rgba(2,6,23,0.82) 0%, rgba(2,6,23,0.95) 70%)',
    }}>
      {items.map((text, i) => {
        const pop = spring({ frame: frame - 20 - i * 20, fps, config: { damping: 12, stiffness: 90 } });
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16,
            transform: `translateX(${(1 - Math.max(0, pop)) * 50}px)`,
            opacity: Math.max(0, pop),
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ff66cc',
              boxShadow: '0 0 6px #ff66cc',
            }} />
            <span style={{ fontSize: 24, color: 'white', fontWeight: 700, fontFamily: FONT }}>
              {text}
            </span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const CTA: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const pop = spring({ frame: frame - 15, fps, config: { damping: 10, stiffness: 80 } });
  const btnPulse = 1 + Math.sin(frame * 0.1) * 0.03;
  const urlOp = interpolate(frame, [60, 90], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse, rgba(2,6,23,0.85) 0%, rgba(2,6,23,0.96) 70%)',
    }}>
      <h2 style={{
        fontSize: 60, fontWeight: 900, color: 'white', fontFamily: FONT, margin: 0,
        transform: `scale(${Math.max(0, pop)})`,
        textShadow: '0 4px 20px rgba(0,0,0,0.8)',
      }}>
        READY TO SUMO?
      </h2>
      <div style={{
        marginTop: 28, padding: '14px 44px', borderRadius: 12,
        background: 'linear-gradient(135deg, #ff66cc, #ec4899)',
        boxShadow: '0 0 30px rgba(255,102,204,0.4), 0 8px 24px rgba(0,0,0,0.4)',
        transform: `scale(${btnPulse * Math.max(0, pop)})`,
      }}>
        <span style={{ fontSize: 22, fontWeight: 900, color: 'white', fontFamily: FONT }}>PLAY NOW</span>
      </div>
      <p style={{
        fontSize: 18, color: 'rgba(255,255,255,0.55)', marginTop: 18, opacity: urlOp,
      }}>
        pookiesumoroyale.com
      </p>
    </AbsoluteFill>
  );
};

// ════════════════════════════════════════════════════════════════════
// CROSS-SECTION TRANSITIONS (white flash between sections)
// ════════════════════════════════════════════════════════════════════

const Transitions: React.FC<{ frame: number }> = ({ frame }) => {
  const cuts = [300, 540, 720, 1800, 2040, 2400, 2880, 3240];
  let opacity = 0;
  for (const cut of cuts) {
    const d = frame - cut;
    if (d >= -2 && d < 8) {
      opacity = Math.max(opacity, interpolate(d, [-2, 0, 8], [0, 0.5, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
    }
  }
  if (opacity <= 0) return null;
  return <AbsoluteFill style={{ backgroundColor: 'white', opacity, pointerEvents: 'none' }} />;
};

// ════════════════════════════════════════════════════════════════════
// SHARED STYLES
// ════════════════════════════════════════════════════════════════════

const hudBadge: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  background: 'rgba(2,6,23,0.78)', padding: '6px 12px', borderRadius: 6,
  border: '1px solid rgba(148,163,184,0.2)',
};
