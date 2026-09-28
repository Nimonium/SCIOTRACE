import React from 'react';
import {
  LineChart,
  Line,
  ResponsiveContainer
} from 'recharts';
import { momentumColors } from '../../utils/styles';

export function MomentumSparkline({ data, state }) {
  if (!data || data.length === 0) return null;

  const normalizedState = state?.toLowerCase() || 'dormant';
  const color = momentumColors[normalizedState] || momentumColors.dormant;

  const chartData = data.map((item, idx) => (
    typeof item === 'number'
      ? { value: item, index: idx }
      : (item && item.value !== undefined ? item : { value: Number(item) || 0, index: idx })
  ));

  return (
    <div style={{ width: 80, height: 30 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
            animationDuration={600}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
