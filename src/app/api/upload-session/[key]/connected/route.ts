import { setMobileConnected } from "@/lib/uploadSession";

export async function POST(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const ok = setMobileConnected(key);
  if (!ok) {
    return Response.json({ error: "Session nenalezena" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
