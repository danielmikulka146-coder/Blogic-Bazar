import { removeFoto } from "@/lib/uploadSession";

export async function DELETE(_req: Request, { params }: { params: Promise<{ key: string; filename: string }> }) {
  const { key, filename } = await params;
  const ok = await removeFoto(key, filename);
  if (!ok) {
    return Response.json({ error: "Nenalezeno" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
