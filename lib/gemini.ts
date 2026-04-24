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

function extractText(res: any): string {
  return (
    res?.text ??
    res?.response?.text ??
    res?.candidates?.[0]?.content?.parts?.[0]?.text ??
    ""
  );
}

function sysPrompt(schemaHint?: string) {
  return `You are Tango, an AI assistant inside a Malaysian e-wallet demo app.
Return ONLY a valid JSON object. No markdown fences, no commentary.
${schemaHint ? `Schema hint:\n${schemaHint}` : ""}`;
}

export async function genJson<T = any>(prompt: string, schemaHint?: string): Promise<T | null> {
  const c = getClient();
  if (!c) {
    console.warn("[gemini] no API key, using fallback");
    return null;
  }
  try {
    const res = await c.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { systemInstruction: sysPrompt(schemaHint), responseMimeType: "application/json" } as any,
    });
    const text = extractText(res);
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch (e) {
    console.warn("[gemini] text call failed, falling back:", (e as Error).message);
    return null;
  }
}

export async function genJsonFromImage<T = any>(
  prompt: string,
  image: { data: string; mimeType: string },
  schemaHint?: string,
): Promise<T | null> {
  const c = getClient();
  if (!c) {
    console.warn("[gemini] no API key, vision call skipped");
    return null;
  }
  try {
    const res = await c.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType: image.mimeType, data: image.data } },
          ],
        },
      ],
      config: { systemInstruction: sysPrompt(schemaHint), responseMimeType: "application/json" } as any,
    });
    const text = extractText(res);
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch (e) {
    console.warn("[gemini] vision call failed:", (e as Error).message);
    return null;
  }
}
