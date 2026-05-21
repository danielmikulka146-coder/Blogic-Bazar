import { addFoto, getSession } from "@/lib/uploadSession";

export async function POST(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;

  if (!getSession(key)) {
    return Response.json({ error: "Session nenalezena nebo expirovala" }, { status: 404 });
  }

  const formData = await req.formData();
  const files = formData.getAll("foto").filter((v): v is File => v instanceof File && v.size > 0);

  if (files.length === 0) {
    return Response.json({ error: "Žádné soubory" }, { status: 400 });
  }

  const uploaded = [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    const foto = await addFoto(key, file);
    if (foto) uploaded.push(foto);
  }

  return Response.json({ uploaded });
}
