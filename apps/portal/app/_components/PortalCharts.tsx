"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie
} from 'recharts';
import { brandColors } from '../theme';

const chartStroke = '#a0a8c3';

export function RevenueAreaChart({ data }: { data: { month: string; revenue: number; expenses: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="10%" stopColor={brandColors.bluePrimary} stopOpacity={0.8} />
            <stop offset="90%" stopColor={brandColors.lightBlue} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8eef6" />
        <XAxis dataKey="month" stroke={chartStroke} />
        <YAxis stroke={chartStroke} />
        <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid #e3e8f2' }} />
        <Area type="monotone" dataKey="revenue" stroke={brandColors.bluePrimary} fill="url(#revGradient)" strokeWidth={3} />
        <Line type="monotone" dataKey="expenses" stroke={brandColors.greenPrimary} strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function AttendanceLineChart({ data }: { data: { day: string; attendance: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="#e8eef6" />
        <XAxis dataKey="day" stroke={chartStroke} />
        <YAxis stroke={chartStroke} />
        <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid #e3e8f2' }} />
        <Line type="monotone" dataKey="attendance" stroke={brandColors.greenPrimary} strokeWidth={3} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function UtilizationBarChart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8eef6" />
        <XAxis dataKey="label" stroke={chartStroke} />
        <YAxis stroke={chartStroke} />
        <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid #e3e8f2' }} />
        <Bar dataKey="value" radius={[12, 12, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${entry.label}`} fill={index % 2 === 0 ? brandColors.bluePrimary : brandColors.greenPrimary} opacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutBreakdown({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return (
    <div className="grid gap-4 md:grid-cols-[160px_1fr]">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} innerRadius={50} outerRadius={70} dataKey="value">
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between rounded-xl border border-[#e3e8f2] px-3 py-2 text-sm">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              {item.name}
            </span>
            <span className="font-semibold text-[#0f1a2b]">{total > 0 ? Math.round((item.value / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

