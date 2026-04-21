import { SYSTEM_MAIN_PROMPT } from '../prompts/system-main';
import { STANDARDS_BG_PROMPT } from '../prompts/standards-bg';
import { MATERIALS_BG_PROMPT } from '../prompts/materials-bg';
import { HARDWARE_BG_PROMPT } from '../prompts/hardware-bg';
import { STYLES_BG_PROMPT } from '../prompts/styles-bg';
import { SOFTWARE_API_PROMPT } from '../prompts/software-api';

/**
 * Сглобява всички модулни промптове в един масивен първичен системен промпт
 * (System Instruction) за Gemini 2.5 Pro модела.
 */
export function assembleSystemInstruction(): string {
  return [
    SYSTEM_MAIN_PROMPT,
    STANDARDS_BG_PROMPT,
    MATERIALS_BG_PROMPT,
    HARDWARE_BG_PROMPT,
    STYLES_BG_PROMPT,
    SOFTWARE_API_PROMPT
  ].join('\n\n----------------------------------------\n\n');
}
