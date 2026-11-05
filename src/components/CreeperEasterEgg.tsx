import React, { useState, useEffect, useRef } from 'react';
import { sound } from '../utils/sound.ts';

interface Particle {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  layer: 'large' | 'medium' | 'spark';
  rotX: number;
  rotY: number;
  rotZ: number;
  vRotX: number;
  vRotY: number;
  vRotZ: number;
  color: string;
  opacity: number;
}

const GREEN_PALETTE = [
  '#35D16F', // Emerald Green
  '#4BF589', // Bright Neon Green
  '#7AFCB0', // Mint Glow Green
  '#24A855', // Rich Minecraft Green
  '#1B8040', // Deep Forest Green
  '#104C25', // Dark Creeper Shadow
  '#0D381D'  // Base Green
];

export const CreeperEasterEgg: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [stage, setStage] = useState<'idle' | 'materialize' | 'shake_ascend' | 'explode'>('idle');
  const [particles, setParticles] = useState<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const triggerExplosion = () => {
    if (isActive) return;
    setIsActive(true);
    setStage('materialize');
    sound.playCreeperFuse();

    // Sequence:
    // 0.00s - 0.40s: Materialize in center with energy ring
    // 0.40s - 1.10s: Shake, vibrate & visibly ascend upwards with particle trail
    setTimeout(() => {
      setStage('shake_ascend');
    }, 400);

    // 1.10s - 2.20s: Main explosion at peak ascent with 3D multi-layer fragments
    setTimeout(() => {
      setStage('explode');
      sound.playCreeperExplosion();
      spawnLayeredParticles();
    }, 1100);

    // 2.20s - 3.20s: Natural fade out and restoration of website
    setTimeout(() => {
      setStage('idle');
      setIsActive(false);
      setParticles([]);
    }, 3200);
  };

  const spawnLayeredParticles = () => {
    const isMobile = window.innerWidth < 640;
    const newParticles: Particle[] = [];
    let particleId = 0;

    // Layer 1: Large Fragments (visible cubic chunks, 6-10 pieces)
    const largeCount = isMobile ? 8 : 12;
    for (let i = 0; i < largeCount; i++) {
      const angle = (i / largeCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = Math.random() * 8 + 8;
      newParticles.push({
        id: particleId++,
        x: (Math.random() - 0.5) * 30,
        y: -70 + (Math.random() - 0.5) * 30, // from peak ascent position
        z: (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        vz: (Math.random() - 0.5) * 12,
        size: Math.floor(Math.random() * 8) + 20, // 20px - 28px
        layer: 'large',
        rotX: Math.random() * 360,
        rotY: Math.random() * 360,
        rotZ: Math.random() * 360,
        vRotX: (Math.random() - 0.5) * 25,
        vRotY: (Math.random() - 0.5) * 25,
        vRotZ: (Math.random() - 0.5) * 20,
        color: GREEN_PALETTE[Math.floor(Math.random() * 4)],
        opacity: 1
      });
    }

    // Layer 2: Medium Fragments (rotating cubes, 20-30 pieces)
    const mediumCount = isMobile ? 22 : 36;
    for (let i = 0; i < mediumCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 12 + 6;
      newParticles.push({
        id: particleId++,
        x: 0,
        y: -70,
        z: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        vz: (Math.random() - 0.5) * 14,
        size: Math.floor(Math.random() * 6) + 11, // 11px - 17px
        layer: 'medium',
        rotX: Math.random() * 360,
        rotY: Math.random() * 360,
        rotZ: Math.random() * 360,
        vRotX: (Math.random() - 0.5) * 35,
        vRotY: (Math.random() - 0.5) * 35,
        vRotZ: (Math.random() - 0.5) * 30,
        color: GREEN_PALETTE[Math.floor(Math.random() * GREEN_PALETTE.length)],
        opacity: 1
      });
    }

    // Layer 3: Fine Sparks & Pixel Embers (30-50 pieces)
    const sparkCount = isMobile ? 28 : 50;
    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 18 + 10;
      newParticles.push({
        id: particleId++,
        x: 0,
        y: -70,
        z: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: (Math.random() - 0.5) * 20,
        size: Math.floor(Math.random() * 4) + 4, // 4px - 8px
        layer: 'spark',
        rotX: Math.random() * 360,
        rotY: Math.random() * 360,
        rotZ: 0,
        vRotX: 10,
        vRotY: 10,
        vRotZ: 0,
        color: '#7AFCB0', // bright emerald spark
        opacity: 1
      });
    }

    setParticles(newParticles);
  };

  // High-performance physics loop with drag and natural gravity
  useEffect(() => {
    if (stage !== 'explode') return;

    let lastTime = performance.now();
    const updatePhysics = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      setParticles(prev =>
        prev
          .map(p => {
            const drag = p.layer === 'large' ? 0.96 : 0.93;
            return {
              ...p,
              x: p.x + p.vx * 60 * dt,
              y: p.y + p.vy * 60 * dt + (p.layer === 'large' ? 14 : 7) * dt, // gravity
              z: p.z + p.vz * 60 * dt,
              vx: p.vx * drag,
              vy: p.vy * drag,
              vz: p.vz * drag,
              rotX: p.rotX + p.vRotX,
              rotY: p.rotY + p.vRotY,
              rotZ: p.rotZ + p.vRotZ,
              opacity: Math.max(0, p.opacity - dt * (p.layer === 'spark' ? 0.85 : 0.65))
            };
          })
          .filter(p => p.opacity > 0.03)
      );

      animFrameRef.current = requestAnimationFrame(updatePhysics);
    };

    animFrameRef.current = requestAnimationFrame(updatePhysics);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [stage]);

  // Global event listener for activation zone
  useEffect(() => {
    const handleTrigger = () => triggerExplosion();
    window.addEventListener('zork-trigger-creeper', handleTrigger);
    return () => window.removeEventListener('zork-trigger-creeper', handleTrigger);
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center overflow-hidden"
      style={{ perspective: '1200px' }}
      aria-hidden="true"
    >
      {/* Background cinematic vignette backdrop */}
      <div
        className={`absolute inset-0 bg-[#07070B]/50 transition-opacity duration-300 ${
          stage === 'explode' ? 'opacity-80' : 'opacity-40'
        }`}
      />

      {/* Rotating Ground Energy Grid Rings (Frames 1 & 2) */}
      {(stage === 'materialize' || stage === 'shake_ascend') && (
        <div
          className="absolute w-[260px] sm:w-[340px] h-[90px] rounded-full border-2 border-[#35D16F]/70 animate-pulse"
          style={{
            transform: 'translateY(140px) rotateX(72deg)',
            boxShadow: '0 0 45px #35D16F, inset 0 0 25px #7AFCB0'
          }}
        >
          {/* Inner concentric ring */}
          <div className="absolute inset-3 rounded-full border border-[#7AFCB0]/60 animate-ping" />
        </div>
      )}

      {/* Creeper 3D Head during Materialize & Ascent */}
      {(stage === 'materialize' || stage === 'shake_ascend') && (
        <div
          className={`relative transition-all duration-700 ease-out flex flex-col items-center ${
            stage === 'shake_ascend'
              ? '-translate-y-20 scale-105'
              : 'translate-y-0 scale-100'
          }`}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* 3D Cubic Head Container with Genuine Pixel Creeper Face */}
          <div
            className={`w-[190px] h-[190px] sm:w-[250px] sm:h-[250px] relative rounded-2xl p-2.5 transition-shadow ${
              stage === 'shake_ascend' ? 'animate-creeper-shake' : 'animate-pulse'
            }`}
            style={{
              background: 'linear-gradient(135deg, #1B8040 0%, #104C25 60%, #0D381D 100%)',
              border: '3.5px solid #35D16F',
              boxShadow:
                stage === 'shake_ascend'
                  ? '0 0 60px rgba(53, 209, 111, 0.9), inset 0 0 35px rgba(122, 252, 176, 0.6)'
                  : '0 0 35px rgba(53, 209, 111, 0.6), inset 0 0 20px rgba(53, 209, 111, 0.4)'
            }}
          >
            {/* The Authentic Pixel Creeper Face Asset */}
            <img
              src="/assets/brand/creeper.png"
              alt="Creeper Face"
              className="w-full h-full object-contain filter drop-shadow-[0_0_18px_#35D16F]"
              style={{ imageRendering: 'pixelated' }}
            />

            {/* Glowing 3D Glass Surface Highlight */}
            <div className="absolute inset-0 rounded-2xl border border-white/25 pointer-events-none" />
          </div>

          {/* Ascending Green Pixel Sparks during Ascent */}
          {stage === 'shake_ascend' && (
            <div className="absolute -bottom-10 flex gap-2.5">
              <span className="w-3.5 h-3.5 bg-[#7AFCB0] rounded-xs animate-ping" />
              <span className="w-2.5 h-2.5 bg-[#35D16F] rounded-xs animate-ping delay-75" />
              <span className="w-3 h-3 bg-[#4BF589] rounded-xs animate-ping delay-150" />
            </div>
          )}
        </div>
      )}

      {/* Frame 3: Cinematic Multi-Layer Explosion at Peak Ascent */}
      {stage === 'explode' && (
        <div className="relative w-0 h-0 flex items-center justify-center">
          {/* 1. Primary Expanding Emerald Shockwave Ring */}
          <div
            className="absolute rounded-full border-4 border-[#35D16F] animate-shockwave pointer-events-none"
            style={{
              width: '420px',
              height: '420px',
              boxShadow: '0 0 90px #35D16F, inset 0 0 50px #7AFCB0'
            }}
          />

          {/* 2. Secondary High-Speed Shockwave */}
          <div
            className="absolute rounded-full border-2 border-[#7AFCB0] animate-shockwave pointer-events-none"
            style={{
              width: '560px',
              height: '560px',
              boxShadow: '0 0 60px #7AFCB0',
              animationDelay: '0.1s'
            }}
          />

          {/* 3. Bright Emerald Center Flash Core */}
          <div
            className="absolute w-28 h-28 rounded-full bg-white animate-ping"
            style={{
              boxShadow: '0 0 80px #35D16F, 0 0 120px #7AFCB0',
              animationDuration: '0.6s'
            }}
          />

          {/* 4. 3D Exploded Cubic Minecraft Fragments */}
          {particles.map(p => (
            <div
              key={p.id}
              className="absolute pointer-events-none transition-opacity"
              style={{
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: p.color,
                border: p.layer === 'large' ? '1.5px solid rgba(255,255,255,0.45)' : '1px solid rgba(255,255,255,0.25)',
                boxShadow: `0 0 ${p.layer === 'large' ? 16 : 8}px ${p.color}`,
                transform: `translate3d(${p.x}px, ${p.y}px, ${p.z}px) rotateX(${p.rotX}deg) rotateY(${p.rotY}deg) rotateZ(${p.rotZ}deg)`,
                opacity: p.opacity,
                imageRendering: 'pixelated'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Generous Activation Zone Container around the Metallic Wordmark
export const CreeperActivationZone: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const lastTapRef = useRef<number>(0);
  const cooldownRef = useRef<boolean>(false);

  const registerTap = (e: React.SyntheticEvent) => {
    if (cooldownRef.current) return;

    const now = Date.now();
    const diff = now - lastTapRef.current;

    // Discard rapid double triggers from simultaneous touch & mouse events (< 50ms)
    if (diff < 50) return;

    if (diff < 2000 && diff >= 50) {
      // Valid second tap within 2 seconds window!
      cooldownRef.current = true;
      lastTapRef.current = 0;
      window.dispatchEvent(new CustomEvent('zork-trigger-creeper'));

      // 4-second cooldown to restore normal behavior smoothly
      setTimeout(() => {
        cooldownRef.current = false;
      }, 4000);
    } else {
      // First tap starts 2-second detection window
      lastTapRef.current = now;
    }
  };

  return (
    <div
      onClick={registerTap}
      onTouchEnd={registerTap}
      className="relative select-none cursor-pointer group py-4 px-6 sm:px-10"
      title="ZORK CRAFT — انقر مرتين لتفعيل بيضة الكريبر السرية"
      aria-label="شعار ZORK المعدني التفاعلي"
    >
      {/* Generous invisible padding area above, below, left, and right */}
      <div className="absolute -inset-4 sm:-inset-8 z-0 pointer-events-auto" />
      <div className="relative z-10">{children}</div>
    </div>
  );
};
