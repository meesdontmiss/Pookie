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
 * PlatformTour — Full 60-second platform walkthrough for new users.
 *
 * Explains what Pookie Sumo Royale is, how it works, and why to play.
 * Uses real 3D assets with scripted gameplay choreography (actual pushes,
 * eliminations, falling off) — NOT just balls rolling in circles.
 *
 * Structure @ 60fps (3600 frames = 60s):
 *   0–5s     (0–300):      Cinematic arena reveal — players drop in
 *   5–10s    (300–600):    Title + "What is Pookie Sumo Royale?"
 *   10–13s   (600–780):   "Push other players off. Last one standing wins."
 *   13–31s   (780–1860):  FULL SCRIPTED FIGHT — charges, hits, eliminations
 *   31–36s   (1860–2160): Elimination recap — "3 ELIMINATED"
 *   36–40s   (2160–2400): Victory celebration
 *   40–46s   (2400–2760): "Wager SOL. Win SOL." — reward explanation
 *   46–52s   (2760–3120): "Pick your color. Join a lobby." — lobby system
 *   52–57s   (3120–3420): Feature highlights (8 players, anti-cheat, instant)
 *   57–60s   (3420–3600): CTA — "Play now"
 */

export const PlatformTour: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  return (
    <AbsoluteFill style={{ backgroundColor: '#020617' }}>
      {/* ═══════════════════════════════════════════════════════════
          SECTION 1: CINEMATIC ARENA REVEAL (0–5s)
          Players drop in from above onto the arena
      ═══════════════════════════════════════════════════════════ */}
      <Sequence from={0} durationInFrames={300}>
        <AbsoluteFill>
          <GameScene script={INTRO_SEQUENCE} showBlimp showSnow showClouds />
        </AbsoluteFill>
      </Sequence>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 2: TITLE CARD (5–10s)
          "What is Pookie Sumo Royale?"
      ═══════════════════════════════════════════════════════════ */}
      <Sequence from={300} durationInFrames={300}>
        <AbsoluteFill>
          <GameScene
            script={INTRO_SEQUENCE}
            timeOffset={5}
            showBlimp
            showSnow
            showClouds
          />
        </AbsoluteFill>
        <TitleOverlay frame={frame - 300} fps={fps} />
      </Sequence>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 3: CONCEPT EXPLANATION (10–13s)
          "Push other players off. Last one standing wins."
      ═══════════════════════════════════════════════════════════ */}
      <Sequence from={600} durationInFrames={180}>
        <AbsoluteFill>
          <GameScene
            script={FIGHT_SEQUENCE}
            timeOffset={-10}
            showBlimp={false}
            showSnow
            showClouds={false}
          />
        </AbsoluteFill>
        <ConceptOverlay frame={frame - 600} fps={fps} />
      </Sequence>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 4: SCRIPTED FIGHT (13–31s) — 18 SECONDS
          Real gameplay: charges, pushes, 3 eliminations, final showdown
      ═══════════════════════════════════════════════════════════ */}
      <Sequence from={780} durationInFrames={1080}>
        <AbsoluteFill>
          <GameScene
            script={FIGHT_SEQUENCE}
            showBlimp
            showSnow
            showClouds
          />
        </AbsoluteFill>
        <FightHUD frame={frame - 780} fps={fps} />
      </Sequence>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 5: ELIMINATION RECAP (31–36s)
      ═══════════════════════════════════════════════════════════ */}
      <Sequence from={1860} durationInFrames={300}>
        <AbsoluteFill>
          <GameScene
            script={FIGHT_SEQUENCE}
            timeOffset={-31}
            showBlimp={false}
            showSnow
            showClouds={false}
          />
        </AbsoluteFill>
        <EliminationRecap frame={frame - 1860} fps={fps} />
      </Sequence>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 6: VICTORY (36–40s)
      ═══════════════════════════════════════════════════════════ */}
      <Sequence from={2160} durationInFrames={240}>
        <AbsoluteFill>
          <GameScene script={VICTORY_SEQUENCE} showBlimp showSnow showClouds />
        </AbsoluteFill>
        <VictoryOverlay frame={frame - 2160} fps={fps} />
      </Sequence>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 7: REWARDS (40–46s)
          "Wager SOL. Win SOL."
      ═══════════════════════════════════════════════════════════ */}
      <Sequence from={2400} durationInFrames={360}>
        <AbsoluteFill>
          <GameScene
            script={VICTORY_SEQUENCE}
            timeOffset={-40}
            showBlimp
            showSnow
            showClouds
          />
        </AbsoluteFill>
        <RewardsOverlay frame={frame - 2400} fps={fps} />
      </Sequence>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 8: LOBBY SYSTEM (46–52s)
          "Pick your color. Join a match."
      ═══════════════════════════════════════════════════════════ */}
      <Sequence from={2760} durationInFrames={360}>
        <AbsoluteFill>
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
            showBlimp={false}
            showSnow
            showClouds={false}
          />
        </AbsoluteFill>
        <LobbyOverlay frame={frame - 2760} fps={fps} />
      </Sequence>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 9: FEATURE HIGHLIGHTS (52–57s)
      ═══════════════════════════════════════════════════════════ */}
      <Sequence from={3120} durationInFrames={300}>
        <AbsoluteFill>
          <GameScene
            cameraMode="flythrough"
            players={[
              { id: 'f1', ballColor: '#ff66cc', phase: 0, orbitRadius: 6 },
              { id: 'f2', ballColor: '#00e5ff', phase: Math.PI, orbitRadius: 6 },
            ]}
            showBlimp
            showSnow
            showClouds
          />
        </AbsoluteFill>
        <FeaturesOverlay frame={frame - 3120} fps={fps} />
      </Sequence>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 10: CTA (57–60s)
      ═══════════════════════════════════════════════════════════ */}
      <Sequence from={3420} durationInFrames={180}>
        <AbsoluteFill>
          <GameScene
            cameraMode="static"
            players={[{ id: 'cta', ballColor: '#ff66cc', phase: 0, orbitRadius: 0.1 }]}
            showBlimp
            showSnow
            showClouds
          />
        </AbsoluteFill>
        <CTAOverlay frame={frame - 3420} fps={fps} />
      </Sequence>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// OVERLAY COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const overlayBase: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
};

const heavitas = 'Heavitas, Arial, sans-serif';

/** Section 2: Title card */
const TitleOverlay: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const scale = spring({ frame: frame - 20, fps, config: { damping: 12, stiffness: 80 } });
  const subOp = interpolate(frame, [60, 100], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

  return (
    <div style={{ ...overlayBase, background: 'radial-gradient(ellipse, rgba(2,6,23,0.7) 0%, rgba(2,6,23,0.88) 70%)' }}>
      <h1 style={{
        fontSize: 68, fontWeight: 900, color: 'white', fontFamily: heavitas,
        textTransform: 'uppercase', letterSpacing: 4, margin: 0,
        transform: `scale(${Math.max(0, scale)})`,
        textShadow: '0 4px 30px rgba(0,0,0,0.9)',
      }}>
        POOKIE SUMO ROYALE
      </h1>
      <p style={{
        fontSize: 28, color: 'rgba(255,255,255,0.8)', marginTop: 16, fontWeight: 500,
        opacity: subOp, fontFamily: heavitas,
      }}>
        The Ultimate On-Chain Battle Royale
      </p>
    </div>
  );
};

/** Section 3: Concept explanation */
const ConceptOverlay: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const line1 = spring({ frame: frame - 10, fps, config: { damping: 14, stiffness: 90 } });
  const line2 = spring({ frame: frame - 40, fps, config: { damping: 14, stiffness: 90 } });

  return (
    <div style={{ ...overlayBase, background: 'linear-gradient(to top, rgba(2,6,23,0.85) 0%, transparent 50%)' }}>
      <div style={{ position: 'absolute', bottom: 80, left: 0, right: 0, textAlign: 'center' }}>
        <p style={{
          fontSize: 42, fontWeight: 800, color: 'white', margin: 0, fontFamily: heavitas,
          transform: `translateY(${(1 - Math.max(0, line1)) * 30}px)`,
          opacity: Math.max(0, line1),
          textShadow: '0 4px 20px rgba(0,0,0,0.9)',
        }}>
          Push other players off the arena.
        </p>
        <p style={{
          fontSize: 42, fontWeight: 800, color: '#ff66cc', margin: 0, marginTop: 12, fontFamily: heavitas,
          transform: `translateY(${(1 - Math.max(0, line2)) * 30}px)`,
          opacity: Math.max(0, line2),
          textShadow: '0 4px 20px rgba(0,0,0,0.9)',
        }}>
          Last one standing wins.
        </p>
      </div>
    </div>
  );
};

/** Section 4: Fight HUD — alive counter + kill feed */
const FightHUD: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const time = frame / fps;
  // Approximate elimination times from the script
  const elim1 = time > 5; // victim1 at ~5s
  const elim2 = time > 11; // victim2 at ~11s
  const elim3 = time > 16.5; // rival at ~16.5s
  const alive = 4 - (elim1 ? 1 : 0) - (elim2 ? 1 : 0) - (elim3 ? 1 : 0);

  const kills: { name: string; time: number; color: string }[] = [];
  if (elim1) kills.push({ name: 'GoldRush99', time: 5, color: '#ffab00' });
  if (elim2) kills.push({ name: 'LimeTime', time: 11, color: '#76ff03' });
  if (elim3) kills.push({ name: 'xBlueIce', time: 16.5, color: '#00e5ff' });

  return (
    <div style={{ ...overlayBase, alignItems: 'stretch', justifyContent: 'flex-start' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', padding: '20px 28px',
      }}>
        {/* Player identity */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(2,6,23,0.75)', padding: '8px 16px', borderRadius: 8,
          border: '1px solid rgba(148,163,184,0.2)',
        }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: '#ff66cc', boxShadow: '0 0 6px #ff66cc' }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: 'white', fontFamily: heavitas }}>YOU</span>
        </div>

        {/* Alive counter */}
        <div style={{
          background: 'rgba(2,6,23,0.75)', padding: '8px 16px', borderRadius: 8,
          border: '1px solid rgba(148,163,184,0.2)',
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'white', fontFamily: heavitas }}>
            ALIVE: {alive}/4
          </span>
        </div>
      </div>

      {/* Kill feed — bottom left */}
      <div style={{ position: 'absolute', bottom: 28, left: 28, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {kills.map((k, i) => {
          const killAge = time - k.time;
          const op = interpolate(killAge, [0, 0.3, 4, 5], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8, opacity: op,
              background: 'rgba(2,6,23,0.8)', padding: '6px 12px', borderRadius: 6,
              border: '1px solid rgba(255,102,204,0.3)',
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ff66cc' }} />
              <span style={{ fontSize: 13, color: 'white', fontWeight: 600 }}>YOU</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>eliminated</span>
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: k.color }} />
              <span style={{ fontSize: 13, color: 'white', fontWeight: 600 }}>{k.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Section 5: Elimination recap */
const EliminationRecap: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const scale = spring({ frame: frame - 15, fps, config: { damping: 10, stiffness: 70 } });
  return (
    <div style={{ ...overlayBase, background: 'radial-gradient(ellipse, rgba(2,6,23,0.8) 0%, rgba(2,6,23,0.92) 70%)' }}>
      <span style={{
        fontSize: 96, fontWeight: 900, color: '#ff66cc', fontFamily: heavitas,
        transform: `scale(${Math.max(0, scale)})`,
        textShadow: '0 0 40px rgba(255,102,204,0.5)',
      }}>
        3 ELIMINATED
      </span>
      <span style={{
        fontSize: 28, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginTop: 12,
        opacity: interpolate(frame, [40, 70], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      }}>
        You are the last one standing.
      </span>
    </div>
  );
};

/** Section 6: Victory */
const VictoryOverlay: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const pop = spring({ frame: frame - 20, fps, config: { damping: 8, stiffness: 100 } });
  const glow = Math.sin(frame * 0.08) * 0.3 + 0.7;
  return (
    <div style={{ ...overlayBase, background: `radial-gradient(ellipse, rgba(255,102,204,${0.15 * glow}) 0%, transparent 60%)` }}>
      <span style={{
        fontSize: 80, fontWeight: 900, color: 'white', fontFamily: heavitas,
        transform: `scale(${Math.max(0, pop)})`,
        textShadow: '0 0 30px rgba(255,102,204,0.6), 0 4px 20px rgba(0,0,0,0.8)',
      }}>
        VICTORY
      </span>
      <span style={{
        fontSize: 24, color: '#ff66cc', marginTop: 16, fontWeight: 600,
        opacity: interpolate(frame, [50, 80], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      }}>
        +0.5 SOL earned
      </span>
    </div>
  );
};

/** Section 7: Rewards explanation */
const RewardsOverlay: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const title = spring({ frame: frame - 20, fps, config: { damping: 12, stiffness: 80 } });
  const card1 = spring({ frame: frame - 60, fps, config: { damping: 14, stiffness: 80 } });
  const card2 = spring({ frame: frame - 90, fps, config: { damping: 14, stiffness: 80 } });
  const card3 = spring({ frame: frame - 120, fps, config: { damping: 14, stiffness: 80 } });

  return (
    <div style={{ ...overlayBase, background: 'radial-gradient(ellipse, rgba(2,6,23,0.82) 0%, rgba(2,6,23,0.94) 70%)' }}>
      <h2 style={{
        fontSize: 52, fontWeight: 900, color: 'white', fontFamily: heavitas, margin: 0,
        transform: `scale(${Math.max(0, title)})`,
        textShadow: '0 4px 20px rgba(0,0,0,0.8)',
      }}>
        WAGER SOL. WIN SOL.
      </h2>

      <div style={{ display: 'flex', gap: 24, marginTop: 40 }}>
        <RewardCard label="Entry" value="0.1 SOL" color="#ffab00" scale={card1} />
        <RewardCard label="Prize Pool" value="0.4 SOL" color="#76ff03" scale={card2} />
        <RewardCard label="Winner Takes" value="ALL" color="#ff66cc" scale={card3} />
      </div>

      <p style={{
        fontSize: 18, color: 'rgba(255,255,255,0.6)', marginTop: 28,
        opacity: interpolate(frame, [150, 180], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      }}>
        Solana escrow — instant payouts — no middleman
      </p>
    </div>
  );
};

const RewardCard: React.FC<{ label: string; value: string; color: string; scale: number }> = ({ label, value, color, scale }) => (
  <div style={{
    background: 'rgba(2,6,23,0.9)', border: `2px solid ${color}40`, borderRadius: 12,
    padding: '20px 28px', textAlign: 'center', minWidth: 150,
    transform: `scale(${Math.max(0, scale)})`,
    boxShadow: `0 0 20px ${color}20`,
  }}>
    <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontFamily: heavitas }}>{label}</div>
    <div style={{ fontSize: 28, color, fontWeight: 900, marginTop: 6, fontFamily: heavitas }}>{value}</div>
  </div>
);

/** Section 8: Lobby/color system */
const LobbyOverlay: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const title = spring({ frame: frame - 20, fps, config: { damping: 12, stiffness: 80 } });
  const colors = ['#ff66cc', '#00e5ff', '#ffab00', '#76ff03', '#e040fb', '#ff5252', '#64ffda', '#ffd740'];

  return (
    <div style={{ ...overlayBase, background: 'radial-gradient(ellipse, rgba(2,6,23,0.8) 0%, rgba(2,6,23,0.92) 70%)' }}>
      <h2 style={{
        fontSize: 48, fontWeight: 900, color: 'white', fontFamily: heavitas, margin: 0,
        transform: `scale(${Math.max(0, title)})`,
        textShadow: '0 4px 20px rgba(0,0,0,0.8)',
      }}>
        PICK YOUR COLOR. JOIN A MATCH.
      </h2>

      {/* Color picker mockup */}
      <div style={{ display: 'flex', gap: 12, marginTop: 36 }}>
        {colors.map((c, i) => {
          const delay = 50 + i * 12;
          const pop = spring({ frame: frame - delay, fps, config: { damping: 10, stiffness: 100 } });
          return (
            <div key={i} style={{
              width: 44, height: 44, borderRadius: '50%', backgroundColor: c,
              boxShadow: `0 0 12px ${c}80`,
              transform: `scale(${Math.max(0, pop)})`,
              border: i === 0 ? '3px solid white' : '3px solid transparent',
            }} />
          );
        })}
      </div>

      <p style={{
        fontSize: 18, color: 'rgba(255,255,255,0.6)', marginTop: 24,
        opacity: interpolate(frame, [100, 130], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      }}>
        8 unique colors per match — first come, first served
      </p>

      {/* Lobby card mockup */}
      <div style={{
        marginTop: 28, background: 'rgba(2,6,23,0.9)', border: '1px solid rgba(148,163,184,0.25)',
        borderRadius: 12, padding: '16px 24px', minWidth: 320,
        opacity: interpolate(frame, [140, 170], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        transform: `translateY(${interpolate(frame, [140, 170], [15, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px)`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: 'white', fontWeight: 700, fontFamily: heavitas }}>LOBBY #4291</span>
          <span style={{ fontSize: 12, color: '#76ff03', fontWeight: 600 }}>4/8 Players</span>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>Wager: 0.1 SOL each</div>
      </div>
    </div>
  );
};

/** Section 9: Features */
const FeaturesOverlay: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const features = [
    { icon: '8', label: 'Up to 8 players per match' },
    { icon: '⚡', label: 'Instant Solana payouts' },
    { icon: '🛡', label: 'Server-authoritative anti-cheat' },
    { icon: '🎮', label: 'Keyboard + mobile controls' },
  ];

  return (
    <div style={{ ...overlayBase, background: 'radial-gradient(ellipse, rgba(2,6,23,0.82) 0%, rgba(2,6,23,0.94) 70%)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {features.map((f, i) => {
          const pop = spring({ frame: frame - 30 - i * 25, fps, config: { damping: 12, stiffness: 90 } });
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              transform: `translateX(${(1 - Math.max(0, pop)) * 60}px)`,
              opacity: Math.max(0, pop),
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 10,
                background: 'rgba(255,102,204,0.15)', border: '1px solid rgba(255,102,204,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 900, color: '#ff66cc',
              }}>
                {f.icon}
              </div>
              <span style={{ fontSize: 24, color: 'white', fontWeight: 700, fontFamily: heavitas }}>
                {f.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Section 10: CTA */
const CTAOverlay: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const pop = spring({ frame: frame - 15, fps, config: { damping: 10, stiffness: 80 } });
  const pulse = Math.sin(frame * 0.1) * 0.05 + 1;

  return (
    <div style={{ ...overlayBase, background: 'radial-gradient(ellipse, rgba(2,6,23,0.85) 0%, rgba(2,6,23,0.96) 70%)' }}>
      <h2 style={{
        fontSize: 56, fontWeight: 900, color: 'white', fontFamily: heavitas, margin: 0,
        transform: `scale(${Math.max(0, pop)})`,
        textShadow: '0 4px 20px rgba(0,0,0,0.8)',
      }}>
        READY TO SUMO?
      </h2>
      <div style={{
        marginTop: 32, padding: '16px 48px', borderRadius: 14,
        background: 'linear-gradient(135deg, #ff66cc, #ec4899)',
        boxShadow: '0 0 30px rgba(255,102,204,0.4)',
        transform: `scale(${pulse * Math.max(0, pop)})`,
      }}>
        <span style={{ fontSize: 24, fontWeight: 900, color: 'white', fontFamily: heavitas }}>
          PLAY NOW
        </span>
      </div>
      <p style={{
        fontSize: 18, color: 'rgba(255,255,255,0.6)', marginTop: 20,
        opacity: interpolate(frame, [50, 80], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      }}>
        pookiesumoroyale.com
      </p>
    </div>
  );
};
