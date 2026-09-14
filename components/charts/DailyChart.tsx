'use client';

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export type DailyPoint = { day: string; signups: number; active_users: number; recordings: number };

export function DailyChart({ data }: { data: DailyPoint[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="#eee8dd" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#e5e1d8', fontSize: 13 }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
          <Line type="monotone" dataKey="recordings" name="錄音" stroke="#2c5f5d" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="active_users" name="活躍使用者" stroke="#e7a977" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="signups" name="新註冊" stroke="#8aa6a3" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
