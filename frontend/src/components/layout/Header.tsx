import { useNavigate, useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select";
import { useAppStore, MODEL_OPTIONS } from "@/store/appStore";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/screen": "Single ECG Analysis",
  "/stream": "Real-Time Streaming",
  "/batch": "Batch Processing",
  "/history": "Result History",
};

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedModelId, setSelectedModelId } = useAppStore();
  const activeModel = MODEL_OPTIONS.find((m) => m.id === selectedModelId);

  return (
    <header className="flex items-center justify-between border-b border-ecg-border bg-ecg-surface/60 px-6 py-4 sticky top-0 z-30 backdrop-blur">
      <div>
        <h1 className="text-lg font-semibold">
          {PAGE_TITLES[location.pathname] ?? "PS-03"}
        </h1>
        {activeModel && (
          <p className="text-xs text-ecg-muted mt-0.5">
            Outputs: {activeModel.classes.join(", ")}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Select value={selectedModelId} onValueChange={setSelectedModelId}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODEL_OPTIONS.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="secondary" onClick={() => navigate("/screen?demo=1")}>
          <Sparkles className="h-4 w-4" />
          Demo Mode
        </Button>
      </div>
    </header>
  );
}
