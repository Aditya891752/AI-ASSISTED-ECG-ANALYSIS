import * as RadixToast from "@radix-ui/react-toast";
import React, { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import { cn } from "@/utils/cn";

type ToastKind = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
}

interface ToastContextValue {
  showToast: (kind: ToastKind, title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const kindStyles: Record<ToastKind, { border: string; icon: React.ReactNode }> = {
  success: { border: "border-emerald-500", icon: <CheckCircle2 className="h-5 w-5 text-emerald-400" /> },
  error: { border: "border-rose-500", icon: <XCircle className="h-5 w-5 text-rose-400" /> },
  warning: { border: "border-amber-500", icon: <AlertTriangle className="h-5 w-5 text-amber-400" /> },
  info: { border: "border-cyan-500", icon: <Info className="h-5 w-5 text-cyan-400" /> },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback(
    (kind: ToastKind, title: string, description?: string) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, kind, title, description }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      <RadixToast.Provider swipeDirection="right">
        {children}
        {toasts.map((t) => (
          <RadixToast.Root
            key={t.id}
            className={cn(
              "flex items-start gap-3 rounded-lg border bg-ecg-surface p-4 shadow-lg",
              kindStyles[t.kind].border
            )}
            onOpenChange={(open) => {
              if (!open) setToasts((prev) => prev.filter((x) => x.id !== t.id));
            }}
          >
            {kindStyles[t.kind].icon}
            <div>
              <RadixToast.Title className="text-sm font-semibold text-white">
                {t.title}
              </RadixToast.Title>
              {t.description && (
                <RadixToast.Description className="text-xs text-ecg-muted mt-1">
                  {t.description}
                </RadixToast.Description>
              )}
            </div>
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="fixed bottom-4 right-4 flex flex-col gap-2 w-96 max-w-full z-[100]" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}
