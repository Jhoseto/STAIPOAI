import React, { useState } from 'react';
import { Paperclip, Send } from 'lucide-react';

interface AgentInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

export function AgentInput({ onSend, isLoading }: AgentInputProps) {
  const [val, setVal] = useState('');
  
  const handleSend = () => {
    if(!val.trim() || isLoading) return;
    onSend(val);
    setVal('');
  }

  return (
    <div className="p-3 border-t border-slate-200/60 bg-white/80 shrink-0">
      <div className="relative flex items-center bg-white rounded-xl border border-slate-200 shadow-sm focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition-all overflow-hidden group">
        <button className="p-2.5 text-slate-400 hover:text-slate-600 transition-colors">
          <Paperclip size={16} />
        </button>
        <input 
          type="text"
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Напишете или изберете действие..."
          className="flex-1 bg-transparent border-none focus:outline-none text-xs py-3 text-slate-700 placeholder:text-slate-400"
          disabled={isLoading}
        />
        <button 
          onClick={handleSend}
          disabled={isLoading || !val.trim()}
          className="p-2.5 text-slate-400 focus:outline-none hover:text-blue-500 disabled:hover:text-slate-400 disabled:opacity-50 transition-colors"
        >
          <Send size={16} className={val.trim() ? "text-blue-500" : ""} />
        </button>
      </div>
    </div>
  );
}
