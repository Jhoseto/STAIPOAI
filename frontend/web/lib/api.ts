const RAW_AI_BASE_URL =
  typeof window !== "undefined"
    ? "/api/ai" // client: runtime API-route proxy → reads AI_DATA_URL at request time
    : (process.env.AI_DATA_URL || "http://localhost:8000"); // server: direct call


export const AI_BASE_URL = RAW_AI_BASE_URL.trim().replace(/\s+/g, "");

export function aiUrl(path: string): string {
  return `${AI_BASE_URL.replace(/\/$/, "")}${path}`;
}

export async function aiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = aiUrl(path);
  console.log(`[aiFetch] ${init?.method || "GET"} ${url}`);
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `AI API error: ${res.status}`);
  }
  return (await res.json()) as T;
}
