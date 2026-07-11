import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MoodEntry, MOOD_LEVELS } from '../types';
import { format } from 'date-fns';

interface MoodChartProps {
  entries: MoodEntry[];
}

export const MoodChart: React.FC<MoodChartProps> = ({ entries }) => {
  const data = entries
    .slice(0, 10)
    .reverse()
    .map(entry => ({
      time: format(entry.timestamp, 'MM/dd HH:mm'),
      mood: entry.mood,
      label: MOOD_LEVELS.find(m => m.value === entry.mood)?.label
    }));

  return (
    <div className="h-[300px] w-full p-4 brutalist-border bg-black/40">
      <h3 className="text-xs font-mono uppercase tracking-widest mb-4 opacity-70">Emotional Flux Analysis</h3>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis 
              dataKey="time" 
              stroke="#666" 
              fontSize={10} 
              tickLine={false}
              axisLine={false}
              style={{ fontFamily: 'var(--font-digital)' }}
            />
            <YAxis 
              domain={[1, 5]} 
              stroke="#666" 
              fontSize={10} 
              tickLine={false}
              axisLine={false}
              ticks={[1, 2, 3, 4, 5]}
              style={{ fontFamily: 'var(--font-digital)' }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#000', border: '1px solid #333', fontSize: '12px', fontFamily: 'var(--font-digital)' }}
              itemStyle={{ color: 'var(--primary-color)' }}
            />
            <Line 
              type="monotone" 
              dataKey="mood" 
              stroke="var(--primary-color)" 
              strokeWidth={2} 
              dot={{ fill: 'var(--primary-color)', r: 4 }}
              activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full flex items-center justify-center text-xs font-mono opacity-30">
          Insufficient data for visualization
        </div>
      )}
    </div>
  );
};
