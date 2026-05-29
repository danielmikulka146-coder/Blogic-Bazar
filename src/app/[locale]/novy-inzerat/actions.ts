// "use server" = tyto funkce běží POUZE na serveru, nikdy v prohlížeči.
// Klient je může volat jako normální async funkce — Next.js zabalí volání do fetch requestu za scénou.
// Díky tomu DB přístup a práce se soubory zůstanou bezpečně na serveru.
"use server";

import fs from "node:fs/promises"; // Node.js modul pro práci se soubory (mkdir, writeFile, unlink)
import path from "node:path"; // Node.js modul pro skládání cest (cross-platform: Windows i Linux)
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache"; // říká Next.js cache: "tato stránka se změnila, přegeneruj ji"
import { db } from "@/db";
import { inzeraty, users } from "@/db/schemas";
import { requireUser } from "@/lib/auth"; // requireUser = getCurrentUser + hodí chybu pokud není přihlášen
import { parsujFotky } from "@/lib/foto";
import { processImage, withExt } from "@/lib/serverImageProcess"; // zpracování obrázků (WebP / GIF) na serveru
import { dropSessionDir, getSessionFile, markSessionSubmitted } from "@/lib/uploadSession";

// Web cesta k fotce inzerátu. Fyzicky leží v `public/inzeraty/{id}/`, ale servíruje
// se přes route handler `/api/foto/...` (viz app/api/foto/[...path]) — proto cesty
// v DB ukládáme s tímto prefixem.
function fotoWebPath(id: number, filename: string): string {
  return `/api/foto/${id}/${filename}`;
}

// Převede web cestu `/api/foto/{id}/{file}` zpět na absolutní cestu na disku.
// Vrací null, pokud cesta nemá očekávaný tvar nebo obsahuje pokus o traversal.
function fotoDiskPath(webPath: string): string | null {
  const prefix = "/api/foto/";
  if (!webPath.startsWith(prefix)) return null;
  const segments = webPath.slice(prefix.length).split("/").filter(Boolean);
  if (segments.length === 0 || segments.some((s) => s.includes(".."))) return null;
  return path.join(process.cwd(), "public", "inzeraty", ...segments);
}

function remoteFilenameFromPath(webPath: string, uploadSessionKey: string): string | null {
  const prefix = `/api/upload-session/${uploadSessionKey}/foto/`;
  if (!webPath.startsWith(prefix)) return null;

  const filename = decodeURIComponent(webPath.slice(prefix.length));
  if (!filename || filename.includes("/") || filename.includes("\\")) return null;
  return filename;
}

// Discriminated union — každý typ má jiná pole. TypeScript pak vynutí správné přístupy uvnitř if/switch bloků.
// "existing" = fotka už je na disku, jen zachovat její cestu.
// "file"     = fotka přišla přímo v FormData (klasický <input type="file">).
// "session"  = fotka byla nahraná přes upload session API (mobilní drag & drop flow).
type FotoOrderEntry = { type: "existing"; path: string } | { type: "file" } | { type: "session"; webPath: string };

/** Rozparsuje fotoEntry stringy z FormData do typovaného seznamu. */
function parseFotoEntries(formData: FormData): FotoOrderEntry[] {
  const raw = formData.getAll("fotoEntry") as string[];
  const out: FotoOrderEntry[] = [];
  for (const e of raw) {
    if (e === "file") {
      out.push({ type: "file" });
    } else if (e.startsWith("existing:")) {
      out.push({ type: "existing", path: e.slice("existing:".length) });
    } else if (e.startsWith("session:")) {
      out.push({ type: "session", webPath: e.slice("session:".length) });
    }
  }
  return out;
}

/**
 * Zpracuje fotky podle pořadí (`entries`) a vrátí seznam web-cest k uloženým
 * souborům v `/public/inzeraty/{id}`. Existující cesty (z `keepExistingFotky`)
 * jsou zachovány beze změny; nové soubory a session uploady se zapíší na disk.
 */
async function processFotoEntries(opts: {
  id: number;
  userId: number;
  entries: FotoOrderEntry[];
  files: File[];
  uploadSessionKey: string | null;
  keepExistingFotky: ReadonlySet<string>;
}): Promise<string[]> {
  const { id, userId, entries, files, uploadSessionKey, keepExistingFotky } = opts;
  const validFiles = files.filter((f) => f.size > 0);

  // Nic není potřeba zapisovat? Vrátíme prázdné pole (caller pak ví, že není
  // co aktualizovat / volat mkdir).
  if (entries.length === 0) return [];

  const dir = path.join(process.cwd(), "public", "inzeraty", String(id));
  await fs.mkdir(dir, { recursive: true });

  const out: string[] = [];
  let fileIdx = 0;

  for (const entry of entries) {
    if (entry.type === "existing") {
      if (keepExistingFotky.has(entry.path)) {
        out.push(entry.path);
      }
      // jinak ignorujeme — neexistuje nebo nepatří k tomuto inzerátu
      continue;
    }

    if (entry.type === "file") {
      const file = validFiles[fileIdx++];
      if (!file) continue;
      const buffer = Buffer.from(await file.arrayBuffer());
      const { buffer: processed, ext } = await processImage(buffer);
      const filename = withExt(`${Date.now()}-${file.name}`, ext);
      await fs.writeFile(path.join(dir, filename), processed);
      out.push(fotoWebPath(id, filename));
      continue;
    }

    if (entry.type === "session") {
      if (!uploadSessionKey) continue;
      const remoteFilename = remoteFilenameFromPath(entry.webPath, uploadSessionKey);
      if (!remoteFilename) continue;
      const sessionFile = getSessionFile(uploadSessionKey, remoteFilename, userId);
      if (!sessionFile) continue;

      try {
        const { buffer: processed, ext } = await processImage(sessionFile.filePath);
        const filename = withExt(remoteFilename, ext);
        await fs.writeFile(path.join(dir, filename), processed);
        await fs.unlink(sessionFile.filePath).catch(() => {});
        out.push(fotoWebPath(id, filename));
      } catch {
        // konverze selhala — fotku přeskočíme
      }
    }
  }

  return out;
}

/** Zápis kontaktu/telefonu z formuláře jako side-effect po úspěšném submitu. */
async function persistTelefonToProfile(opts: { userId: number; telefonNumber: string; telefonPrefix: string }) {
  if (!opts.telefonNumber) return;
  await db
    .update(users)
    .set({ telefon: opts.telefonNumber, telefonPrefix: opts.telefonPrefix || null })
    .where(eq(users.id, opts.userId));
}

type ParsedFields = {
  nazev: string;
  popis: string;
  kategorie: string;
  kontakt: string;
  telefon: string | null;
  telefonNumber: string;
  telefonPrefix: string;
  stavZbozi: string | null;
  stav: string;
  cena: number;
  free: boolean;
  uploadSessionKey: string | null;
};

function parseFields(formData: FormData): ParsedFields {
  const telefonNumber = ((formData.get("telefon") as string) || "").trim();
  const telefonPrefix = ((formData.get("telefonPrefix") as string) || "").trim();
  return {
    nazev: formData.get("nazev") as string,
    popis: formData.get("popis") as string,
    kategorie: formData.get("kategorie") as string,
    kontakt: formData.get("kontakt") as string,
    telefonNumber,
    telefonPrefix,
    // Plné telefonní číslo (prefix + číslo) ukládáme do inzerátu pro zobrazení.
    telefon: telefonNumber ? `${telefonPrefix ? `${telefonPrefix} ` : ""}${telefonNumber}` : null,
    stavZbozi: (formData.get("stavZbozi") as string) || null,
    stav: formData.get("stav") as string,
    cena: Number(formData.get("cena")),
    free: formData.get("free") === "true",
    uploadSessionKey: (formData.get("uploadSessionKey") as string) || null,
  };
}

export async function vytvorInzerat(formData: FormData) {
  const user = await requireUser(); // ověří přihlášení — bez toho by kdokoli mohl vytvořit inzerát
  const fields = parseFields(formData);
  const entries = parseFotoEntries(formData);
  const files = formData.getAll("foto") as File[];

  // Nejdřív vložíme inzerát s prázdným polem fotek — potřebujeme získat ID pro cestu na disku.
  const [{ id }] = await db
    .insert(inzeraty)
    .values({
      nazev: fields.nazev,
      popis: fields.popis,
      kategorie: fields.kategorie,
      kontakt: fields.kontakt,
      telefon: fields.telefon,
      stav: fields.stav,
      stavZbozi: fields.stavZbozi,
      cena: fields.cena,
      free: fields.free,
      foto: "[]", // placeholder — aktualizuje se níže po zpracování fotek
      userId: user.id,
      // $defaultFn ve schématu se v této verzi drizzle nespouští kvůli souběhu
      // s .default(0); SQL default 0 vyhrává a inzeráty pak mají timestamp 1.1.1970.
      createdAt: Math.floor(Date.now() / 1000), // Unix timestamp v sekundách
    })
    .returning({ id: inzeraty.id }); // .returning() = vrátí vybraná pole vloženého záznamu

  // Zpracujeme fotky (konverze do WebP, zapsání na disk) a dostaneme pole cest.
  const fotoPaths = await processFotoEntries({
    id,
    userId: user.id,
    entries,
    files,
    uploadSessionKey: fields.uploadSessionKey,
    keepExistingFotky: new Set(), // nový inzerát = žádné "existující" fotky k zachování
  });

  // Druhý UPDATE s cestami fotek — dvoukrokový přístup protože ID potřebujeme pro název složky.
  if (fotoPaths.length > 0) {
    await db
      .update(inzeraty)
      .set({ foto: JSON.stringify(fotoPaths) }) // fotky jako JSON array string v DB
      .where(eq(inzeraty.id, id));
  }

  // Dočasná session složka s nahranými fotkami už není potřeba — uklidíme disk.
  // Zároveň session označíme jako odeslanou, aby mobil poznal, že inzerát odešel,
  // zobrazil upozornění a zakázal další nahrávání.
  if (fields.uploadSessionKey) {
    markSessionSubmitted(fields.uploadSessionKey, user.id);
    await dropSessionDir(fields.uploadSessionKey);
  }

  // Jako bonus uložíme telefon i do profilu uživatele — příště se předvyplní.
  await persistTelefonToProfile({
    userId: user.id,
    telefonNumber: fields.telefonNumber,
    telefonPrefix: fields.telefonPrefix,
  });

  // Bez revalidace by router.push("/inzeraty") zobrazil cachovaný seznam BEZ nového
  // inzerátu — uživatel by ho viděl až po ručním refreshi. revalidatePath zneplatní
  // cache seznamu i detailu, aby se nový inzerát (a jeho fotky) objevil okamžitě.
  revalidatePath("/", "layout");

  return { id };
}

/**
 * Editace existujícího inzerátu včetně fotek. Klient pošle plné `fotoEntry`
 * pole popisující výsledné pořadí (existing/file/session). Server zachová jen
 * fotky uvedené v `existing:` a fyzicky smaže ty, které vypadly.
 */
export async function upravitInzerat(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) throw new Error("Neplatný inzerát");

  const existing = db
    .select()
    .from(inzeraty)
    .where(and(eq(inzeraty.id, id), eq(inzeraty.userId, user.id)))
    .get();
  if (!existing) throw new Error("Inzerát nenalezen nebo k němu nemáš oprávnění");

  const fields = parseFields(formData);
  const entries = parseFotoEntries(formData);
  const files = formData.getAll("foto") as File[];

  const existingFotky = parsujFotky(existing.foto);
  const keepSet = new Set(existingFotky);

  const newFotoPaths = await processFotoEntries({
    id,
    userId: user.id,
    entries,
    files,
    uploadSessionKey: fields.uploadSessionKey,
    keepExistingFotky: keepSet,
  });

  // Smaž z disku fotky, které uživatel při editaci odstranil — šetříme místo na disku.
  // .catch(() => {}) = pokud soubor mezitím zmizel, tiše ignorujeme (nechceme shodit celou akci).
  const keptNewSet = new Set(newFotoPaths);
  for (const oldPath of existingFotky) {
    if (keptNewSet.has(oldPath)) continue; // fotka je stále v seznamu → zachovat
    const abs = fotoDiskPath(oldPath); // /api/foto/{id}/{file} → public/inzeraty/{id}/{file}
    if (!abs) continue; // neznámý tvar cesty — radši nemazat
    await fs.unlink(abs).catch(() => {});
  }

  await db
    .update(inzeraty)
    .set({
      nazev: fields.nazev,
      popis: fields.popis,
      kategorie: fields.kategorie,
      kontakt: fields.kontakt,
      telefon: fields.telefon,
      stav: fields.stav,
      stavZbozi: fields.stavZbozi,
      cena: fields.cena,
      free: fields.free,
      foto: JSON.stringify(newFotoPaths),
    })
    .where(eq(inzeraty.id, id));

  if (fields.uploadSessionKey) {
    markSessionSubmitted(fields.uploadSessionKey, user.id);
    await dropSessionDir(fields.uploadSessionKey);
  }

  await persistTelefonToProfile({
    userId: user.id,
    telefonNumber: fields.telefonNumber,
    telefonPrefix: fields.telefonPrefix,
  });

  revalidatePath("/", "layout");
  return { id };
}
