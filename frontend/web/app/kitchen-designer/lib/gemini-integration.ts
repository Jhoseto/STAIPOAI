import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini client
// Note: We use process.env to ensure this only runs on the server side in API routes
export const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  return new GoogleGenerativeAI(apiKey);
};

export const getGenerativeModel = (modelName: string = process.env.GEMINI_MODEL_FAST || 'gemini-2.5-flash') => {
  const genAI = getGeminiClient();
  return genAI.getGenerativeModel({ model: modelName });
};
