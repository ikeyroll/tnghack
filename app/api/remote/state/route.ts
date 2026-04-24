import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RoomState = {
  balance: number | null;
  notifications: { id: string; ts: number; title: string; body?: string }[];
  updatedAt: number;
};

type GlobalState = { state: Map<string, RoomState> };
const g = globalThis as unknown as { __tangoRemoteState?: GlobalState };
if (!g.__tangoRemoteState) g.__tangoRemoteState = { state: new Map() };
const store = g.__tangoRemoteState.state;

function get(room: string): RoomState {
  let s = store.get(room);
  if (!s) {
    s = { balance: null, notifications: [], updatedAt: 0 };
    store.set(room, s);
  }
  return s;
}

export async function GET(req: NextRequest) {
  const room = (req.nextUrl.searchParams.get("room") || "").toUpperCase().trim();
  if (!room) return Response.json({ error: "room required" }, { status: 400 });
  const s = get(room);
  return Response.json(s);
}

export async function POST(req: NextRequest) {
  let body: any = {};
  try { body = await req.json(); } catch {}
  const room = String(body.room || "").toUpperCase().trim();
  if (!room) return Response.json({ ok: false, error: "room required" }, { status: 400 });

  const s = get(room);
  if (typeof body.balance === "number") s.balance = body.balance;
  if (Array.isArray(body.notifications)) {
    s.notifications = body.notifications
      .filter((n: any) => n && typeof n.title === "string")
      .slice(0, 20)
      .map((n: any, i: number) => ({
        id: String(n.id ?? `n${i}`),
        ts: Number(n.ts ?? Date.now()),
        title: String(n.title),
        body: n.body ? String(n.body) : undefined,
      }));
  }
  s.updatedAt = Date.now();
  return Response.json({ ok: true });
}
