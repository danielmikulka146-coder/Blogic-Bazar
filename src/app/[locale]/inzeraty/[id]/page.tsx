import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { inzeraty, users } from "@/db/schemas";
import { getCurrentUser } from "@/lib/auth";
import { parsujFotky } from "@/lib/foto";
import { InzeratDetailClient } from "./InzeratDetailClient";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) notFound();

  const inzerat = db.select().from(inzeraty).where(eq(inzeraty.id, numericId)).get();
  if (!inzerat) notFound();

  const fotky = parsujFotky(inzerat.foto);
  const owner = inzerat.userId ? (db.select().from(users).where(eq(users.id, inzerat.userId)).get() ?? null) : null;
  const currentUser = await getCurrentUser();
  const isOwner = currentUser != null && inzerat.userId === currentUser.id;

  return (
    <InzeratDetailClient
      inzerat={inzerat}
      fotky={fotky}
      owner={owner ? { name: owner.name, picture: owner.picture } : null}
      isOwner={isOwner}
    />
  );
}
