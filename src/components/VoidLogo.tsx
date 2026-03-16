import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const VOID_LETTERS = ['v', '0', 'i', 'd'];

export function VoidLogo() {
  const [glitching, setGlitching] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitching(true);
      setTimeout(() => setGlitching(false), 350);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex flex-col items-center">
      {/* Ambient glow behind logo */}
      <motion.div
        className="absolute -inset-8 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Main title with letter stagger */}
      <h1 className="relative select-none">
        <span className="sr-only">v0id</span>
        <span
          className={`void-logo-text text-5xl font-semibold tracking-tight font-mono text-foreground inline-flex ${glitching ? 'void-glitch-active' : ''}`}
          aria-hidden="true"
        >
          {VOID_LETTERS.map((letter, i) => (
            <motion.span
              key={letter + i}
              className="inline-block"
              initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{
                duration: 0.5,
                delay: 0.15 + i * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {letter}
            </motion.span>
          ))}
        </span>
      </h1>

      {/* Decorative line under logo */}
      <motion.div
        className="h-px mt-3 bg-gradient-to-r from-transparent via-white/30 to-transparent"
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 80, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
