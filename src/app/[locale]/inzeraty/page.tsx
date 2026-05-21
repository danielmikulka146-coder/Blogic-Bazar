import { db } from "@/db";
import { inzeraty } from "@/db/schemas";
import { InzeratyListClient } from "./InzeratyListClient";

export default async function Page() {
  const data = await db.select().from(inzeraty).all();
  return <InzeratyListClient data={data} />;
}
