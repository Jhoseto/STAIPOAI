'use client';

import React, { useEffect, useState, useRef } from 'react';
import { 
  Save, Undo2, Redo2, Maximize2, Download, Image, Trash2, 
  Layers, Eye, EyeOff, TableProperties, Ruler, Sparkles, 
  SquarePen, Files, LayoutDashboard, Database, Camera
} from 'lucide-react';
import { useCADStore, useUndoManager } from '../store/cad-store';
import { generateBOM, exportBOMToCSV, downloadCSV } from '../lib/bom-engine';
import * as htmlToImage from 'html-to-image';

export function ModernSystemToolbar() {
  const { 
    drawing, selection, deleteSelection, viewMode, setViewMode, 
    toggleLayerVisiblity, currentCommand, startCommand, endCommand, 
    isAssistantOpen, toggleAssistant 
  } = useCADStore();
  
  const { undo, redo, pastStates, futureStates } = useUndoManager();
  const [showLayers, setShowLayers] = useState(false);
  const layerRef = useRef<HTMLDivElement>(null);

  // Close layers dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (layerRef.current && !layerRef.current.contains(event.target as Node)) {
        setShowLayers(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportBOM = () => {
    if (!drawing) return;
    const panels = generateBOM(drawing.entities);
    const csv = exportBOMToCSV(panels);
    downloadCSV(csv, `kitchen_cut_list_${Date.now()}.csv`);
  };

  const handleExportImage = async () => {
    const element = document.querySelector('main') || document.body;
    try {
      const dataUrl = await htmlToImage.toPng(element, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#f8fafc',
      });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `staipo_designer_export_${Date.now()}.png`;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
      alert("Неуспешно генериране на изображение.");
    }
  };

  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;

  return (
    <header className="h-12 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between px-4 z-40 shrink-0 shadow-sm">
      {/* Project & History Group */}
      <div className="flex items-center gap-1">
        <ToolbarButton 
          icon={<Save size={15} />} 
          title="Запази проект" 
          label="Запази"
        />
        <Separator />
        <ToolbarButton 
          icon={<Undo2 size={15} />} 
          onClick={undo} 
          disabled={!canUndo} 
          title="Назад (Ctrl+Z)"
        />
        <ToolbarButton 
          icon={<Redo2 size={15} />} 
          onClick={redo} 
          disabled={!canRedo} 
          title="Напред (Ctrl+Y)"
        />
        <ToolbarButton 
          icon={<Trash2 size={15} />} 
          onClick={deleteSelection} 
          disabled={selection.length === 0} 
          className={selection.length > 0 ? "text-red-500 hover:bg-red-50" : ""}
          title="Изтрий (Delete)"
        />
      </div>

      {/* Center Group: Navigation & Viewing */}
      <div className="flex items-center bg-slate-100/50 p-0.5 rounded-lg border border-slate-200/50">
        <ViewToggleButton 
          active={viewMode === '2d'} 
          onClick={() => setViewMode('2d')} 
          label="2D PLAN" 
        />
        <ViewToggleButton 
          active={viewMode === '3d'} 
          onClick={() => setViewMode('3d')} 
          label="3D VIEW" 
        />
      </div>

      {/* Tools & Actions Group */}
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-1 pr-2">
          <ToolbarButton 
            icon={<Ruler size={15} />} 
            active={currentCommand === 'MEASURE'}
            onClick={() => currentCommand === 'MEASURE' ? endCommand() : startCommand('MEASURE')}
            label="Ролетка" 
          />
          
          <div className="relative" ref={layerRef}>
            <ToolbarButton 
              icon={<Layers size={15} />} 
              onClick={() => setShowLayers(!showLayers)}
              active={showLayers}
              label="Слоеве" 
            />
            {showLayers && drawing && (
              <LayersDropdown layers={drawing.layers} onToggle={toggleLayerVisiblity} />
            )}
          </div>
        </div>

        <Separator />

        <div className="flex items-center gap-2 pl-2">
          <button 
            onClick={toggleAssistant}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all border ${
              isAssistantOpen 
                ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20' 
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Sparkles size={13} className={isAssistantOpen ? 'animate-pulse' : 'text-blue-500'} />
            <span>AI АСИСТЕНТ</span>
          </button>

          <ToolbarButton 
            icon={<Database size={15} />} 
            onClick={handleExportBOM}
            label="BOM"
            className="text-amber-600 hover:bg-amber-50"
          />
          
          <ToolbarButton 
            icon={<Camera size={15} />} 
            onClick={handleExportImage}
            label="EXPORT"
            className="bg-slate-900 text-white hover:bg-slate-800 border-slate-900"
          />
        </div>
      </div>
    </header>
  );
}

function ToolbarButton({ 
  icon, label, onClick, disabled, active, title, className = "" 
}: { 
  icon: React.ReactNode, label?: string, onClick?: () => void, disabled?: boolean, active?: boolean, title?: string, className?: string 
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all duration-200
        text-[10px] font-medium tracking-tight
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
        ${active 
          ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200'
        }
        ${className}
      `}
    >
      {icon}
      {label && <span className="uppercase">{label}</span>}
    </button>
  );
}

function ViewToggleButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 rounded-md text-[9px] font-bold tracking-widest transition-all duration-300
        ${active 
          ? 'bg-white text-slate-900 shadow-sm' 
          : 'text-slate-400 hover:text-slate-600'
        }
      `}
    >
      {label}
    </button>
  );
}

function Separator() {
  return <div className="h-6 w-px bg-slate-200/60 mx-1" />;
}

function LayersDropdown({ layers, onToggle }: { layers: any[], onToggle: (name: string) => void }) {
  return (
    <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1">
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 font-bold text-[9px] text-slate-400 uppercase tracking-widest">
        Управление на слоеве
      </div>
      <div className="max-h-64 overflow-y-auto py-1">
        {layers.map(layer => (
          <button
            key={layer.name}
            onClick={() => onToggle(layer.name)}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors group"
          >
            <span className={`text-[11px] font-medium ${layer.on ? 'text-slate-700' : 'text-slate-400 font-normal italic line-through'}`}>
              {layer.name}
            </span>
            {layer.on ? (
              <Eye size={14} className="text-blue-500" />
            ) : (
              <EyeOff size={14} className="text-slate-300" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
