import React, { useEffect, useRef, useMemo } from 'react';

/**
 * Deterministic "random" based on a seed index.
 * Avoids Math.random() on every render.
 */
function seededVal(seed, offset = 0) {
  const x = Math.sin(seed + offset) * 10000;
  return x - Math.floor(x);
}

/* ─────────────────────────────────────────────
   PARTICLE FIELD – canvas-based, zero DOM nodes
───────────────────────────────────────────── */
function ParticleCanvas() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;

    const COUNT = 55;
    const COLORS = ['#8B5CF6', '#22D3EE', '#6366F1', '#a78bfa', '#67e8f9'];

    // Build deterministic particles (position seeded, velocity tiny random)
    const particles = Array.from({ length: COUNT }, (_, i) => ({
      x: seededVal(i, 1) * window.innerWidth,
      y: seededVal(i, 2) * window.innerHeight,
      r: seededVal(i, 3) * 1.5 + 0.5,
      dx: (seededVal(i, 4) - 0.5) * 0.3,
      dy: (seededVal(i, 5) - 0.5) * 0.2,
      alpha: seededVal(i, 6) * 0.5 + 0.1,
      pulseSpeed: seededVal(i, 7) * 0.015 + 0.005,
      pulseT: seededVal(i, 8) * Math.PI * 2,
      color: COLORS[Math.floor(seededVal(i, 9) * COLORS.length)],
    }));

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function draw(ts) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.dx;
        p.y += p.dy;
        p.pulseT += p.pulseSpeed;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        const pulse = 0.3 + 0.4 * Math.sin(p.pulseT);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + 1, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = pulse * p.alpha;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    }

    // Respect reduced-motion
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!mq.matches) {
      raf = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 1 }}
      aria-hidden="true"
    />
  );
}

/* ─────────────────────────────────────────────
   SVG RIBBON PATHS – large flowing wave ribbons
───────────────────────────────────────────── */
function DataRibbons() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none motion-safe:animate-none"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ zIndex: 2 }}
    >
      {/* Ribbon 1 – violet sweep */}
      <path
        d="M-200,250 C200,100 400,400 700,300 S1100,50 1640,200"
        stroke="url(#r1)"
        strokeWidth="120"
        fill="none"
        strokeLinecap="round"
        opacity="0.10"
      >
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0,0; 40,-20; 0,0"
          dur="22s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"
        />
      </path>

      {/* Ribbon 2 – cyan sweep */}
      <path
        d="M-200,500 C300,650 600,350 900,500 S1250,700 1640,450"
        stroke="url(#r2)"
        strokeWidth="90"
        fill="none"
        strokeLinecap="round"
        opacity="0.09"
      >
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0,0; -30,25; 0,0"
          dur="28s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"
        />
      </path>

      {/* Ribbon 3 – indigo sweep */}
      <path
        d="M-100,700 C200,550 500,800 800,650 S1200,850 1640,700"
        stroke="url(#r3)"
        strokeWidth="70"
        fill="none"
        strokeLinecap="round"
        opacity="0.07"
      >
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0,0; 20,30; 0,0"
          dur="35s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"
        />
      </path>

      {/* Ribbon 4 – highlight lavender */}
      <path
        d="M-200,150 C400,0 700,250 1000,100 S1350,300 1640,80"
        stroke="url(#r4)"
        strokeWidth="50"
        fill="none"
        strokeLinecap="round"
        opacity="0.06"
      >
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0,0; -20,-15; 0,0"
          dur="30s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"
        />
      </path>

      {/* Gradient defs */}
      <defs>
        <linearGradient id="r1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
        <linearGradient id="r2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
        <linearGradient id="r3" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id="r4" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#67e8f9" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ─────────────────────────────────────────────
   FLOATING ORBS – large blurred gradient blobs
───────────────────────────────────────────── */
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden" style={{ zIndex: 0 }} aria-hidden="true">
      {/* Primary violet orb – top-left */}
      <div
        className="absolute rounded-full orb-float"
        style={{
          width: '650px',
          height: '650px',
          top: '-150px',
          left: '-180px',
          background: 'radial-gradient(circle, rgba(139,92,246,0.35) 0%, rgba(99,102,241,0.15) 50%, transparent 75%)',
          filter: 'blur(60px)',
        }}
      />
      {/* Cyan orb – top-right */}
      <div
        className="absolute rounded-full orb-float2"
        style={{
          width: '500px',
          height: '500px',
          top: '-80px',
          right: '-100px',
          background: 'radial-gradient(circle, rgba(34,211,238,0.25) 0%, rgba(99,102,241,0.12) 55%, transparent 75%)',
          filter: 'blur(70px)',
        }}
      />
      {/* Indigo orb – mid-center */}
      <div
        className="absolute rounded-full orb-float3"
        style={{
          width: '700px',
          height: '500px',
          top: '30%',
          left: '25%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.08) 55%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      {/* Lavender orb – bottom-left */}
      <div
        className="absolute rounded-full orb-float"
        style={{
          width: '550px',
          height: '550px',
          bottom: '-150px',
          left: '10%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.20) 0%, transparent 70%)',
          filter: 'blur(65px)',
        }}
      />
      {/* Cyan orb – bottom-right */}
      <div
        className="absolute rounded-full orb-float2"
        style={{
          width: '450px',
          height: '450px',
          bottom: '-80px',
          right: '5%',
          background: 'radial-gradient(circle, rgba(34,211,238,0.15) 0%, rgba(99,102,241,0.08) 60%, transparent 75%)',
          filter: 'blur(55px)',
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   LIGHT BEAMS – diagonal translucent streaks
───────────────────────────────────────────── */
function LightBeams() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 2 }} aria-hidden="true">
      {/* Beam 1 */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '15%',
          width: '2px',
          height: '80%',
          background: 'linear-gradient(to bottom, transparent, rgba(139,92,246,0.15), rgba(34,211,238,0.08), transparent)',
          transform: 'rotate(25deg)',
          filter: 'blur(8px)',
          transformOrigin: 'top center',
        }}
      />
      {/* Beam 2 */}
      <div
        style={{
          position: 'absolute',
          top: '-5%',
          left: '40%',
          width: '2px',
          height: '70%',
          background: 'linear-gradient(to bottom, transparent, rgba(99,102,241,0.12), rgba(139,92,246,0.06), transparent)',
          transform: 'rotate(15deg)',
          filter: 'blur(10px)',
          transformOrigin: 'top center',
        }}
      />
      {/* Beam 3 */}
      <div
        style={{
          position: 'absolute',
          top: '0',
          right: '20%',
          width: '2px',
          height: '60%',
          background: 'linear-gradient(to bottom, transparent, rgba(34,211,238,0.10), rgba(99,102,241,0.05), transparent)',
          transform: 'rotate(-20deg)',
          filter: 'blur(8px)',
          transformOrigin: 'top center',
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────── */
export default function AmbientBackground() {
  return (
    <div
      className="fixed inset-0 w-full h-full overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/* Base gradient layers */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% 15%, rgba(139,92,246,0.28) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 10%, rgba(34,211,238,0.20) 0%, transparent 55%),
            radial-gradient(ellipse 70% 50% at 55% 65%, rgba(99,102,241,0.18) 0%, transparent 55%),
            radial-gradient(ellipse 60% 40% at 10% 80%, rgba(139,92,246,0.15) 0%, transparent 50%),
            radial-gradient(ellipse 50% 40% at 90% 85%, rgba(34,211,238,0.12) 0%, transparent 50%),
            #0B1020
          `,
        }}
      />

      {/* Subtle data-grid texture */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Floating orbs */}
      <FloatingOrbs />

      {/* SVG Ribbons */}
      <DataRibbons />

      {/* Light beams */}
      <LightBeams />

      {/* Particle field */}
      <ParticleCanvas />

      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 50%, rgba(5,8,18,0.55) 100%)',
          zIndex: 5,
        }}
      />
    </div>
  );
}
