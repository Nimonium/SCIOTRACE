import React from 'react';
import { cn } from '../../utils/styles';

const momentumStyles = {
  dormant: 'bg-dormant text-white',
  emerging: 'bg-cyan text-ink',
  growing: 'bg-growing text-ink',
  accelerating: 'bg-magenta text-ink',
  viral: 'bg-viral text-ink',
};

export function MomentumBadge({ state }) {
  const normalizedState = state?.toLowerCase() || 'dormant';
  const style = momentumStyles[normalizedState] || momentumStyles.dormant;

  return (
    <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full", style)}>
      {state}
    </span>
  );
}
