import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Scatter,
  ComposedChart,
  Area,
} from "recharts";
import type { BeatClassification } from "@/api/types";
import { colorForLabel, nameForLabel } from "@/utils/labelColors";
import { Activity } from "lucide-react";

interface ECGWaveformProps {
  signal: number[];
  sampleRate: number;
  beats?: BeatClassification[];
  highlightedBeatIndex?: number | null;
  windowSeconds?: number;
  height?: number;
  showGridHeader?: boolean;
}

export function ECGWaveform({
  signal,
  sampleRate,
  beats = [],
  highlightedBeatIndex = null,
  windowSeconds,
  height = 280,
  showGridHeader = true,
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
    <div className="relative rounded-2xl overflow-hidden border border-cyan-500/20 bg-[#060c1a] shadow-2xl">
      {/* Top Telemetry Strip */}
      {showGridHeader && (
        <div className="flex items-center justify-between px-4 py-2 bg-[#091224]/90 border-b border-white/[0.06] text-[11px] font-mono select-none">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
            </span>
            <span className="font-bold text-cyan-300">LEAD II</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">25 mm/s · 10 mm/mV</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">BW 0.5–40 Hz</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Activity className="h-3 w-3" />
              <span>{beats.length > 0 ? `${beats.length} BEATS DETECTED` : "READY"}</span>
            </div>
            <span className="text-slate-500 font-semibold">{sampleRate} Hz</span>
          </div>
        </div>
      )}

      {/* Oscilloscope Grid Display */}
      <div className="relative bg-ecg-grid p-2">
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={data} margin={{ top: 18, right: 16, bottom: 4, left: -10 }}>
            <defs>
              <linearGradient id="ecgGlowFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#00f2fe" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(6, 182, 212, 0.08)" strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              type="number"
              domain={windowSeconds ? [visibleSignal.length > 0 ? data[0].t : 0, "dataMax"] : ["dataMin", "dataMax"]}
              tickFormatter={(v: number) => `${v.toFixed(1)}s`}
              stroke="#64748b"
              fontSize={10}
              fontFamily="JetBrains Mono, monospace"
            />
            <YAxis
              stroke="#64748b"
              fontSize={10}
              width={42}
              fontFamily="JetBrains Mono, monospace"
              tickFormatter={(v: number) => v.toFixed(1)}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const p = payload[0].payload;
                  return (
                    <div className="rounded-xl border border-cyan-500/30 bg-[#091122]/95 px-3 py-2 text-xs font-mono shadow-2xl backdrop-blur-md">
                      <div className="text-slate-400 text-[10px]">TIME: {Number(p.t).toFixed(3)}s</div>
                      <div className="text-cyan-300 font-bold text-sm">
                        {Number(p.amplitude).toFixed(3)} mV
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            {/* Soft area under waveform for authentic biomedical glow */}
            <Area
              type="monotone"
              dataKey="amplitude"
              stroke="transparent"
              fill="url(#ecgGlowFill)"
              isAnimationActive={false}
            />
            {/* The crisp ECG pulse line */}
            <Area
              type="monotone"
              dataKey="amplitude"
              stroke="#00f2fe"
              strokeWidth={1.75}
              fill="transparent"
              isAnimationActive={false}
              style={{ filter: "drop-shadow(0 0 5px rgba(0, 242, 254, 0.5))" }}
            />
            {/* Beat markers */}
            <Scatter
              data={peakPoints}
              dataKey="amplitude"
              shape={(props: any) => {
                const { cx, cy, payload } = props;
                const color = colorForLabel(payload.label);
                const isHl = payload.isHighlighted;
                const r = isHl ? 8 : 5;
                return (
                  <g key={`beat-${payload.beat_index}`}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={r + 3}
                      fill={color}
                      opacity={isHl ? 0.4 : 0.2}
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill={color}
                      stroke={isHl ? "#ffffff" : "rgba(0,0,0,0.5)"}
                      strokeWidth={isHl ? 2 : 1}
                      style={{ filter: `drop-shadow(0 0 6px ${color})` }}
                    />
                    {isHl && (
                      <text
                        x={cx}
                        y={cy - 12}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize={10}
                        fontWeight="bold"
                        fontFamily="JetBrains Mono"
                      >
                        {payload.label}
                      </text>
                    )}
                  </g>
                );
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Beat Marker Legend */}
      {beats.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-[#080f20]/90 border-t border-white/[0.06] text-[11px] text-slate-400">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fiducial R-Peaks:</span>
            <div className="flex items-center gap-3">
              {["N", "S", "V", "F", "Q"].map((lbl) => {
                const count = beats.filter((b) => b.label === lbl).length;
                if (count === 0) return null;
                const color = colorForLabel(lbl);
                return (
                  <span key={lbl} className="inline-flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="font-semibold text-slate-300">{lbl}:</span>
                    <span style={{ color }}>{count}</span>
                  </span>
                );
              })}
            </div>
          </div>
          <div className="font-mono text-[10px] text-slate-400">
            Hover points for timestamps
          </div>
        </div>
      )}
    </div>
  );
}
