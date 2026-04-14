"use client";

import * as React from "react";
import { Sparkles, AlertTriangle, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ValueAnalysisPanelProps {
  uploadId: string;
  payload: {
    transportCost: number;
    installationCost: number;
    otherCost: number;
    marginPct: number;
  };
  className?: string;
  activeTrigger?: number; // whenever this changes, re-fetch analysis if requested
}

export function ValueAnalysisPanel({ uploadId, payload, className, activeTrigger }: ValueAnalysisPanelProps) {
  const [analysis, setAnalysis] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const prevTrigger = React.useRef(activeTrigger);

  const fetchAnalysis = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/uploads/${encodeURIComponent(uploadId)}/analyze-value`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("грешка при анализа");
      const data = await res.json();
      setAnalysis(data.analysis || "Няма наличен анализ.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Грешка");
    } finally {
      setLoading(false);
    }
  }, [uploadId, payload]);

  React.useEffect(() => {
    if (activeTrigger !== prevTrigger.current) {
        prevTrigger.current = activeTrigger;
        fetchAnalysis();
    }
  }, [activeTrigger, fetchAnalysis]);

  if (!analysis && !loading && !error) return null;

  return (
    <div className={cn("rounded-2xl p-6 border transition-all duration-500", 
      analysis ? "bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border-indigo-100 shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]" : "bg-muted/30 border-border/40",
      className
    )}>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className={cn("h-4 w-4", loading ? "text-muted-foreground animate-pulse" : "text-indigo-500")} />
        <span className="text-xs font-bold uppercase tracking-widest text-indigo-900/70">AI Анализ на стойността</span>
      </div>
      
      {loading ? (
        <div className="flex items-center gap-3 text-indigo-600/60 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Анализиране на рискове и маржове...
        </div>
      ) : error ? (
        <div className="text-red-500 text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      ) : (
        <div className="text-sm font-medium leading-relaxed text-indigo-950/80 animate-enter">
          {analysis}
        </div>
      )}
    </div>
  );
}
