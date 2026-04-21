import React from 'react';
import { Wand2, LayoutDashboard, Calculator, Presentation } from 'lucide-react';

interface QuickActionsBarProps {
  onAction: (message: string, isComplex: boolean) => void;
}

export function QuickActionsBar({ onAction }: QuickActionsBarProps) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2.5 shrink-0 border-b border-slate-100 bg-slate-50/50 no-scrollbar">
      
      <button 
        onClick={() => onAction("Стартирай Smart Wizard за нова кухня.", true)} 
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all whitespace-nowrap shadow-sm group"
      >
        <Wand2 size={12} className="text-blue-500 group-hover:text-white transition-colors" />
        Визард
      </button>

      <button 
        onClick={() => onAction("Направи пълен дизайн одит на проекта (ергономия и безопасност).", true)} 
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all whitespace-nowrap shadow-sm group"
      >
        <LayoutDashboard size={12} className="text-emerald-500 group-hover:text-white transition-colors" />
        Одит
      </button>

      <button 
        onClick={() => onAction("Изчисли приблизителна цена на текущия проект.", true)} 
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all whitespace-nowrap shadow-sm group"
      >
        <Calculator size={12} className="text-amber-500 group-hover:text-white transition-colors" />
        Бюджет
      </button>

      <button 
        onClick={() => onAction("Подготви клиентска презентация (снимки и BOM).", false)} 
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all whitespace-nowrap shadow-sm group"
      >
        <Presentation size={12} className="text-purple-500 group-hover:text-white transition-colors" />
        Презентация
      </button>

    </div>
  );
}
