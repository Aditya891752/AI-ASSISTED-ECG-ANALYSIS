import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { colorForLabel, nameForLabel } from "@/utils/labelColors";

interface LabelDonutProps {
  counts: Record<string, number>;
  height?: number;
}

export function LabelDonut({ counts, height = 220 }: LabelDonutProps) {
  const data = Object.entries(counts)
    .filter(([, value]) => value > 0)
    .map(([label, value]) => ({ name: label, value }));

  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-slate-500 font-mono"
        style={{ height }}
      >
        Awaiting screening telemetry data...
      </div>
    );
  }

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            stroke="#0a1124"
            strokeWidth={3}
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={colorForLabel(entry.name)}
                style={{ filter: `drop-shadow(0 0 6px ${colorForLabel(entry.name)}44)` }}
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0];
                const pct = total > 0 ? ((Number(item.value) / total) * 100).toFixed(1) : "0";
                return (
                  <div className="rounded-xl border border-white/[0.1] bg-[#091122]/95 px-3 py-2 text-xs font-mono shadow-2xl backdrop-blur-md">
                    <div className="flex items-center gap-1.5 font-bold" style={{ color: colorForLabel(String(item.name)) }}>
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorForLabel(String(item.name)) }} />
                      <span>{item.name} &bull; {nameForLabel(String(item.name))}</span>
                    </div>
                    <div className="text-slate-300 mt-1">
                      {item.value} beats ({pct}%)
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: "JetBrains Mono" }}
            formatter={(value) => `${value} (${nameForLabel(value)})`}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
