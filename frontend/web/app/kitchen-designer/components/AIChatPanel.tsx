'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, X, Bot, User, MessageCircle } from 'lucide-react';
import { useCADStore } from '../store/cad-store';

export function AIChatPanel() {
  const { isAssistantOpen, toggleAssistant, chatMessages, addChatMessage, drawing } = useCADStore();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, isAssistantOpen]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMessage = input.trim();
    addChatMessage('user', userMessage);
    setInput('');

    // Mock AI response logic
    setTimeout(() => {
      generateAIResponse(userMessage);
    }, 1000);
  };

  const generateAIResponse = (userMsg: string) => {
    const msg = userMsg.toLowerCase();
    let response = "Интересен въпрос! Мога да ти помогна с дизайна, материалите или техническите детайли на твоята кухня.";

    if (msg.includes('колко') || msg.includes('шкаф')) {
      const cabinetCount = drawing?.entities.filter(e => e.type === 'cabinet').length || 0;
      response = `В момента имаш ${cabinetCount} шкафа в проекта. Трябва ли да добавим още или искаш да променим конфигурацията на текущите?`;
    } else if (msg.includes('цена') || msg.includes('бюджет')) {
      response = "Мога да генерирам подробна спецификация (BOM), която да изпратиш за оферта. Искаш ли да проверя наличността на избраните материали?";
    } else if (msg.includes('материал') || msg.includes('цвят')) {
      response = "За модерен вид препоръчвам матово покритие (Antic Grey) в комбинация с дървесен декор. Искаш ли да променя материалите на избраните шкафове?";
    }

    addChatMessage('assistant', response);
  };

  if (!isAssistantOpen) return null;

  return (
    <motion.div 
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute top-20 right-4 bottom-4 w-80 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-[100] flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-blue-600/20 to-purple-600/20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500 rounded-lg shadow-lg shadow-blue-500/30">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm tracking-tight">AI Асистент</h3>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">На линия</span>
            </div>
          </div>
        </div>
        <button 
          onClick={toggleAssistant}
          className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Chat Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10"
      >
        <AnimatePresence initial={false}>
          {chatMessages.map((msg, idx) => (
            <motion.div 
              key={idx}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`mt-1 shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                  msg.role === 'assistant' ? 'bg-blue-600 text-[10px]' : 'bg-slate-700 text-[10px]'
                }`}>
                  {msg.role === 'assistant' ? <Bot size={12} /> : <User size={12} />}
                </div>
                <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-white/10 text-slate-200 border border-white/5 rounded-tl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-black/20 border-t border-white/5">
        <div className="relative">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Пиши..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-4 pr-10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-blue-500 hover:text-blue-400 disabled:text-slate-600 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-[9px] text-slate-500 mt-2 text-center">
          AI може да прави грешки. Проверявайте важни размери.
        </p>
      </div>
    </motion.div>
  );
}
