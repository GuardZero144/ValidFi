'use client';

import { useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiBurstProps {
  trigger: boolean;
  onComplete?: () => void;
}

export function ConfettiBurst({ trigger, onComplete }: ConfettiBurstProps) {
  const fireConfetti = useCallback(() => {
    const duration = 1500;
    const end = Date.now() + duration;

    const colors = ['#22c55e', '#10b981', '#06b6d4', '#ffffff', '#a3e635'];

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
        ticks: 200,
        gravity: 1.2,
        scalar: 1.1,
        drift: 0,
      });

      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
        ticks: 200,
        gravity: 1.2,
        scalar: 1.1,
        drift: 0,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      } else {
        onComplete?.();
      }
    };

    // Initial burst
    confetti({
      particleCount: 80,
      spread: 100,
      origin: { y: 0.6 },
      colors,
      ticks: 200,
      gravity: 1,
      scalar: 1.2,
    });

    requestAnimationFrame(frame);
  }, [onComplete]);

  useEffect(() => {
    if (trigger) {
      fireConfetti();
    }
  }, [trigger, fireConfetti]);

  return null;
}
