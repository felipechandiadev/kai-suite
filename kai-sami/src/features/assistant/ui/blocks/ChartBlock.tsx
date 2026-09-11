"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AssistantBlock } from "../../domain/assistant-block.types";
import { chartSeriesToRecharts } from "../../lib/sanitize-markdown";

const COLORS = ["#1e73ae", "#00deef", "#2e9e5b", "#e6a100", "#d64545"];

export function ChartBlock({
  block,
}: {
  block: Extract<AssistantBlock, { type: "chart" }>;
}) {
  const data = chartSeriesToRecharts(block.series);
  const first = block.series[0];
  return (
    <div className="h-64 w-full rounded-lg border border-border p-2">
      {block.title ? (
        <div className="px-2 pb-1 text-sm font-medium">{block.title}</div>
      ) : null}
      <ResponsiveContainer width="100%" height="90%">
        {block.chart === "line" ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" />
            <YAxis />
            <Tooltip />
            <Legend />
            {block.series.map((s, i) => (
              <Line
                key={s.id}
                type="monotone"
                dataKey={s.id}
                name={s.label}
                stroke={COLORS[i % COLORS.length]}
              />
            ))}
          </LineChart>
        ) : block.chart === "area" ? (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" />
            <YAxis />
            <Tooltip />
            {first ? (
              <Area
                type="monotone"
                dataKey={first.id}
                name={first.label}
                fill={COLORS[0]}
                stroke={COLORS[0]}
              />
            ) : (
              <Area dataKey="y" />
            )}
          </AreaChart>
        ) : block.chart === "pie" && first ? (
          <PieChart>
            <Tooltip />
            <Pie data={data} dataKey={first.id} nameKey="x" label>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" />
            <YAxis />
            <Tooltip />
            <Legend />
            {block.series.map((s, i) => (
              <Bar
                key={s.id}
                dataKey={s.id}
                name={s.label}
                fill={COLORS[i % COLORS.length]}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
