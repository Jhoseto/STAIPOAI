"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/app-shell';
import { useCADStore } from './store/cad-store';
import { CADViewer } from './components/CADViewer';
import { ModernCADToolbar } from './components/ModernCADToolbar';
import { ModernSystemToolbar } from './components/ModernSystemToolbar';
import { ModernPropertiesPanel } from './components/ModernPropertiesPanel';
import { StartScreen } from './components/StartScreen';
import { RoomWizard } from './components/RoomWizard';

type ViewMode = 'start' | 'wizard' | 'cad';

export default function KitchenDesignerPage() {
  const { drawing, initializeDrawing } = useCADStore();
  const [viewMode, setViewMode] = useState<ViewMode>('start');

  const handleQuickStart = () => {
    setViewMode('wizard');
  };

  const handleNewProject = () => {
    if (!drawing) {
      initializeDrawing('Нов Проект');
    }
    setViewMode('cad');
  };

  const handleLoadProject = () => {
    // Логика за зареждане на проект (ще се добави по-късно)
    setViewMode('cad');
  };

  if (viewMode === 'start') {
    return (
      <AppShell>
        <StartScreen
          onQuickStart={handleQuickStart}
          onNewProject={handleNewProject}
          onLoadProject={handleLoadProject}
        />
      </AppShell>
    );
  }

  if (viewMode === 'wizard') {
    return (
      <AppShell>
        <div className="absolute inset-0 bg-[#F2F4F7] z-10 overflow-auto">
          <RoomWizard onComplete={() => setViewMode('cad')} />
        </div>
      </AppShell>
    );
  }

  // Покажи зареждане само ако сме в CAD режим, но чертежът още не е готов
  if (viewMode === 'cad' && !drawing) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full bg-slate-950">
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.98, 1, 0.98] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="text-blue-400 font-medium tracking-widest text-sm uppercase flex flex-col items-center gap-4"
          >
            <div className="w-12 h-12 border-t-2 border-r-2 border-blue-500 rounded-full animate-spin" />
            Инициализиране на 3D CAD системата...
          </motion.div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="absolute inset-0 bg-[#F2F4F7] text-slate-900 overflow-hidden flex flex-col z-10 font-sans selection:bg-blue-500/30">
        
        {/* Background with premium styling from homepage */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
          <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-white blur-[130px] opacity-60 pointer-events-none" />
        </div>

        <ModernSystemToolbar />
        <div className="flex-1 flex overflow-hidden relative z-10">
          <ModernCADToolbar />
          <div className="flex-1 relative bg-transparent shadow-inner overflow-hidden">
            <CADViewer />
          </div>
          <ModernPropertiesPanel />
        </div>
      </div>
    </AppShell>
  );
}