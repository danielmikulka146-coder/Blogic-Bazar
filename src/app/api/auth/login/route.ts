import { NextResponse } from "next/server";
import { setSessionCookie, upsertGoogleUser, verifyGoogleIdToken } from "@/lib/auth";

export async function POST(request: Request) {
  let body: { credential?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const credential = body?.credential;
  if (!credential || typeof credential !== "string") {
    return NextResponse.json({ error: "missing_credential" }, { status: 400 });
  }

  const info = await verifyGoogleIdToken(credential);
  if (!info) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const user = await upsertGoogleUser(info);
  await setSessionCookie(user.id);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
    },
  });
}
