'use client';

import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export type DailyPoint = { day: string; signups: number; active_users: number; recordings: number };

const SERIES = [
  { key: 'recordings', name: '錄音', color: '#245e5c' },
  { key: 'active_users', name: '活躍使用者', color: '#e9a870' },
  { key: 'signups', name: '新註冊', color: '#8fb0ab' },
] as const;

export function DailyChart({ data }: { data: DailyPoint[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            {SERIES.map((s) => (
              <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="#ece7dc" vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#98a4ab' }} tickLine={false} axisLine={false} minTickGap={28} />
          <YAxis tick={{ fontSize: 11, fill: '#98a4ab' }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            cursor={{ stroke: '#cfc8ba', strokeDasharray: '3 3' }}
            contentStyle={{ borderRadius: 14, border: '1px solid #e7e1d5', boxShadow: '0 12px 30px -14px rgba(22,35,43,.3)', fontSize: 12 }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          {SERIES.map((s) => (
            <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} fill={`url(#g-${s.key})`} dot={false} activeDot={{ r: 4 }} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
