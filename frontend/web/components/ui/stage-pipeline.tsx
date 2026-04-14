"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ProjectStage, STAGES } from "./stage-badge";
import { Check } from "lucide-react";

interface StagePipelineProps {
  currentStage?: string | null;
  onStageChange?: (newStage: ProjectStage) => void;
  readOnly?: boolean;
}

export function StagePipeline({ currentStage, onStageChange, readOnly = false }: StagePipelineProps) {
  const currentIdx = STAGES.findIndex((s) => s.id === (currentStage || "inquiry"));

  return (
    <div className="w-full relative flex items-center justify-between mt-4 mb-2">
      {/* Background Line */}
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-border/40 z-0" />
      {/* Progress Line */}
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary z-0 transition-all duration-500 ease-in-out"
        style={{ width: `${currentIdx > 0 ? (currentIdx / (STAGES.length - 1)) * 100 : 0}%` }}
      />

      {STAGES.map((stage, idx) => {
        const isActive = idx === currentIdx;
        const isPast = idx < currentIdx;
        const Icon = stage.icon;

        return (
          <button
            key={stage.id}
            disabled={readOnly}
            onClick={() => onStageChange?.(stage.id)}
            className={cn(
              "relative z-10 flex flex-col items-center gap-2 group outline-none",
              !readOnly && "cursor-pointer"
            )}
          >
            <div
              className={cn(
                "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                isActive ? "bg-primary border-primary text-primary-foreground shadow-md scale-110" : 
                isPast ? "bg-primary/10 border-primary text-primary" : 
                "bg-background border-border/60 text-muted-foreground hover:border-primary/50"
              )}
            >
              {isPast ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
            </div>
            <div
              className={cn(
                "absolute -bottom-6 text-[10px] font-medium whitespace-nowrap uppercase tracking-wider transition-all",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )}
            >
              {stage.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}
