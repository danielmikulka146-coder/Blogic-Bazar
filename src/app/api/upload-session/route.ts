import { getCurrentUser } from "@/lib/auth";
import { createSession } from "@/lib/uploadSession";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Nepřihlášený uživatel" }, { status: 401 });
  }

  const session = createSession(user.id);
  return Response.json({ key: session.key });
}
