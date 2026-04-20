import { Save, Undo2, Redo2, Maximize2, Download, Printer } from 'lucide-react';
import { useCADStore, useUndoManager } from '../store/cad-store';
import { useEffect } from 'react';

export function ModernSystemToolbar() {
  const { drawing } = useCADStore();
  const { undo, redo, pastStates, futureStates } = useUndoManager();

  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        if (canRedo) redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 z-20 shrink-0">
      {/* Project Info */}
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <button 
            onClick={() => undo()}
            disabled={!canUndo}
            className={`p-1.5 rounded-md transition-colors ${
              canUndo ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-700 cursor-not-allowed'
            }`}
            title="Назад (Ctrl+Z)"
          >
            <Undo2 size={18} />
          </button>
          <button 
            onClick={() => redo()}
            disabled={!canRedo}
            className={`p-1.5 rounded-md transition-colors ${
              canRedo ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-700 cursor-not-allowed'
            }`}
            title="Напред (Ctrl+Y)"
          >
            <Redo2 size={18} />
          </button>
          <div className="h-4 w-px bg-slate-700 self-center mx-2" />
          <button className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors">
            <Save size={18} />
          </button>
        </div>
      </div>

      {/* Rendering & Export Controls */}
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 border border-emerald-400/20 rounded-md transition-all shadow-sm">
          <span>Фотореалистичен Рендер</span>
        </button>
        <div className="h-4 w-px bg-slate-700" />
        <button className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors">
          <Download size={18} />
        </button>
        <button className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors">
          <Printer size={18} />
        </button>
        <button className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors">
          <Maximize2 size={18} />
        </button>
      </div>
    </header>
  );
}
