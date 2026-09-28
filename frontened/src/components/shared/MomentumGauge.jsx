import React, { useEffect, useState } from 'react';
import { momentumColors } from '../../utils/styles';

export function MomentumGauge({ score, state }) {
  const [currentScore, setCurrentScore] = useState(0);
  const normalizedState = state?.toLowerCase() || 'dormant';
  const color = momentumColors[normalizedState] || momentumColors.dormant;

  useEffect(() => {
    const timeout = setTimeout(() => {
      setCurrentScore(score);
    }, 100);
    return () => clearTimeout(timeout);
  }, [score]);

  const size = 40;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (currentScore / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#8FB6AF" /* border hex */
          strokeWidth={strokeWidth}
          fill="transparent"
          opacity="0.3"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all ease-out"
          style={{ transitionDuration: '600ms' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-mono font-bold text-ink">
          {score}
        </span>
      </div>
    </div>
  );
}
