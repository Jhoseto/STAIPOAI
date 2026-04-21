import React from 'react';
import { Bot, X } from 'lucide-react';
import { useCADStore } from '../../../store/cad-store';

export function AgentHeader() {
  const { toggleAssistant } = useCADStore();
  
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/60 shrink-0 bg-white/50">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-blue-50 flex items-center justify-center">
          <Bot size={14} className="text-blue-600" />
        </div>
        <span className="font-semibold text-sm text-slate-900 tracking-tight">STAIPO AI</span>
        
        {/* Dynamic Model Indicator */}
        <span className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200/50 shadow-sm ml-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          gemini-2.5-pro
        </span>
      </div>
      
      <button 
        onClick={toggleAssistant} 
        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
}
