import React, { useRef, useEffect } from 'react';
import { useCADStore } from '../../store/cad-store';
import { AgentHeader } from './ui/AgentHeader';
import { QuickActionsBar } from './ui/QuickActionsBar';
import { QuickActionsPanel } from './ui/QuickActionsPanel';
import { MessageBubble } from './ui/MessageBubble';
import { ThinkingIndicator } from './ui/ThinkingIndicator';
import { AgentInput } from './ui/AgentInput';
import { useAgentSession } from './core/useAgentSession';

export function AgentPanel() {
  const { isAssistantOpen } = useCADStore();
  const { messages, isLoading, sendMessage } = useAgentSession();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  if (!isAssistantOpen) return null;

  const handleAction = (msg: string, complex: boolean) => {
    sendMessage(msg, complex);
  };

  return (
    <aside className="w-[380px] h-full bg-white/95 backdrop-blur-xl border-l border-slate-200/60 flex flex-col shrink-0 shadow-sm z-20 overflow-hidden font-sans">
      <AgentHeader />
      <QuickActionsBar onAction={handleAction} />
      
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar flex flex-col" 
        ref={scrollRef}
      >
        <div className="shrink-0 bg-white shadow-sm border-b border-slate-100 z-10 pb-2">
           <QuickActionsPanel onAction={handleAction} />
        </div>
        
        <div className="flex-1 flex flex-col gap-0.5 pb-4 pt-4 bg-slate-50/30">
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}
          {isLoading && <ThinkingIndicator />}
        </div>
      </div>
      
      <AgentInput onSend={(msg) => handleAction(msg, false)} isLoading={isLoading} />
    </aside>
  );
}
