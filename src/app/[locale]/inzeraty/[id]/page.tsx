import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { inzeraty } from "@/db/schemas";
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

  return <InzeratDetailClient inzerat={inzerat} fotky={fotky} />;
}
