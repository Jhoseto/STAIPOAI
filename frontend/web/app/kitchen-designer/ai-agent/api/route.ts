import { NextRequest, NextResponse } from "next/server";
import { getGeminiModel } from "../backend/lib/gemini-client";
import { buildKitchenContext } from "../backend/tools/context-builder";

export async function POST(req: NextRequest) {
  try {
    const { messages, drawing, isComplexTask } = await req.json();

    // Заявките, изискващи дълбоко мислене (budget, audit, auto-fill, styling), 
    // могат да подават isComplexTask=true за да ползват Pro модел.
    const model = getGeminiModel(isComplexTask);
    
    // Трансформираме CAD JSON обекта в четим за модела markdown
    const contextStr = buildKitchenContext(drawing?.entities || []);
    
    const chatHistory = messages.slice(0, -1).map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({
      history: chatHistory,
    });

    // Инжектираме текущия Снапшот заедно със заявката на потребителя
    const userMessage = messages[messages.length - 1].content;
    const promptWithContext = `ТЕКУЩ СНАПШОТ НА ПРОЕКТА:\n${contextStr}\n\nНОВА ЗАЯВКА НА ПОТРЕБИТЕЛЯ:\n${userMessage}`;

    const result = await chat.sendMessage(promptWithContext);
    const response = await result.response;
    
    // Извличаме текст и инструменти
    const calls = response.candidates?.[0]?.content?.parts?.filter((p: any) => p.functionCall);
    const text = response.candidates?.[0]?.content?.parts?.filter((p: any) => p.text).map((p: any) => p.text).join("\n");
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

    return NextResponse.json({
      role: "assistant",
      content: text || "Изпълнявам вашата команда...",
      function_calls: calls?.map((c: any) => c.functionCall),
      grounding: groundingMetadata
    });

  } catch (error: any) {
    console.error("STAIPO AI Module Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
