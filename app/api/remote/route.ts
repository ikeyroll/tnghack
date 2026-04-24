import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory pub/sub keyed by pair code. Persists across requests within a single
// Next.js server instance (fine for a hackathon demo; not multi-node safe).
type Subscriber = (msg: string) => void;

type GlobalRooms = { rooms: Map<string, Set<Subscriber>> };
const g = globalThis as unknown as { __tangoRemote?: GlobalRooms };
if (!g.__tangoRemote) g.__tangoRemote = { rooms: new Map() };
const rooms = g.__tangoRemote.rooms;

function getSubs(room: string) {
  let s = rooms.get(room);
  if (!s) {
    s = new Set<Subscriber>();
    rooms.set(room, s);
  }
  return s;
}

// GET /api/remote?room=ABCD  -> SSE stream
export async function GET(req: NextRequest) {
  const room = (req.nextUrl.searchParams.get("room") || "").toUpperCase().trim();
  if (!room) return new Response("room required", { status: 400 });

  const encoder = new TextEncoder();
  const subs = getSubs(room);

  let keepAlive: ReturnType<typeof setInterval> | null = null;
  let sub: Subscriber | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const push = (line: string) => {
        try { controller.enqueue(encoder.encode(line)); } catch {}
      };
      // Initial comment + hello event so the client knows it's connected
      push(`: connected ${new Date().toISOString()}\n\n`);
      push(`event: hello\ndata: {"room":"${room}","subs":${subs.size + 1}}\n\n`);

      sub = (msg: string) => push(`data: ${msg}\n\n`);
      subs.add(sub);

      keepAlive = setInterval(() => push(`: ping\n\n`), 15000);

      // Cleanup when the underlying request aborts (client disconnect)
      req.signal.addEventListener("abort", () => {
        if (sub) subs.delete(sub);
        if (subs.size === 0) rooms.delete(room);
        if (keepAlive) clearInterval(keepAlive);
        try { controller.close(); } catch {}
      });
    },
    cancel() {
      if (sub) subs.delete(sub);
      if (subs.size === 0) rooms.delete(room);
      if (keepAlive) clearInterval(keepAlive);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// POST /api/remote { room, cmd, payload? } -> broadcast to subscribers
export async function POST(req: NextRequest) {
  let body: any = {};
  try { body = await req.json(); } catch {}
  const room = String(body.room || "").toUpperCase().trim();
  const cmd = String(body.cmd || "").trim();
  if (!room || !cmd) {
    return Response.json({ ok: false, error: "room and cmd required" }, { status: 400 });
  }
  const payload = body.payload ?? null;
  const subs = rooms.get(room);
  const count = subs?.size ?? 0;
  const msg = JSON.stringify({ cmd, payload, ts: Date.now() });
  subs?.forEach((s) => {
    try { s(msg); } catch {}
  });
  return Response.json({ ok: true, delivered: count });
}
