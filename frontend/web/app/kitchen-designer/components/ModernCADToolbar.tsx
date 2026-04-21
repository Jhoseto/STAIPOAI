import React, { useState } from 'react';
import { Pencil, Square, LayoutGrid, Box, Settings, Search, Move, MousePointer2, ShieldAlert, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCADStore } from '../store/cad-store';

export function ModernCADToolbar() {
  const { currentCommand, startCommand, collisionDetectionEnabled, setCollisionDetectionEnabled } = useCADStore();
  const [showSettings, setShowSettings] = useState(false);

  const tools = [
    { id: 'SELECT', icon: MousePointer2, label: 'Избор' },
    { id: 'WALL', icon: Pencil, label: 'Чертане на стена' },
    { id: 'CABINET', icon: Box, label: 'Библиотека шкафове' },
    { id: 'FURNITURE', icon: Layers, label: 'Плотове/Панели' },
    { id: 'DOOR', icon: Square, label: 'Врати и прозорци' },
    { id: 'MOVE', icon: Move, label: 'Преместване' },
  ];

  return (
    <div className="flex relative z-20">
      <aside className="w-16 bg-white/50 backdrop-blur-md border-r border-slate-200 flex flex-col items-center py-4 gap-4 shrink-0">
        {tools.map((tool) => {
          const isActive = currentCommand === tool.id || (currentCommand === null && tool.id === 'SELECT');
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => startCommand(tool.id)}
              title={tool.label}
              className={`p-3 rounded-xl transition-all duration-200 group relative ${
                isActive 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2 : 1.5} />
              
              {/* Premium Tooltip */}
              <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-md shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                {tool.label}
              </div>
            </button>
          );
        })}

        <div className="mt-auto flex flex-col gap-4">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-3 rounded-xl transition-colors border border-transparent ${
              showSettings ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Settings size={22} strokeWidth={1.5} />
          </button>
        </div>
      </aside>

      {/* Expanding Settings Menu */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="absolute left-16 bottom-4 w-64 bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl shadow-2xl p-4 overflow-hidden"
          >
            <h3 className="text-slate-900 font-semibold text-sm mb-4">Настройки</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md ${collisionDetectionEnabled ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                    <ShieldAlert size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-900">Колизии</div>
                    <div className="text-[10px] text-slate-500 line-clamp-1">Засичане на застъпване</div>
                  </div>
                </div>
                
                <button
                  onClick={() => setCollisionDetectionEnabled(!collisionDetectionEnabled)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    collisionDetectionEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      collisionDetectionEnabled ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              {/* Future settings can be added here */}
              <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 text-center">
                Допълнителни настройки ще бъдат добавени тук
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
