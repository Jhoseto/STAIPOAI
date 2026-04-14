"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Database, Zap, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type ScraperStatus = {
  is_running: boolean;
  current_category: string | null;
  items_added: number;
  items_processed: number;
  last_item_name: string | null;
  started_at: string | null;
  finished_at: string | null;
};

export function ScraperTrigger() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<ScraperStatus | null>(null);

  // Poll status while busy
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (busy) {
      interval = setInterval(async () => {
        try {
          const res = await fetch("/api/scrape/salex/status");
          if (res.ok) {
            const data = await res.json();
            setStatus(data);
            if (!data.is_running && busy) {
              setBusy(false);
              toast.success("Синхронизацията завърши!");
            }
          }
        } catch (e) {
          console.error("Polling error:", e);
        }
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [busy]);

  async function runScraper() {
    console.log("Starting scraper sync...");
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/scrape/salex/run", { method: "POST" });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      toast.info("Стартиране на процеса...");
    } catch (e) {
      setBusy(false);
      toast.error("Грешка при стартиране", {
        description: e instanceof Error ? e.message : "Неизвестна грешка"
      });
    }
  }

  return (
    <div className="mt-8 pt-8 border-t border-border/40">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary text-xs font-medium uppercase tracking-widest">
              <Database className="w-3 h-3" />
              <span>Каталог & Цени</span>
            </div>
            <h3 className="text-xl font-semibold">Синхронизация със Salex</h3>
            <p className="text-sm text-muted-foreground font-light max-w-md">
              Обновете локалния си каталог с актуални цени и наличности директно от Salex.bg. Процесът отнема няколко минути.
            </p>
          </div>
          
          <Button 
            onClick={runScraper} 
            disabled={busy} 
            className="btn-premium gap-2 px-8 h-12 min-w-[200px]"
          >
            {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {busy ? "Синхронизиране..." : "Стартирай актуализация"}
          </Button>
        </div>

        <AnimatePresence>
          {status && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="glass-premium rounded-xl p-6 border border-primary/20 bg-primary/5">
                <div className="flex flex-col gap-4">
                  {/* Status Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {status.is_running ? (
                        <div className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                        </div>
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                      <span className="font-medium text-sm">
                        {status.is_running ? `В момента: ${status.current_category || "Инициализация"}` : "Последна синхронизация завършена"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {status.items_processed} артикула проверени
                    </div>
                  </div>

                  {/* Progress Info */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-3 rounded-lg bg-background/40 border border-border/40">
                      <div className="text-[10px] uppercase text-muted-foreground mb-1">Добавени нови</div>
                      <div className="text-lg font-bold text-primary">{status.items_added}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-background/40 border border-border/40">
                      <div className="text-[10px] uppercase text-muted-foreground mb-1">Проверени общо</div>
                      <div className="text-lg font-bold">{status.items_processed}</div>
                    </div>
                    <div className="col-span-2 p-3 rounded-lg bg-background/40 border border-border/40">
                      <div className="text-[10px] uppercase text-muted-foreground mb-1">Последно намерен</div>
                      <div className="text-sm font-medium truncate">{status.last_item_name || "—"}</div>
                    </div>
                  </div>

                  {/* Progress Bar (Simulated or based on expectation if we knew total) */}
                  {status.is_running && (
                    <div className="w-full bg-border/40 rounded-full h-1.5 overflow-hidden">
                      <motion.div 
                        className="bg-primary h-full"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 120, ease: "linear" }} // Expecting ~2 mins per category
                      />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
