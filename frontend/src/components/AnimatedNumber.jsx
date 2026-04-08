import React, { useEffect, useMemo, useRef, useState } from 'react';
import { animate } from 'framer-motion';
import './AnimatedNumber.css';

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function formatValue(value, { decimals = 0, prefix = '', suffix = '', signed = false }) {
  if (!isFiniteNumber(value)) return `${prefix}${value ?? 'n/a'}${suffix}`;
  const formatted = value.toFixed(decimals);
  const sign = signed && value > 0 ? '+' : '';
  return `${prefix}${sign}${formatted}${suffix}`;
}

export default function AnimatedNumber({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  signed = false,
  duration = 0.9,
  className = ''
}) {
  const numericValue = isFiniteNumber(value) ? value : null;
  const [displayValue, setDisplayValue] = useState(numericValue ?? 0);
  const [direction, setDirection] = useState('steady');
  const previousValueRef = useRef(numericValue ?? 0);

  useEffect(() => {
    if (!isFiniteNumber(numericValue)) {
      return undefined;
    }

    const previousValue = previousValueRef.current;
    const nextDirection = numericValue > previousValue ? 'up' : numericValue < previousValue ? 'down' : 'steady';
    const frame = window.requestAnimationFrame(() => setDirection(nextDirection));
    const controls = animate(previousValue, numericValue, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplayValue(latest)
    });

    previousValueRef.current = numericValue;
    const reset = window.setTimeout(() => {
      window.requestAnimationFrame(() => setDirection('steady'));
    }, 900);

    return () => {
      controls.stop();
      window.cancelAnimationFrame(frame);
      window.clearTimeout(reset);
    };
  }, [duration, numericValue]);

  const formatted = useMemo(() => (
    formatValue(numericValue == null ? value : displayValue, { decimals, prefix, suffix, signed })
  ), [decimals, displayValue, numericValue, prefix, signed, suffix, value]);

  return (
    <span className={`animated-number ${direction} ${className}`.trim()}>
      {formatted}
    </span>
  );
}
