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

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-ecg-muted"
        style={{ height }}
      >
        No data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={colorForLabel(entry.name)} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: "#111827", border: "1px solid #1f2d3d", borderRadius: 8 }}
          formatter={(value: number, name: string) => [value, nameForLabel(name)]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
