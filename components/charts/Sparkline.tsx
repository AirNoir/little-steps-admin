'use client';

import { Line, LineChart, ResponsiveContainer } from 'recharts';

export function Sparkline({ data, color = '#245e5c' }: { data: number[]; color?: string }) {
  const points = data.map((v, i) => ({ i, v }));
  return (
    <div className="h-9 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.8} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
