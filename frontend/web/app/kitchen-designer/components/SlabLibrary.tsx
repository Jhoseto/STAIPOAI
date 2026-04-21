"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, X, Layers } from 'lucide-react';
import { useCADStore } from '../store/cad-store';

interface SlabPreset {
  id: string;
  label: string;
  description: string;
  width: number;
  depth: number;
  height: number;
  orientation: 'horizontal' | 'vertical';
  emoji: string;
}

const SLAB_PRESETS: Record<string, SlabPreset[]> = {
  horizontal: [
    { id: 'shelf-60', label: 'Рафт 60', description: '600x300x18 мм', width: 600, depth: 300, height: 18, orientation: 'horizontal', emoji: '▬' },
    { id: 'shelf-80', label: 'Рафт 80', description: '800x300x18 мм', width: 800, depth: 300, height: 18, orientation: 'horizontal', emoji: '▬' },
    { id: 'shelf-100', label: 'Рафт 100', description: '1000x300x18 мм', width: 1000, depth: 300, height: 18, orientation: 'horizontal', emoji: '▬' },
    { id: 'worktop-60', label: 'Плот 60', description: '600x600x38 мм', width: 600, depth: 600, height: 38, orientation: 'horizontal', emoji: '▭' },
    { id: 'worktop-120', label: 'Плот 120', description: '1200x600x38 мм', width: 1200, depth: 600, height: 38, orientation: 'horizontal', emoji: '▭' },
  ],
  vertical: [
    { id: 'side-base', label: 'Страница Долен', description: '720x600x18 мм', width: 18, depth: 600, height: 720, orientation: 'vertical', emoji: '┃' },
    { id: 'side-tall', label: 'Страница Колона', description: '2200x600x18 мм', width: 18, depth: 600, height: 2200, orientation: 'vertical', emoji: '┃' },
    { id: 'side-wall', label: 'Страница Горен', description: '600x350x18 мм', width: 18, depth: 350, height: 600, orientation: 'vertical', emoji: '┃' },
    { id: 'island-cladding', label: 'Островен панел', description: '900x1200x18 мм', width: 1200, depth: 900, height: 18, orientation: 'vertical', emoji: '█' },
  ],
  decorative: [
    { id: 'acc-post', label: 'Деко колона', description: '100x100x720 мм', width: 100, depth: 100, height: 720, orientation: 'vertical', emoji: '▮' },
    { id: 'acc-block', label: 'Деко куб', description: '400x400x400 мм', width: 400, depth: 400, height: 400, orientation: 'horizontal', emoji: '■' },
  ]
};

const TABS = [
  { id: 'horizontal', label: 'Хоризонтални' },
  { id: 'vertical', label: 'Вертикални' },
  { id: 'decorative', label: 'Декоративни' },
];

export function SlabLibrary() {
  const { currentCommand, startCommand, endCommand } = useCADStore();
  const [activeTab, setActiveTab] = useState<'horizontal' | 'vertical' | 'decorative'>('horizontal');
  const [selectedPreset, setSelectedPreset] = useState<SlabPreset | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const isVisible = currentCommand === 'FURNITURE';

  const handleSelectPreset = (preset: SlabPreset) => {
    setSelectedPreset(preset);
    startCommand('FURNITURE', {
      width: preset.width,
      depth: preset.depth,
      height: preset.height,
      orientation: preset.orientation,
      label: preset.label
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-[760px] max-w-[calc(100vw-120px)]"
        >
          <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Layers size={18} className="text-blue-400" />
                <span className="text-white text-sm font-semibold tracking-wide">Библиотека Плотове и Панели</span>
                {selectedPreset && (
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    {selectedPreset.label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCollapsed(!collapsed)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                >
                  {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <button
                  onClick={() => { endCommand(); setSelectedPreset(null); }}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content */}
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  {/* Tabs */}
                  <div className="flex gap-1 px-4 pt-3">
                    {TABS.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                          activeTab === tab.id
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                            : 'text-slate-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Preset Grid */}
                  <div className="grid grid-cols-5 gap-2 p-4">
                    {SLAB_PRESETS[activeTab].map((preset) => {
                      const isSelected = selectedPreset?.id === preset.id;
                      return (
                        <button
                          key={preset.id}
                          onClick={() => handleSelectPreset(preset)}
                          className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all group ${
                            isSelected
                              ? 'bg-emerald-500/20 border-emerald-400/50 text-white'
                              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20 hover:text-white'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-transform group-hover:scale-110 ${
                            isSelected ? 'scale-110' : ''
                          }`}>
                            {preset.emoji}
                          </div>
                          <div className="text-center">
                            <div className="text-xs font-semibold leading-tight">{preset.label}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap">{preset.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="px-4 pb-3 text-[10px] text-slate-500 text-center uppercase tracking-widest font-medium">
                    Избери модел → кликни в 3D пространството за поставяне
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
