import React from 'react';
import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';

export function ThinkingIndicator() {
  return (
    <div className="flex gap-3 px-4 py-3 bg-slate-50/10">
      <div className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center shadow-sm bg-blue-100 text-blue-600">
        <Bot size={14} />
      </div>
      
      <div className="flex flex-col max-w-[85%]">
        <span className="text-[10px] font-medium text-slate-400 mb-2">
          STAIPO AI
        </span>
        <div className="flex items-center gap-1.5 h-5 px-1">
          <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0 }} className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span className="text-[11px] text-slate-400 ml-2 animate-pulse">Анализирам проекта...</span>
        </div>
      </div>
    </div>
  );
}
