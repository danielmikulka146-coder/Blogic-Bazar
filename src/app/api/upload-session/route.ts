import { createSession } from "@/lib/uploadSession";

export async function POST() {
  const session = createSession();
  return Response.json({ key: session.key });
}
