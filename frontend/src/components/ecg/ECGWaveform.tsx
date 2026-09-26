import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Scatter,
  ComposedChart,
} from "recharts";
import type { BeatClassification } from "@/api/types";
import { colorForLabel } from "@/utils/labelColors";

interface ECGWaveformProps {
  signal: number[];
  sampleRate: number;
  beats?: BeatClassification[];
  highlightedBeatIndex?: number | null;
  windowSeconds?: number; // if set, only render the last N seconds (for streaming)
  height?: number;
}

export function ECGWaveform({
  signal,
  sampleRate,
  beats = [],
  highlightedBeatIndex = null,
  windowSeconds,
  height = 280,
}: ECGWaveformProps) {
  const maxSamples = windowSeconds ? windowSeconds * sampleRate : signal.length;
  const startIdx = Math.max(0, signal.length - maxSamples);
  const visibleSignal = signal.slice(startIdx);

  const data = visibleSignal.map((amplitude, i) => ({
    t: (startIdx + i) / sampleRate,
    amplitude,
  }));

  const peakPoints = beats
    .filter((b) => b.r_peak_sample >= startIdx)
    .map((b) => ({
      t: b.r_peak_sample / sampleRate,
      amplitude: signal[b.r_peak_sample] ?? 0,
      label: b.label,
      confidence: b.confidence,
      beat_index: b.beat_index,
      isHighlighted: b.beat_index === highlightedBeatIndex,
    }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#1f2d3d" strokeDasharray="3 3" />
        <XAxis
          dataKey="t"
          type="number"
          domain={windowSeconds ? [visibleSignal.length > 0 ? data[0].t : 0, "dataMax"] : ["dataMin", "dataMax"]}
          tickFormatter={(v: number) => `${v.toFixed(1)}s`}
          stroke="#6b7280"
          fontSize={11}
        />
        <YAxis stroke="#6b7280" fontSize={11} width={40} />
        <Tooltip
          contentStyle={{ background: "#111827", border: "1px solid #1f2d3d", borderRadius: 8 }}
          labelFormatter={(v: number) => `t = ${Number(v).toFixed(3)}s`}
          formatter={(value: number) => [value.toFixed(3), "Amplitude"]}
        />
        <Line
          type="monotone"
          dataKey="amplitude"
          stroke="#06b6d4"
          strokeWidth={1.25}
          dot={false}
          isAnimationActive={false}
        />
        <Scatter
          data={peakPoints}
          dataKey="amplitude"
          shape={(props: any) => {
            const { cx, cy, payload } = props;
            const color = colorForLabel(payload.label);
            const r = payload.isHighlighted ? 7 : 4;
            return (
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={color}
                stroke={payload.isHighlighted ? "#fff" : "none"}
                strokeWidth={payload.isHighlighted ? 2 : 0}
              />
            );
          }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
