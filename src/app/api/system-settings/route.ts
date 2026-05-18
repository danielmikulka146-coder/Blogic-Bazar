import { inArray } from "drizzle-orm";

import { db } from "@/db";
import { systemSetting } from "@/db/schemas";

export interface SystemSettingsResponse {
  isMaintenance: boolean;
}

export function GET() {
  const settings = db
    .select({
      name: systemSetting.name,
      value: systemSetting.value,
    })
    .from(systemSetting)
    .where(inArray(systemSetting.name, ["isMaintenance"]))
    .all();

  const values = Object.fromEntries(settings.map((s) => [s.name, s.value]));

  const response: SystemSettingsResponse = {
    isMaintenance: values.isMaintenance === "true",
  };

  return Response.json(response);
}
