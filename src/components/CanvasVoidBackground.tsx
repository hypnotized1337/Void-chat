import { useEffect, useRef } from 'react';

// --- Configuration ---
const PARTICLE_COUNT_DESKTOP = 120;
const PARTICLE_COUNT_MOBILE = 60;
const CONNECTION_DISTANCE = 130;
const MOUSE_RADIUS = 200;
const MOUSE_STRENGTH = 0.03;
const DRIFT_SPEED = 0.0004;
const BASE_VELOCITY = 0.3;

// Simplex-like noise seed
function pseudoNoise(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseOpacity: number;
  hue: number;
  noiseOffsetX: number;
  noiseOffsetY: number;
  pulsePhase: number;
  pulseSpeed: number;
}

export function CanvasVoidBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let time = 0;
    let dpr = 1;

    const particleCount = window.innerWidth > 768 ? PARTICLE_COUNT_DESKTOP : PARTICLE_COUNT_MOBILE;

    const initCanvas = () => {
      dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const initParticles = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: 0,
          vy: 0,
          size: Math.random() * 1.5 + 0.5,
          baseOpacity: Math.random() * 0.4 + 0.1,
          hue: 0,
          noiseOffsetX: Math.random() * 1000,
          noiseOffsetY: Math.random() * 1000,
          pulsePhase: Math.random() * Math.PI * 2,
          pulseSpeed: 0.005 + Math.random() * 0.01,
        });
      }
    };

    let lastMouseX = -1;
    let lastMouseY = -1;
    let mouseVelocity = 0;

    const draw = () => {
      time += 0.5;

      // Full dark clear
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const mouseActive = mouseRef.current.active;

      // Calculate mouse movement speed
      if (mouseActive) {
        if (lastMouseX !== -1) {
          const dx = mx - lastMouseX;
          const dy = my - lastMouseY;
          const currentVel = Math.sqrt(dx * dx + dy * dy);
          mouseVelocity = mouseVelocity * 0.9 + currentVel * 0.1;
        }
        lastMouseX = mx;
        lastMouseY = my;
      } else {
        mouseVelocity *= 0.95;
      }

      // --- Update particles ---
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // 1. Coordinated Flow Field (Wind/Currents)
        // We use the particle's position to sample a "flow direction"
        const flowAngle = pseudoNoise(p.x * 0.001, p.y * 0.001 + time * 0.0002) * Math.PI * 4;
        const flowForce = 0.08;
        
        p.vx += Math.cos(flowAngle) * flowForce;
        p.vy += Math.sin(flowAngle) * flowForce;

        // 2. Mouse Interaction
        if (mouseActive) {
          const dx = mx - p.x;
          const dy = my - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < MOUSE_RADIUS) {
            const force = (1 - dist / MOUSE_RADIUS);
            
            // If mouse is moving fast, it "disturbs" particles more (repulsion/turbulence)
            // If mouse is slow/stopped, it "attracts" particles gently like a lens
            if (mouseVelocity > 2) {
              const push = force * mouseVelocity * 0.05;
              p.vx -= (dx / dist) * push;
              p.vy -= (dy / dist) * push;
            } else {
              const pull = force * 0.04;
              p.vx += dx * pull;
              p.vy += dy * pull;
            }
          }
        }

        // Friction/Damping — slightly higher to prevent runaway speed
        p.vx *= 0.94;
        p.vy *= 0.94;

        // Apply constant drift
        p.x += p.vx + BASE_VELOCITY;
        p.y += p.vy;

        // Wrap around
        const margin = 100;
        if (p.x < -margin) p.x = width + margin;
        if (p.x > width + margin) p.x = -margin;
        if (p.y < -margin) p.y = height + margin;
        if (p.y > height + margin) p.y = -margin;
      }

      // --- Draw connections (Mesh) ---
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distSq = dx * dx + dy * dy;
          const maxDistSq = CONNECTION_DISTANCE * CONNECTION_DISTANCE;

          if (distSq < maxDistSq) {
            const opacity = (1 - Math.sqrt(distSq) / CONNECTION_DISTANCE) * 0.08;
            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // --- Draw particles ---
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const pulse = Math.sin(p.pulsePhase + time * p.pulseSpeed) * 0.3 + 0.7;
        const opacity = p.baseOpacity * pulse;

        // Soft glow
        const glowSize = p.size * 4;
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
        glow.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.3})`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(p.x - glowSize, p.y - glowSize, glowSize * 2, glowSize * 2);

        // Core dot
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- Ambient central glow (pulsing) ---
      const glowPulse = Math.sin(time * 0.008) * 0.01 + 0.03;
      const centerGlow = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, Math.max(width, height) * 0.45
      );
      centerGlow.addColorStop(0, `rgba(255, 255, 255, ${glowPulse})`);
      centerGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = centerGlow;
      ctx.fillRect(0, 0, width, height);

      // --- Edge vignette ---
      const vignette = ctx.createRadialGradient(
        width / 2, height / 2, Math.min(width, height) * 0.25,
        width / 2, height / 2, Math.max(width, height) * 0.75
      );
      vignette.addColorStop(0, 'transparent');
      vignette.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      animationFrameId = requestAnimationFrame(draw);
    };

    // Event listeners
    const handleResize = () => {
      initCanvas();
      initParticles();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999, active: false };
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    initCanvas();
    initParticles();
    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-auto"
      style={{ background: '#000' }}
    />
  );
}
