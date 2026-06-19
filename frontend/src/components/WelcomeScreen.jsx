import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Sparkles } from 'lucide-react';

const WelcomeScreen = ({ userName, onComplete }) => {
  const [phase, setPhase] = useState(0);

  const stableOnComplete = useCallback(onComplete, []);

  useEffect(() => {
    const timings = [400, 1000, 1800, 3000, 3600];
    const timers = timings.map((ms, i) =>
      setTimeout(() => {
        if (i < 4) setPhase(i + 1);
        else stableOnComplete();
      }, ms)
    );
    return () => timers.forEach(clearTimeout);
  }, [stableOnComplete]);

  // Fewer particles on mobile for performance
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const particles = useMemo(() => {
    const count = isMobile ? 10 : 20;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * (isMobile ? 3 : 4) + 2,
      delay: Math.random() * 2,
      duration: Math.random() * 3 + 2,
    }));
  }, [isMobile]);

  const iconSize = isMobile ? 34 : 44;
  const sparkleSize = isMobile ? 16 : 20;

  return (
    <AnimatePresence>
      {phase < 4 && (
        <motion.div
          className="welcome-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        >
          {/* Static gradient bg — no animated background to save GPU on mobile */}
          <div className="welcome-bg-gradient" />

          {/* Shimmer overlay for subtle life without heavy gradient animation */}
          <motion.div
            className="welcome-shimmer"
            animate={{ x: ['0%', '100%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />

          {/* Floating particles — GPU accelerated with will-change */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="welcome-particle"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size,
                willChange: 'transform, opacity',
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0, 0.5, 0],
              }}
              transition={{
                duration: p.duration,
                repeat: Infinity,
                delay: p.delay,
                ease: 'easeInOut',
              }}
            />
          ))}

          {/* Glowing ring */}
          <motion.div
            className="welcome-glow-ring"
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 1.4, 1.1],
              opacity: [0, 0.35, 0.15],
            }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />

          {/* Main content */}
          <div className="welcome-content">
            {/* Icon */}
            <motion.div
              className="welcome-icon"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: 'spring',
                stiffness: 180,
                damping: 14,
                delay: 0.1,
              }}
            >
              <Wallet size={iconSize} strokeWidth={1.5} />
              <motion.div
                className="welcome-icon-sparkle"
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: phase >= 1 ? 1 : 0,
                  opacity: phase >= 1 ? 1 : 0,
                }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 280 }}
              >
                <Sparkles size={sparkleSize} />
              </motion.div>
            </motion.div>

            {/* Greeting */}
            <motion.p
              className="welcome-greeting"
              initial={{ opacity: 0, y: 16 }}
              animate={{
                opacity: phase >= 1 ? 1 : 0,
                y: phase >= 1 ? 0 : 16,
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              Welcome back
            </motion.p>

            {/* Name — letter by letter */}
            <motion.h1
              className="welcome-name"
              initial={{ opacity: 0 }}
              animate={{ opacity: phase >= 2 ? 1 : 0 }}
            >
              {userName && phase >= 2 &&
                userName.split('').map((char, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 30, rotateX: -90 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    transition={{
                      duration: 0.35,
                      delay: i * 0.04,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    style={{
                      display: 'inline-block',
                      whiteSpace: char === ' ' ? 'pre' : 'normal',
                    }}
                  >
                    {char}
                  </motion.span>
                ))}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="welcome-subtitle"
              initial={{ opacity: 0, y: 12 }}
              animate={{
                opacity: phase >= 3 ? 1 : 0,
                y: phase >= 3 ? 0 : 12,
              }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            >
              Let's manage your finances ✨
            </motion.p>

            {/* Line accent */}
            <motion.div
              className="welcome-line"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: phase >= 3 ? 1 : 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeScreen;
