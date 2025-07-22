"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface AreaChartProps {
  data: Array<{ [key: string]: any }>;
  xKey: string;
  yKey: string;
  color?: string;
  height?: number;
  className?: string;
}

export function AreaChartComponent({
  data,
  xKey,
  yKey,
  color = "#3b82f6",
  height = 300,
  className = "",
}: AreaChartProps) {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <XAxis
            dataKey={xKey}
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
            }}
          />
          <Area
            type="monotone"
            dataKey={yKey}
            stroke={color}
            fill={color}
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}