import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const emotionColors = {
  anger: '#FF3B5C',        // viral/critical
  mobilization: '#10B981', // emerald
  opposition: '#F59E0B',   // amber
  anxiety: '#EC4899',      // pink
  fear: '#EF4444',         // red
  curiosity: '#22D3EE',    // cyan
  support: '#8B5CF6',      // violet
  uncertainty: '#94A3B8',  // gray
};

export function SentimentTimeline({ data }) {
  const series = Array.isArray(data) ? data : (data?.sentiment_series || []);
  if (!series || series.length === 0) return (
    <div className="bg-panel border border-border border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-muted h-72">
      <p>No timeline data available.</p>
    </div>
  );

  const formattedData = series.map((item, idx) => {
    const rawTime = item.time || item.timestamp || '';
    const label = rawTime ? rawTime.replace('T', ' ').slice(11, 16) : `T${idx+1}`;
    const formatted = { ...item, displayTime: label };
    // Convert 0-1 fractions to 0-100 percentages if needed
    for (const em of Object.keys(emotionColors)) {
      if (typeof item[em] === 'number') {
        formatted[em] = item[em] <= 1 ? Math.round(item[em] * 100) : item[em];
      }
    }
    return formatted;
  });

  return (
    <div className="bg-panel border border-border rounded-lg p-6 shadow-sm h-72">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-4">Sentiment & Emotion Timeline</h3>
      <div className="w-full h-[85%]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={formattedData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#8FB6AF" opacity={0.15} vertical={false} />
            <XAxis 
              dataKey="displayTime" 
              stroke="#94A3B8" 
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickMargin={10}
            />
            <YAxis 
              stroke="#94A3B8" 
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0B1020', borderColor: 'rgba(148, 163, 184, 0.2)', borderRadius: '6px', fontSize: '11px', color: '#F8FAFC' }}
              itemStyle={{ fontWeight: 'bold' }}
              labelStyle={{ color: '#94A3B8', marginBottom: '4px' }}
              formatter={(value, name) => [`${value}%`, name]}
            />
            
            <Area type="monotone" dataKey="curiosity" stackId="1" stroke={emotionColors.curiosity} fill={emotionColors.curiosity} fillOpacity={0.6} animationDuration={600} />
            <Area type="monotone" dataKey="anger" stackId="1" stroke={emotionColors.anger} fill={emotionColors.anger} fillOpacity={0.6} animationDuration={600} />
            <Area type="monotone" dataKey="mobilization" stackId="1" stroke={emotionColors.mobilization} fill={emotionColors.mobilization} fillOpacity={0.6} animationDuration={600} />
            <Area type="monotone" dataKey="opposition" stackId="1" stroke={emotionColors.opposition} fill={emotionColors.opposition} fillOpacity={0.6} animationDuration={600} />
            <Area type="monotone" dataKey="anxiety" stackId="1" stroke={emotionColors.anxiety} fill={emotionColors.anxiety} fillOpacity={0.6} animationDuration={600} />
            <Area type="monotone" dataKey="support" stackId="1" stroke={emotionColors.support} fill={emotionColors.support} fillOpacity={0.6} animationDuration={600} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
