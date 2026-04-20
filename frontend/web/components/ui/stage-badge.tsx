"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { MessageSquare, Send, CheckCircle2, Factory, Wrench, Flag } from "lucide-react";

export type ProjectStage = "inquiry" | "offer_sent" | "approved" | "production" | "installation" | "completed";

export const STAGES: { id: ProjectStage; label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }[] = [
  { id: "inquiry", label: "Запитване", icon: MessageSquare, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  { id: "offer_sent", label: "Изпратена Оферта", icon: Send, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  { id: "approved", label: "Одобрена", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
  { id: "production", label: "Производство", icon: Factory, color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
  { id: "installation", label: "Монтаж", icon: Wrench, color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
  { id: "completed", label: "Завършен", icon: Flag, color: "text-slate-600", bg: "bg-slate-100 border-slate-300" },
];

export function StageBadge({ stage, className }: { stage?: string | null; className?: string }) {
  const currentStage = STAGES.find((s) => s.id === (stage || "inquiry")) || STAGES[0];
  const Icon = currentStage.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase border",
        currentStage.bg,
        currentStage.color,
        className
      )}
    >
      <Icon className="w-3 h-3" />
      {currentStage.label}
    </div>
  );
}
