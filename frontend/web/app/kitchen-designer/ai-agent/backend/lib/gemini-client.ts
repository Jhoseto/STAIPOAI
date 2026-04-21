import { GoogleGenerativeAI } from "@google/generative-ai";
import { assembleSystemInstruction } from "./prompt-assembler";
import { TOOL_DECLARATIONS } from "../tools/schemas";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY environment variable. Agent won't function.");
}

const API_KEY = process.env.GEMINI_API_KEY;
// Defaults to models specified in .env, fallback to standard naming
const FAST_MODEL = process.env.GEMINI_MODEL_FAST || "gemini-2.5-flash";
const FLAGSHIP_MODEL = process.env.GEMINI_MODEL_FLAGSHIP || "gemini-2.5-pro";

const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * Връща конфигуриран инстанс на Gemini със заредени System Instructions и Tools.
 * @param usePro Дали да използва големия модел за сложни Reasoning/Layout задачи
 */
export function getGeminiModel(usePro = false) {
  const modelName = usePro ? FLAGSHIP_MODEL : FAST_MODEL;
  
  return genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: assembleSystemInstruction(),
    tools: [
      {
        functionDeclarations: TOOL_DECLARATIONS
      },
      {
        // Включваме Google Search Grounding за търсене на цени/материали
        googleSearchRetrieval: {
          dynamicRetrievalConfig: {
            mode: "MODE_DYNAMIC",
            dynamicThreshold: 0.3
          }
        } as any
      }
    ]
  });
}
