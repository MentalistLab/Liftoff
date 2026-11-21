import React, { useEffect, useState } from 'react';
import { Text, type AppTextProps } from '../ui/Text';

/** Zählt eine Zahl in `duration` ms von 0 hoch (ease-out). */
export function CountUp({ to, duration = 1200, delay = 0, suffix = '', ...rest }: AppTextProps & { to: number; duration?: number; delay?: number; suffix?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = Date.now() + delay;
    const tick = () => {
      const p = Math.max(0, Math.min(1, (Date.now() - start) / duration));
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration, delay]);
  return <Text tabular {...rest}>{v}{suffix}</Text>;
}
