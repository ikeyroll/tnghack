import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

export const geminiReady = !!apiKey;

let client: GoogleGenAI | null = null;
function getClient() {
  if (!apiKey) return null;
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

export async function genJson<T = any>(prompt: string, schemaHint?: string): Promise<T | null> {
  const c = getClient();
  if (!c) return null;
  const sys = `You are Tango, an AI assistant inside a Malaysian e-wallet demo app.
Return ONLY a valid JSON object. No markdown fences, no commentary.
${schemaHint ? `Schema hint:\n${schemaHint}` : ""}`;
  try {
    const res = await c.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { systemInstruction: sys, responseMimeType: "application/json" } as any,
    });
    const text =
      (res as any).text ??
      (res as any).response?.text ??
      (res as any).candidates?.[0]?.content?.parts?.[0]?.text ??
      "";
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch (e) {
    console.warn("[gemini] call failed, falling back:", (e as Error).message);
    return null;
  }
}
