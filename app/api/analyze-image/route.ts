import { NextRequest, NextResponse } from "next/server";
import { genJsonFromImage } from "@/lib/gemini";
import { RECIPIENTS } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 30;

// Accept both JSON {data, mimeType} and multipart form-data (field "file")
async function readImage(req: NextRequest): Promise<{ data: string; mimeType: string } | null> {
  const ct = req.headers.get("content-type") || "";
  try {
    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const f = form.get("file");
      if (!(f instanceof Blob)) return null;
      const buf = Buffer.from(await f.arrayBuffer());
      return { data: buf.toString("base64"), mimeType: f.type || "image/png" };
    }
    if (ct.includes("application/json")) {
      const body = await req.json();
      if (typeof body?.data === "string" && typeof body?.mimeType === "string") {
        // strip optional data URL prefix
        const data = body.data.replace(/^data:[^;]+;base64,/, "");
        return { data, mimeType: body.mimeType };
      }
    }
  } catch {}
  return null;
}

type Resp = {
  ocr: string;
  sender: string;
  amount: number;
  recipientQuery: string;
  risk: "low" | "medium" | "high";
  reasons?: string[];
  message: string;
};

export async function POST(req: NextRequest) {
  const img = await readImage(req);
  if (!img) {
    return NextResponse.json(
      { error: "No image provided. Send JSON {data, mimeType} or multipart form-data with 'file'." },
      { status: 400 },
    );
  }

  const known = RECIPIENTS.map((r) => `- ${r.name}`).join("\n");
  const schema = `{
  "ocr": string (the full visible text in the image),
  "sender": string (sender name or phone, or "Unknown" if not visible),
  "amount": number (RM amount being requested, 0 if none),
  "recipientQuery": string (who/what the sender wants money sent to; "Unknown" if none),
  "risk": "low" | "medium" | "high",
  "reasons": string[] (concise bullet points, only if risk != "low"),
  "message": string (one short natural sentence summarising for the user)
}`;

  const prompt = `You are Tango, a scam-detection assistant for a Malaysian e-wallet.
The attached image is typically a WhatsApp screenshot or a payment request.

Do the following:
1. OCR the full text in the image into "ocr".
2. Identify the sender (display name / phone) into "sender".
3. If the message asks the user to send money, extract the RM "amount" and the "recipientQuery" (who/account to pay).
4. Classify "risk":
   - "high" -> urgency words ("URGENT", "NOW", "emergency"), secrecy ("don't tell"), unknown sender, unusual bank account, unusually large amount, impersonation.
   - "medium" -> some red flags but not definitive.
   - "low" -> normal, casual request from a known-sounding contact.
5. When risk is medium/high, put 2-5 concrete "reasons" (bullet-style short phrases).
6. Write a concise, natural "message" (<=160 chars) telling the user your conclusion.

Known saved recipients (use these when matching recipientQuery):
${known}

Return ONLY the JSON described by the schema. Do not include markdown fences.`;

  const ai = await genJsonFromImage<Resp>(prompt, img, schema);

  if (!ai || typeof ai.ocr !== "string") {
    return NextResponse.json(
      {
        error: "AI could not analyse the image. Check GEMINI_API_KEY on the server.",
        source: "mock",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ...ai, source: "gemini" });
}
