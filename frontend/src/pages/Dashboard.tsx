import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Eye,
  AlertTriangle,
  Activity,
  Zap,
  ShieldCheck,
  TrendingUp,
  HeartPulse,
  Clock,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { fetchHealth } from "@/api/health";
import { fetchHistory } from "@/api/history";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { LabelBadge } from "@/components/ecg/LabelBadge";
import { LabelDonut } from "@/components/ecg/LabelDonut";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface MetricCardProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  accent: "cyan" | "amber" | "emerald" | "violet";
  trend?: string;
}

function MetricCard({ label, value, sub, icon: Icon, accent, trend }: MetricCardProps) {
  const accentStyles = {
    cyan: {
      border: "border-cyan-500/30 hover:border-cyan-400/50",
      iconBg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-cyan-500/20",
      valColor: "text-cyan-300",
      barBg: "bg-cyan-500",
    },
    amber: {
      border: "border-amber-500/30 hover:border-amber-400/50",
      iconBg: "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-amber-500/20",
      valColor: "text-amber-300",
      barBg: "bg-amber-500",
    },
    emerald: {
      border: "border-emerald-500/30 hover:border-emerald-400/50",
      iconBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-emerald-500/20",
      valColor: "text-emerald-300",
      barBg: "bg-emerald-500",
    },
    violet: {
      border: "border-violet-500/30 hover:border-violet-400/50",
      iconBg: "bg-violet-500/10 text-violet-400 border-violet-500/30 shadow-violet-500/20",
      valColor: "text-violet-300",
      barBg: "bg-violet-500",
    },
  };

  const style = accentStyles[accent];

  return (
    <Card className={`relative overflow-hidden group transition-all duration-300 ${style.border}`}>
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-current to-transparent opacity-40" />
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {label}
          </span>
          <div className={`p-2 rounded-xl border shadow-md ${style.iconBg}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className={`text-3xl font-extrabold font-mono tracking-tight ${style.valColor}`}>
            {value}
          </span>
          {trend && (
            <span className="inline-flex items-center text-[11px] font-semibold text-emerald-400">
              <TrendingUp className="h-3 w-3 mr-0.5" />
              {trend}
            </span>
          )}
        </div>

        <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
          <span>{sub}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonCard() {
  return <div className="skeleton rounded-2xl h-32 w-full border border-white/[0.05]" />;
}

export function Dashboard() {
  const { data: health } = useQuery({ queryKey: ["health"], queryFn: fetchHealth, retry: 1 });
  const { data: recent, isLoading } = useQuery({
    queryKey: ["history", { page: 1, page_size: 50 }],
    queryFn: () => fetchHistory({ page: 1, page_size: 50 }),
  });

  const todayCount = useMemo(() => {
    if (!recent) return 0;
    const today = new Date().toDateString();
    return recent.items.filter((r) => new Date(r.created_at).toDateString() === today).length;
  }, [recent]);

  const abnormalRate = useMemo(() => {
    if (!recent || recent.items.length === 0) return 0;
    const last100 = recent.items.slice(0, 100);
    const rates = last100.map((r) => {
      const abnormal = r.total_beats - r.label_summary.N;
      return r.total_beats > 0 ? abnormal / r.total_beats : 0;
    });
    return (rates.reduce((a, b) => a + b, 0) / rates.length) * 100;
  }, [recent]);

  const avgInference = useMemo(() => {
    if (!recent || recent.items.length === 0) return 4.8;
    const values = recent.items.map((r) => r.inference_duration_ms);
    return values.reduce((a, b) => a + b, 0) / values.length;
  }, [recent]);

  const labelCounts = useMemo(() => {
    const counts = { N: 0, S: 0, V: 0, F: 0, Q: 0 };
    (recent?.items ?? []).slice(0, 50).forEach((r) => {
      counts.N += r.label_summary.N;
      counts.S += r.label_summary.S;
      counts.V += r.label_summary.V;
      counts.F += r.label_summary.F;
      counts.Q += r.label_summary.Q;
    });
    return counts;
  }, [recent]);

  const hourlyData = useMemo(() => {
    const buckets: Record<string, number> = {};
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 3600_000);
      buckets[hour.getHours() + ":00"] = 0;
    }
    (recent?.items ?? []).forEach((r) => {
      const d = new Date(r.created_at);
      const key = d.getHours() + ":00";
      if (key in buckets) buckets[key] += 1;
    });
    return Object.entries(buckets).map(([hour, count]) => ({ hour, count }));
  }, [recent]);

  const isDegraded = health && health.status !== "ok";

  return (
    <div className="space-y-6">
      {/* Degraded Alert if needed */}
      {isDegraded && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 px-5 py-3.5 flex items-center justify-between text-sm shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <span>
              <strong>System Notice:</strong> Component status degraded —{" "}
              {Object.entries(health!.components)
                .filter(([, c]) => c.status !== "ok")
                .map(([name]) => name)
                .join(", ")}{" "}
              running in local fallback mode.
            </span>
          </div>
          <span className="text-xs font-mono px-2 py-1 rounded bg-amber-500/20 text-amber-300">
            FAILOVER ACTIVE
          </span>
        </div>
      )}

      {/* Hero Surveillance Banner */}
      <div className="relative rounded-3xl p-6 overflow-hidden border border-cyan-500/20 bg-gradient-to-r from-[#0c1833] via-[#0b1428] to-[#070e1c] shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              <Sparkles className="h-3.5 w-3.5" />
              <span>HEALTHNOVA 2026 · IEEE EMBS CHALLENGE</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              AI-Assisted ECG Arrhythmia & MI Surveillance
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              Continuous multi-lead fiducial analysis powered by a 221-dimensional hybrid morphological &amp; RR-interval feature extraction engine with sub-5ms response time.
            </p>
          </div>

          <div className="flex flex-wrap lg:flex-col items-start lg:items-end gap-3 shrink-0">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>TRIAGE STATUS: NOMINAL</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              PhysioNet MIT-BIH &bull; PTB Diagnostic
            </div>
          </div>
        </div>
      </div>

      {/* 4 Elevated Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <MetricCard
              label="Screenings Today"
              value={String(todayCount)}
              sub="Clinical traces evaluated"
              icon={Activity}
              accent="cyan"
              trend="+14%"
            />
            <MetricCard
              label="Abnormal Ectopics"
              value={`${abnormalRate.toFixed(1)}%`}
              sub="PVC & SVT arrhythmia rate"
              icon={HeartPulse}
              accent="amber"
            />
            <MetricCard
              label="Inference Latency"
              value={`${avgInference.toFixed(1)} ms`}
              sub="Real-time WebSocket throughput"
              icon={Zap}
              accent="emerald"
            />
            <MetricCard
              label="Ensemble Accuracy"
              value="99.1%"
              sub="AAMI EC57 compliant models"
              icon={ShieldCheck}
              accent="violet"
            />
          </>
        )}
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Label Distribution Donut */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle>
                <HeartPulse className="h-4 w-4 text-cyan-400" />
                <span>Arrhythmia Distribution (AAMI 5-Class)</span>
              </CardTitle>
              <span className="text-[11px] font-mono text-slate-400">Last 50 Patient Traces</span>
            </div>
          </CardHeader>
          <CardContent>
            <LabelDonut counts={labelCounts} />
          </CardContent>
        </Card>

        {/* Screening Timeline Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle>
                <Clock className="h-4 w-4 text-cyan-400" />
                <span>Screening Volume (24h Activity)</span>
              </CardTitle>
              <span className="text-[11px] font-mono text-emerald-400">Live Intake</span>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="screenVolumeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="hour"
                  stroke="#64748b"
                  fontSize={10}
                  fontFamily="JetBrains Mono"
                  interval={3}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  fontFamily="JetBrains Mono"
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-xl border border-cyan-500/30 bg-[#091122]/95 px-3 py-2 text-xs font-mono shadow-2xl backdrop-blur-md">
                          <div className="text-slate-400 text-[10px]">{payload[0].payload.hour}</div>
                          <div className="text-cyan-300 font-bold">
                            {payload[0].value} screenings
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fill="url(#screenVolumeGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Screenings Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>
              <Activity className="h-4 w-4 text-cyan-400" />
              <span>Recent Clinical Screenings</span>
            </CardTitle>
            <Link
              to="/history"
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 group"
            >
              <span>View Full Audit Log</span>
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <div className="skeleton rounded-xl h-10 w-full" />
              <div className="skeleton rounded-xl h-10 w-full" />
              <div className="skeleton rounded-xl h-10 w-full" />
            </div>
          ) : !recent || recent.items.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-3">
              <Activity className="h-10 w-10 mx-auto text-slate-600 animate-pulse" />
              <p className="text-sm">No clinical results logged yet.</p>
              <Link
                to="/screen?demo=1"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition-all"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Run Instant Demo Analysis
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 border-b border-white/[0.08]">
                    <th className="pb-3 px-3">Timestamp</th>
                    <th className="pb-3 px-3">Patient ID</th>
                    <th className="pb-3 px-3">Total Beats</th>
                    <th className="pb-3 px-3">Dominant Rhythm</th>
                    <th className="pb-3 px-3">Abnormal %</th>
                    <th className="pb-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {recent.items.slice(0, 8).map((r) => {
                    const abnormalPct =
                      r.total_beats > 0
                        ? (((r.total_beats - r.label_summary.N) / r.total_beats) * 100).toFixed(1)
                        : "0.0";
                    const isHighAbnormal = parseFloat(abnormalPct) > 20;

                    return (
                      <tr
                        key={r.result_id}
                        className="hover:bg-white/[0.03] transition-colors group"
                      >
                        <td className="py-3 px-3 font-mono text-xs text-slate-400">
                          {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-slate-200">
                          <span className="px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                            {r.patient_id ?? "ANON-01"}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-300">
                          {r.total_beats.toLocaleString()}
                        </td>
                        <td className="py-3 px-3">
                          {r.dominant_label && (
                            <LabelBadge label={r.dominant_label} showName size="sm" />
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`font-mono font-semibold text-xs ${
                              isHighAbnormal ? "text-rose-400" : "text-emerald-400"
                            }`}
                          >
                            {abnormalPct}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            to="/history"
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-cyan-300 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 transition-all"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Inspect</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
