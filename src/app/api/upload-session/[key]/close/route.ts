import { getCurrentUser } from "@/lib/auth";
import { closeSession } from "@/lib/uploadSession";

export async function POST(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Nepřihlášený uživatel" }, { status: 401 });
  }

  const { key } = await params;
  const ok = closeSession(key, user.id);
  if (!ok) {
    return Response.json({ error: "Session nenalezena" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
