import React from 'react';
import { Bot, User } from 'lucide-react';
import { motion } from 'framer-motion';

export function MessageBubble({ message }: { message: { role: string, content: string } }) {
  const isAgent = message.role === 'assistant';
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 px-4 py-3 ${isAgent ? 'bg-slate-50/10' : 'flex-row-reverse'}`}
    >
      <div className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center shadow-sm ${isAgent ? 'bg-blue-100 text-blue-600' : 'bg-slate-800 text-white'}`}>
        {isAgent ? <Bot size={14} /> : <User size={14} />}
      </div>
      
      <div className={`flex flex-col max-w-[85%] ${!isAgent && 'items-end'}`}>
        <span className="text-[10px] font-medium text-slate-400 mb-1">
          {isAgent ? 'STAIPO AI' : 'Вие'}
        </span>
        <div className={`text-[13px] leading-relaxed whitespace-pre-line ${isAgent ? 'text-slate-700' : 'text-slate-700 bg-slate-100 px-3 py-2 rounded-2xl rounded-tr-sm border border-slate-200/50 shadow-sm'}`}>
          {message.content}
        </div>
      </div>
    </motion.div>
  );
}
