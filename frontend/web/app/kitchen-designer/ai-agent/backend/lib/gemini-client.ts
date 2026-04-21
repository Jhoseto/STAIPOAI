import { GoogleGenerativeAI } from "@google/generative-ai";
import { assembleSystemInstruction } from "./prompt-assembler";
import { TOOL_DECLARATIONS } from "../tools/schemas";

const FAST_MODEL = process.env.GEMINI_MODEL_FAST || "gemini-2.5-flash";
const FLAGSHIP_MODEL = process.env.GEMINI_MODEL_FLAGSHIP || "gemini-2.5-pro";


/**
 * Връща конфигуриран инстанс на Gemini със заредени System Instructions и Tools.
 * @param usePro Дали да използва големия модел за сложни Reasoning/Layout задачи
 */
export function getGeminiModel(usePro = false) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY. Please add it to your .env file.");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
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
