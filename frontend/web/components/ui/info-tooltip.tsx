"use client";

import React from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  content: string;
  className?: string;
  iconClassName?: string;
}

export function InfoTooltip({ content, className, iconClassName }: InfoTooltipProps) {
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div className={cn("inline-flex items-center justify-center cursor-help group", className)}>
            <Info className={cn("w-3.5 h-3.5 text-muted-foreground/70 group-hover:text-primary transition-colors", iconClassName)} />
          </div>
        </Tooltip.Trigger>
        
        <Tooltip.Portal>
          <Tooltip.Content
            side="right"
            align="center"
            sideOffset={8}
            className="z-[9999]"
          >
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, x: -5 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                className="w-64 p-3.5 bg-card/95 backdrop-blur-md border border-border/60 shadow-2xl rounded-xl z-[9999]"
              >
                <p className="text-xs text-foreground/90 font-light leading-relaxed">
                  {content}
                </p>
                <Tooltip.Arrow className="fill-border/60" width={12} height={6} />
              </motion.div>
            </AnimatePresence>
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
