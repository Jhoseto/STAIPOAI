import React from 'react';
import { CategorySection } from './CategorySection';
import { ActionButton } from './ActionButton';
import { Ruler, Accessibility, PaintBucket, Camera, ListTree, Repeat } from 'lucide-react';

interface QuickActionsPanelProps {
  onAction: (msg: string, complex: boolean) => void;
}

export function QuickActionsPanel({ onAction }: QuickActionsPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto no-scrollbar py-2">
      <CategorySection title="🏗️ ПРОЕКТИРАНЕ" defaultOpen={true}>
        <ActionButton icon={Ruler} label="Напълни стена" onClick={() => onAction("Напълни избраната стена оптимално с шкафове.", true)} />
        <ActionButton icon={Repeat} label="3 Варианта" onClick={() => onAction("Предложи 3 различни layout варианта за тази стая.", true)} />
        <ActionButton icon={Accessibility} label="Достъпност" onClick={() => onAction("Провери кухнята за достъпност.", true)} />
      </CategorySection>

      <CategorySection title="🎨 СТИЛОВЕ" defaultOpen={true}>
        <ActionButton icon={PaintBucket} label="Скандинавски" onClick={() => onAction("Приложи скандинавски стил към целия проект.", true)} />
        <ActionButton icon={PaintBucket} label="Japandi" onClick={() => onAction("Приложи Japandi стил към целия проект.", true)} />
        <ActionButton icon={PaintBucket} label="Класически" onClick={() => onAction("Приложи Класически стил към целия проект.", true)} />
        <ActionButton icon={PaintBucket} label="Индустриален" onClick={() => onAction("Приложи Индустриален стил към целия проект.", true)} />
      </CategorySection>

      <CategorySection title="📤 ИЗХОД" defaultOpen={false}>
        <ActionButton icon={ListTree} label="BOM Листа" onClick={() => onAction("Генерирай и изтегли разкройна листа.", false)} />
        <ActionButton icon={Camera} label="Снимка" onClick={() => onAction("Запази снимка на проекта.", false)} />
      </CategorySection>
    </div>
  );
}
