const FALLBACK = "https://placehold.co/800x600?text=Bez+fotky";

export function parsujFotky(foto: string | null | undefined): string[] {
  if (!foto?.trim()) return [];

  if (foto.trim().startsWith("[")) {
    try {
      const arr = JSON.parse(foto);
      if (Array.isArray(arr)) return arr.filter((x): x is string => typeof x === "string");
    } catch {
      return [];
    }
  }

  return [foto.startsWith("http") || foto.startsWith("/") ? foto : `/inzeraty/${foto}`];
}

export function hlavniFotka(foto: string | null | undefined): string {
  return parsujFotky(foto)[0] ?? FALLBACK;
}
