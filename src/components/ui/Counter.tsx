import React, { useEffect, useRef, useState } from 'react';

interface CounterProps {
  targetNumber: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
}

const formatNumber = (value: number): string => {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1).replace('.', ',') + 'BI';
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1).replace('.', ',') + 'MI';
  if (value >= 1_000) return (value / 1_000).toFixed(0) + 'K';
  return value.toString();
};

const Counter: React.FC<CounterProps> = ({
  targetNumber,
  duration = 2000,
  suffix = '',
  prefix = '',
}) => {
  const [currentValue, setCurrentValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted.current) {
          hasStarted.current = true;

          const startTime = Date.now();

          const step = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = Math.floor(progress * targetNumber);
            setCurrentValue(current);
            if (progress < 1) requestAnimationFrame(step);
          };

          requestAnimationFrame(step);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);

    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, [targetNumber, duration]);

  return (
    <div ref={ref}>
      {prefix}
      {formatNumber(currentValue)}
      {suffix}
    </div>
  );
};

export default Counter;
