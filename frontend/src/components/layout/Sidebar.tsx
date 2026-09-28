import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Activity,
  Radio,
  Layers,
  History as HistoryIcon,
  HeartPulse,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "@/api/health";
import { cn } from "@/utils/cn";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, badge: null },
  { to: "/screen", label: "Single Screen", icon: Activity, badge: "Instant" },
  { to: "/stream", label: "Live Telemetry", icon: Radio, badge: "360 Hz", isLive: true },
  { to: "/batch", label: "Batch Queue", icon: Layers, badge: null },
  { to: "/history", label: "Patient Audit", icon: HistoryIcon, badge: null },
];

export function Sidebar() {
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 15000,
    retry: 1,
  });

  const isHealthy = health?.status === "ok";
  const isDegraded = health?.status === "degraded";

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 flex flex-col border-r border-white/[0.08] bg-[#091122]/90 backdrop-blur-2xl z-40 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25 border border-cyan-300/30">
            <HeartPulse className="h-5 w-5 text-slate-950 animate-heartbeat" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-300 border-2 border-[#091122]" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-white text-base">CARDIO AI</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                PS-03
              </span>
            </div>
            <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>Bioforge Clinical</span>
              <span className="h-1 w-1 rounded-full bg-slate-600" />
              <span className="text-cyan-400 font-mono">v1.2</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 py-5 overflow-y-auto space-y-6">
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Clinical Workstation
          </div>
          <nav className="space-y-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon, badge, isLive }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  cn(
                    "group relative flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-cyan-500/20 via-blue-500/10 to-transparent text-cyan-300 border border-cyan-500/30 shadow-md shadow-cyan-950/40"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          "h-4 w-4 transition-colors",
                          isActive ? "text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]" : "text-slate-400 group-hover:text-slate-300"
                        )}
                      />
                      <span>{label}</span>
                    </div>

                    {isLive && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        LIVE
                      </span>
                    )}

                    {badge && !isLive && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/[0.06] text-slate-400 group-hover:text-slate-300">
                        {badge}
                      </span>
                    )}

                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-cyan-400 shadow-[0_0_10px_#06b6d4]" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Diagnostic Engine Card */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-cyan-400" />
              Dual-Engine AI
            </span>
            <span className="text-[10px] font-mono text-cyan-400">221-D</span>
          </div>
          <div className="space-y-1.5 text-[11px] text-slate-400">
            <div className="flex items-center justify-between">
              <span>MIT-BIH Arrhythmia</span>
              <span className="font-mono text-emerald-400 font-semibold">89.2%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>PTB Diagnostic (MI)</span>
              <span className="font-mono text-emerald-400 font-semibold">97.0%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Combined Benchmark</span>
              <span className="font-mono text-cyan-300 font-semibold">99.1%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Telemetry Status */}
      <div className="p-4 border-t border-white/[0.06] bg-[#070d1a]/80 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {isHealthy ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : isDegraded ? (
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            ) : (
              <XCircle className="h-4 w-4 text-rose-400" />
            )}
            <span className="font-semibold text-slate-200">
              {health ? `System ${health.status.toUpperCase()}` : "Connecting..."}
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">&lt; 4.8ms</span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/[0.04]">
          <span className="truncate">Team Bioforge</span>
          <span className="text-[10px] text-cyan-400 font-mono">IEEE EMBS</span>
        </div>
      </div>
    </aside>
  );
}
