import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { inzeraty } from "@/db/schemas";
import { getCurrentUser } from "@/lib/auth";
import { UpravitInzeratForm } from "./UpravitInzeratForm";

type Props = { params: Promise<{ id: string; locale: string }> };

export default async function Page({ params }: Props) {
  const { id, locale } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}`);

  const inzerat = db
    .select()
    .from(inzeraty)
    .where(and(eq(inzeraty.id, numericId), eq(inzeraty.userId, user.id)))
    .get();
  if (!inzerat) notFound();

  return <UpravitInzeratForm inzerat={inzerat} />;
}
