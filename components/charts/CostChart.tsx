'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export type CostPoint = { month: string; usd: number; minutes: number };

export function CostChart({ data }: { data: CostPoint[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="#eee8dd" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} unit="$" />
          <Tooltip
            contentStyle={{ borderRadius: 12, borderColor: '#e5e1d8', fontSize: 13 }}
            formatter={(v) => [`US$${Number(v).toFixed(2)}`, 'OpenAI 估算']}
          />
          <Bar dataKey="usd" fill="#2c5f5d" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
