import { getSession } from "@/lib/uploadSession";

export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const session = getSession(key);
  if (!session) {
    return Response.json({ error: "Session nenalezena nebo expirovala" }, { status: 404 });
  }
  return Response.json({
    key: session.key,
    fotky: session.fotky.map((f) => ({ webPath: f.webPath, filename: f.filename, size: f.size })),
    mobileConnected: session.mobileConnected,
  });
}
