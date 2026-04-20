"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { useCADStore } from '../store/cad-store';

interface CabinetPreset {
  id: string;
  label: string;
  description: string;
  cabinetType: 'base' | 'wall' | 'tall' | 'sink' | 'stove' | 'fridge';
  width: number;
  depth: number;
  height: number;
  floorOffset: number; // height of cabinet bottom above floor in mm
  emoji: string;
}

const CABINET_PRESETS: Record<string, CabinetPreset[]> = {
  base: [
    { id: 'base-40', label: 'Долен 40', description: '40 × 60 мм', cabinetType: 'base', width: 400, depth: 600, height: 720, floorOffset: 100, emoji: '▭' },
    { id: 'base-50', label: 'Долен 50', description: '50 × 60 мм', cabinetType: 'base', width: 500, depth: 600, height: 720, floorOffset: 100, emoji: '▭' },
    { id: 'base-60', label: 'Долен 60', description: '60 × 60 мм', cabinetType: 'base', width: 600, depth: 600, height: 720, floorOffset: 100, emoji: '▭' },
    { id: 'base-80', label: 'Долен 80', description: '80 × 60 мм', cabinetType: 'base', width: 800, depth: 600, height: 720, floorOffset: 100, emoji: '▭' },
    { id: 'base-100', label: 'Долен 100', description: '100 × 60 мм', cabinetType: 'base', width: 1000, depth: 600, height: 720, floorOffset: 100, emoji: '▭' },
    { id: 'sink-80', label: 'Мивка 80', description: '80 × 60 мм', cabinetType: 'sink', width: 800, depth: 600, height: 720, floorOffset: 100, emoji: '⬛' },
    { id: 'stove-60', label: 'Котлони 60', description: '60 × 60 мм', cabinetType: 'stove', width: 600, depth: 600, height: 720, floorOffset: 100, emoji: '🔥' },
  ],
  wall: [
    { id: 'wall-40', label: 'Горен 40', description: '40 × 35 мм', cabinetType: 'wall', width: 400, depth: 350, height: 600, floorOffset: 1400, emoji: '▬' },
    { id: 'wall-50', label: 'Горен 50', description: '50 × 35 мм', cabinetType: 'wall', width: 500, depth: 350, height: 600, floorOffset: 1400, emoji: '▬' },
    { id: 'wall-60', label: 'Горен 60', description: '60 × 35 мм', cabinetType: 'wall', width: 600, depth: 350, height: 600, floorOffset: 1400, emoji: '▬' },
    { id: 'wall-80', label: 'Горен 80', description: '80 × 35 мм', cabinetType: 'wall', width: 800, depth: 350, height: 600, floorOffset: 1400, emoji: '▬' },
    { id: 'wall-100', label: 'Горен 100', description: '100 × 35 мм', cabinetType: 'wall', width: 1000, depth: 350, height: 600, floorOffset: 1400, emoji: '▬' },
  ],
  tall: [
    { id: 'tall-fridge', label: 'Хладилник', description: '60 × 65 мм', cabinetType: 'fridge', width: 600, depth: 650, height: 2100, floorOffset: 0, emoji: '🧊' },
    { id: 'tall-col-60', label: 'Колона 60', description: '60 × 60 мм', cabinetType: 'tall', width: 600, depth: 600, height: 2200, floorOffset: 0, emoji: '⬜' },
    { id: 'tall-col-45', label: 'Колона 45', description: '45 × 60 мм', cabinetType: 'tall', width: 450, depth: 600, height: 2200, floorOffset: 0, emoji: '⬜' },
    { id: 'tall-oven', label: 'За фурна', description: '60 × 60 мм', cabinetType: 'tall', width: 600, depth: 600, height: 2200, floorOffset: 0, emoji: '🟫' },
  ],
};

const TABS = [
  { id: 'base', label: 'Долни шкафове' },
  { id: 'wall', label: 'Горни шкафове' },
  { id: 'tall', label: 'Колони' },
];

export function CabinetLibrary() {
  const { currentCommand, startCommand, endCommand } = useCADStore();
  const [activeTab, setActiveTab] = useState<'base' | 'wall' | 'tall'>('base');
  const [selectedPreset, setSelectedPreset] = useState<CabinetPreset | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const isVisible = currentCommand === 'CABINET';

  const handleSelectPreset = (preset: CabinetPreset) => {
    setSelectedPreset(preset);
    startCommand('CABINET', {
      cabinetType: preset.cabinetType,
      width: preset.width,
      depth: preset.depth,
      height: preset.height,
      floorOffset: preset.floorOffset,
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
                <span className="text-white text-sm font-semibold tracking-wide">Библиотека шкафове</span>
                {selectedPreset && (
                  <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
                    {selectedPreset.label} · {selectedPreset.width / 10}cm
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
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                            : 'text-slate-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Preset Grid */}
                  <div className="grid grid-cols-7 gap-2 p-4">
                    {CABINET_PRESETS[activeTab].map((preset) => {
                      const isSelected = selectedPreset?.id === preset.id;
                      return (
                        <button
                          key={preset.id}
                          onClick={() => handleSelectPreset(preset)}
                          className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all group ${
                            isSelected
                              ? 'bg-blue-500/20 border-blue-400/50 text-white'
                              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20 hover:text-white'
                          }`}
                        >
                          {/* Cabinet thumbnail */}
                          <div className={`w-10 h-8 rounded-md flex items-center justify-center text-lg transition-transform group-hover:scale-110 ${
                            isSelected ? 'scale-110' : ''
                          }`}>
                            {preset.emoji}
                          </div>
                          <div className="text-center">
                            <div className="text-xs font-semibold leading-tight">{preset.label}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{preset.description}</div>
                          </div>
                          {isSelected && (
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Hint */}
                  <div className="px-4 pb-3 text-xs text-slate-500 text-center">
                    Избери модел → кликни в 3D пространството за поставяне · ESC за изход
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
