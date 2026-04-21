import { useCADStore } from '../../../store/cad-store';
import { handleAddEntity, handleRemoveEntity, handleUpdateEntity, handleBulkUpdate } from '../handlers/cabinet-handler';
import { handleGenerateCountertops } from '../handlers/countertop-handler';
import { handleAuditErgonomics, handleAccessibility, handleBudgetEstimate } from '../handlers/analytics-handler';
import { handleToggleLayer, handleSetViewMode, handleExportBOM, handlePresentationExport } from '../handlers/view-handler';

export function useToolDispatcher() {
  const store = useCADStore();

  const dispatchToolCall = async (functionName: string, args: any) => {
    console.log(`[AI Agent] Tool Call Triggered: ${functionName}`, args);

    switch (functionName) {
      // 1. Окабеляване за чертане и обекти
      case 'add_entity':
        return handleAddEntity(store, args);
      case 'remove_entity':
        return handleRemoveEntity(store, args);
      case 'update_entity':
        return handleUpdateEntity(store, args);
      case 'bulk_update_entities':
        return handleBulkUpdate(store, args);
      
      // 2. Плотове
      case 'generate_countertops':
        return handleGenerateCountertops(store, args);
      
      // 3. Анализ и Логика
      case 'run_ergonomics_audit':
        return handleAuditErgonomics(store, args);
      case 'check_accessibility':
        return handleAccessibility(store, args);
      case 'get_budget_estimate':
        return handleBudgetEstimate(store, args);

      // 4. Изгледи, слоеве и експорт
      case 'set_view_mode':
        return handleSetViewMode(store, args);
      case 'toggle_layer_visibility':
        return handleToggleLayer(store, args);
      case 'export_bom_list':
        return handleExportBOM(store, args);
      case 'prepare_presentation_export':
        return handlePresentationExport(store, args);

      default:
        console.warn(`[AI Agent] Unknown function call: ${functionName}`);
        return false;
    }
  };

  return dispatchToolCall;
}
