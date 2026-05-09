'use client';

import React, { useRef, useCallback, useEffect, useState } from 'react';

interface MobileControlsProps {
  onMove: (x: number, y: number) => void; // normalized -1..1
  onJump: () => void;
  onPush: () => void;
  visible?: boolean;
}

const JOYSTICK_SIZE = 120;
const KNOB_SIZE = 48;
const MAX_DISTANCE = (JOYSTICK_SIZE - KNOB_SIZE) / 2;

const MobileControls: React.FC<MobileControlsProps> = ({ onMove, onJump, onPush, visible = true }) => {
  const joystickRef = useRef<HTMLDivElement>(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const [isTouching, setIsTouching] = useState(false);
  const touchIdRef = useRef<number | null>(null);
  const moveIntervalRef = useRef<number | null>(null);
  const lastMoveRef = useRef({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [pushCooldown, setPushCooldown] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsMobile(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.innerWidth < 768
      );
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    if (!touch || !joystickRef.current) return;
    touchIdRef.current = touch.identifier;
    setIsTouching(true);
    handleTouchMoveRaw(touch);

    // Start continuous move emission
    if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    moveIntervalRef.current = window.setInterval(() => {
      onMove(lastMoveRef.current.x, lastMoveRef.current.y);
    }, 50);
  }, [onMove]);

  const handleTouchMoveRaw = useCallback((touch: React.Touch | Touch) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > MAX_DISTANCE) {
      dx = (dx / dist) * MAX_DISTANCE;
      dy = (dy / dist) * MAX_DISTANCE;
    }
    setKnobOffset({ x: dx, y: dy });
    // Normalize to -1..1
    const nx = dx / MAX_DISTANCE;
    const ny = -dy / MAX_DISTANCE; // invert Y: up = positive
    lastMoveRef.current = { x: nx, y: ny };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        handleTouchMoveRaw(e.changedTouches[i]);
        break;
      }
    }
  }, [handleTouchMoveRaw]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setIsTouching(false);
        setKnobOffset({ x: 0, y: 0 });
        lastMoveRef.current = { x: 0, y: 0 };
        onMove(0, 0);
        if (moveIntervalRef.current) {
          clearInterval(moveIntervalRef.current);
          moveIntervalRef.current = null;
        }
        break;
      }
    }
  }, [onMove]);

  useEffect(() => {
    return () => {
      if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    };
  }, []);

  const handlePush = useCallback(() => {
    if (pushCooldown) return;
    onPush();
    setPushCooldown(true);
    setTimeout(() => setPushCooldown(false), 1500);
  }, [onPush, pushCooldown]);

  if (!visible || !isMobile) return null;

  return (
    <>
      {/* Virtual Joystick — bottom left */}
      <div
        ref={joystickRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'fixed',
          bottom: 40,
          left: 30,
          width: JOYSTICK_SIZE,
          height: JOYSTICK_SIZE,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          border: '2px solid rgba(255,255,255,0.25)',
          backdropFilter: 'blur(4px)',
          touchAction: 'none',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: KNOB_SIZE,
            height: KNOB_SIZE,
            borderRadius: '50%',
            background: isTouching
              ? 'radial-gradient(circle, rgba(0,255,136,0.8), rgba(0,200,100,0.4))'
              : 'rgba(255,255,255,0.3)',
            border: '2px solid rgba(255,255,255,0.4)',
            transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
            transition: isTouching ? 'none' : 'transform 0.15s ease-out',
            boxShadow: isTouching ? '0 0 12px rgba(0,255,136,0.5)' : 'none',
          }}
        />
      </div>

      {/* Action buttons — bottom right */}
      <div
        style={{
          position: 'fixed',
          bottom: 40,
          right: 30,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          zIndex: 2000,
        }}
      >
        {/* Push button */}
        <button
          onTouchStart={(e) => { e.preventDefault(); handlePush(); }}
          style={{
            width: 68,
            height: 68,
            borderRadius: '50%',
            border: pushCooldown ? '2px solid rgba(255,68,102,0.3)' : '2px solid rgba(255,68,102,0.6)',
            background: pushCooldown
              ? 'rgba(100,30,40,0.4)'
              : 'radial-gradient(circle, rgba(255,68,102,0.7), rgba(200,40,60,0.3))',
            color: '#fff',
            fontSize: 13,
            fontWeight: 800,
            touchAction: 'none',
            cursor: 'pointer',
            boxShadow: pushCooldown ? 'none' : '0 0 16px rgba(255,68,102,0.4)',
            opacity: pushCooldown ? 0.5 : 1,
            letterSpacing: 1,
          }}
        >
          PUSH
        </button>

        {/* Jump button */}
        <button
          onTouchStart={(e) => { e.preventDefault(); onJump(); }}
          style={{
            width: 68,
            height: 68,
            borderRadius: '50%',
            border: '2px solid rgba(0,170,255,0.6)',
            background: 'radial-gradient(circle, rgba(0,170,255,0.6), rgba(0,100,200,0.3))',
            color: '#fff',
            fontSize: 13,
            fontWeight: 800,
            touchAction: 'none',
            cursor: 'pointer',
            boxShadow: '0 0 16px rgba(0,170,255,0.4)',
            letterSpacing: 1,
          }}
        >
          JUMP
        </button>
      </div>
    </>
  );
};

export default MobileControls;
