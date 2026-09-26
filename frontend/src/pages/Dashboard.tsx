import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Eye, AlertTriangle } from "lucide-react";
import { fetchHealth } from "@/api/health";
import { fetchHistory } from "@/api/history";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { LabelBadge } from "@/components/ecg/LabelBadge";
import { LabelDonut } from "@/components/ecg/LabelDonut";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-ecg-muted">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {sub && <p className="text-xs text-ecg-muted mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className ?? "h-24 w-full"}`} />;
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
    if (!recent || recent.items.length === 0) return 0;
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
      {isDegraded && (
        <div className="rounded-lg bg-ecg-warning/10 border border-ecg-warning text-ecg-warning px-4 py-3 flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4" />
          System degraded —{" "}
          {Object.entries(health!.components)
            .filter(([, c]) => c.status !== "ok")
            .map(([name]) => name)
            .join(", ")}{" "}
          unavailable
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        ) : (
          <>
            <StatCard label="Screenings today" value={String(todayCount)} />
            <StatCard label="Abnormal beat rate" value={`${abnormalRate.toFixed(1)}%`} sub="last 100 results" />
            <StatCard
              label="System status"
              value={health?.status?.toUpperCase() ?? "—"}
              sub={health?.version ? `v${health.version}` : undefined}
            />
            <StatCard label="Avg inference time" value={`${avgInference.toFixed(0)} ms`} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Label distribution (last 50 results)</CardTitle>
          </CardHeader>
          <CardContent>
            <LabelDonut counts={labelCounts} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Screenings over time (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={hourlyData}>
                <CartesianGrid stroke="#1f2d3d" strokeDasharray="3 3" />
                <XAxis dataKey="hour" stroke="#6b7280" fontSize={10} interval={2} />
                <YAxis stroke="#6b7280" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1f2d3d" }} />
                <Line type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent results</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40" />
          ) : !recent || recent.items.length === 0 ? (
            <div className="text-sm text-ecg-muted text-center py-10">
              No results yet — run your first screening above.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ecg-muted border-b border-ecg-border">
                  <th className="py-2">Time</th>
                  <th className="py-2">Patient ID</th>
                  <th className="py-2">Beats</th>
                  <th className="py-2">Dominant Label</th>
                  <th className="py-2">Abnormal %</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recent.items.slice(0, 10).map((r) => {
                  const abnormalPct =
                    r.total_beats > 0
                      ? (((r.total_beats - r.label_summary.N) / r.total_beats) * 100).toFixed(1)
                      : "0.0";
                  return (
                    <tr key={r.result_id} className="border-b border-ecg-border/50">
                      <td className="py-2">{new Date(r.created_at).toLocaleString()}</td>
                      <td className="py-2">{r.patient_id ?? "—"}</td>
                      <td className="py-2">{r.total_beats}</td>
                      <td className="py-2">
                        {r.dominant_label && <LabelBadge label={r.dominant_label} />}
                      </td>
                      <td className="py-2">{abnormalPct}%</td>
                      <td className="py-2">
                        <Link to="/history" className="text-ecg-accent hover:underline inline-flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" /> View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
