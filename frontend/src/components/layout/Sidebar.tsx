import { NavLink } from "react-router-dom";
import { LayoutDashboard, Activity, Radio, Layers, History as HistoryIcon, HeartPulse } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "@/api/health";
import { cn } from "@/utils/cn";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/screen", label: "Screen", icon: Activity },
  { to: "/stream", label: "Stream", icon: Radio },
  { to: "/batch", label: "Batch", icon: Layers },
  { to: "/history", label: "History", icon: HistoryIcon },
];

function statusColor(status?: string) {
  if (status === "ok") return "bg-ecg-success";
  if (status === "degraded") return "bg-ecg-warning";
  return "bg-ecg-danger";
}

export function Sidebar() {
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 15000,
    retry: 1,
  });

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 flex flex-col border-r border-ecg-border bg-ecg-surface">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-ecg-border">
        <HeartPulse className="h-6 w-6 text-ecg-accent animate-heartbeat" />
        <span className="font-bold tracking-tight">PS-03</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-ecg-accent/15 text-ecg-accent font-semibold"
                  : "text-ecg-muted hover:bg-ecg-bg hover:text-white"
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-ecg-border text-xs text-ecg-muted space-y-1">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", statusColor(health?.status))} />
          <span>{health ? `System ${health.status}` : "Connecting..."}</span>
        </div>
        <div className="truncate opacity-70">API: /api/v1</div>
      </div>
    </aside>
  );
}
