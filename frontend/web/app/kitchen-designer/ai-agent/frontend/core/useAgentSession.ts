import { useState } from 'react';
import { useCADStore } from '../../../store/cad-store';
import { useToolDispatcher } from './useToolDispatcher';

export function useAgentSession() {
  const { chatMessages, addChatMessage, drawing } = useCADStore();
  const [isLoading, setIsLoading] = useState(false);
  const dispatchToolCall = useToolDispatcher();

  const sendMessage = async (content: string, isComplexTask = false) => {
    if (!content.trim() || isLoading) return;

    // Добавяме съобщението на потребителя локално
    addChatMessage('user', content);
    setIsLoading(true);

    try {
      // Изискваме отговор от AI
      const response = await fetch('/kitchen-designer/ai-agent/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, { role: 'user', content }],
          drawing: drawing,
          isComplexTask
        })
      });

      if (!response.ok) throw new Error('API Error');
      const data = await response.json();

      if (data.error) throw new Error(data.error);

      // Изпълняваме извиканите функции (ако има такива)
      if (data.function_calls && data.function_calls.length > 0) {
        for (const call of data.function_calls) {
          const success = await dispatchToolCall(call.name, call.args);
          // В бъдеще може да се добави връщане на резултата към AI (Observation Loop)
        }
      }

      // Добавяме отговора на модела
      addChatMessage('assistant', data.content);

      // Ако има Grounding резултати, те могат да се пазят в state за изобразяване
      // (ще се имплементира в UI компонентите)
    } catch (err) {
      console.error(err);
      addChatMessage('assistant', 'Възникна системна грешка. Моля, опитайте отново.');
    } finally {
      setIsLoading(false);
    }
  };

  return { 
    messages: chatMessages, 
    isLoading, 
    sendMessage 
  };
}
