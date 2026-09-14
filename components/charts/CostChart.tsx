'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export type CostPoint = { month: string; usd: number; minutes: number };

export function CostChart({ data }: { data: CostPoint[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap="35%">
          <defs>
            <linearGradient id="g-cost" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#245e5c" />
              <stop offset="100%" stopColor="#3f7f7c" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#ece7dc" vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#98a4ab' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#98a4ab' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            cursor={{ fill: '#f5f2eb' }}
            contentStyle={{ borderRadius: 14, border: '1px solid #e7e1d5', boxShadow: '0 12px 30px -14px rgba(22,35,43,.3)', fontSize: 12 }}
            formatter={(v, _n, p) => [`US$${Number(v).toFixed(2)}（${Number(p?.payload?.minutes ?? 0).toFixed(1)} 分鐘）`, 'OpenAI 估算']}
          />
          <Bar dataKey="usd" fill="url(#g-cost)" radius={[8, 8, 4, 4]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
