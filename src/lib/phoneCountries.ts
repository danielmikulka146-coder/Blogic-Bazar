export type PhoneCountry = {
  /** ISO 3166-1 alpha-2, lowercase. */
  code: string;
  /** Lokalizovaný název (česky). */
  name: string;
  /** Telefonní předvolba včetně "+". */
  prefix: string;
};

/**
 * Kurátorovaný seznam zemí pro PhoneInput. Není kompletní — primárně EU
 * + nejčastější destinace. Lze rozšířit, dropdown podporuje search by
 * jak jméno tak prefix.
 */
export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: "cz", name: "Česko", prefix: "+420" },
  { code: "sk", name: "Slovensko", prefix: "+421" },
  { code: "pl", name: "Polsko", prefix: "+48" },
  { code: "de", name: "Německo", prefix: "+49" },
  { code: "at", name: "Rakousko", prefix: "+43" },
  { code: "hu", name: "Maďarsko", prefix: "+36" },
  { code: "ua", name: "Ukrajina", prefix: "+380" },
  { code: "ro", name: "Rumunsko", prefix: "+40" },
  { code: "bg", name: "Bulharsko", prefix: "+359" },
  { code: "hr", name: "Chorvatsko", prefix: "+385" },
  { code: "si", name: "Slovinsko", prefix: "+386" },
  { code: "rs", name: "Srbsko", prefix: "+381" },
  { code: "gb", name: "Velká Británie", prefix: "+44" },
  { code: "ie", name: "Irsko", prefix: "+353" },
  { code: "fr", name: "Francie", prefix: "+33" },
  { code: "be", name: "Belgie", prefix: "+32" },
  { code: "nl", name: "Nizozemsko", prefix: "+31" },
  { code: "lu", name: "Lucembursko", prefix: "+352" },
  { code: "ch", name: "Švýcarsko", prefix: "+41" },
  { code: "it", name: "Itálie", prefix: "+39" },
  { code: "es", name: "Španělsko", prefix: "+34" },
  { code: "pt", name: "Portugalsko", prefix: "+351" },
  { code: "gr", name: "Řecko", prefix: "+30" },
  { code: "dk", name: "Dánsko", prefix: "+45" },
  { code: "se", name: "Švédsko", prefix: "+46" },
  { code: "no", name: "Norsko", prefix: "+47" },
  { code: "fi", name: "Finsko", prefix: "+358" },
  { code: "ee", name: "Estonsko", prefix: "+372" },
  { code: "lv", name: "Lotyšsko", prefix: "+371" },
  { code: "lt", name: "Litva", prefix: "+370" },
  { code: "is", name: "Island", prefix: "+354" },
  { code: "mt", name: "Malta", prefix: "+356" },
  { code: "cy", name: "Kypr", prefix: "+357" },
  { code: "us", name: "Spojené státy", prefix: "+1" },
  { code: "ca", name: "Kanada", prefix: "+1" },
  { code: "au", name: "Austrálie", prefix: "+61" },
  { code: "nz", name: "Nový Zéland", prefix: "+64" },
  { code: "jp", name: "Japonsko", prefix: "+81" },
  { code: "cn", name: "Čína", prefix: "+86" },
  { code: "kr", name: "Jižní Korea", prefix: "+82" },
  { code: "in", name: "Indie", prefix: "+91" },
  { code: "tr", name: "Turecko", prefix: "+90" },
  { code: "il", name: "Izrael", prefix: "+972" },
  { code: "ae", name: "Spojené arabské emiráty", prefix: "+971" },
  { code: "ru", name: "Rusko", prefix: "+7" },
  { code: "br", name: "Brazílie", prefix: "+55" },
  { code: "mx", name: "Mexiko", prefix: "+52" },
  { code: "za", name: "Jižní Afrika", prefix: "+27" },
];

const LOCALE_TO_COUNTRY: Record<string, string> = {
  cs: "cz",
  sk: "sk",
  en: "gb",
  de: "de",
  pl: "pl",
};

/** Vrátí výchozí PhoneCountry pro daný locale (nebo Česko jako fallback). */
export function defaultPhoneCountry(locale: string): PhoneCountry {
  const code = LOCALE_TO_COUNTRY[locale.toLowerCase()] ?? "cz";
  return PHONE_COUNTRIES.find((c) => c.code === code) ?? PHONE_COUNTRIES[0];
}

/** Vrátí PhoneCountry podle ISO kódu (case insensitive), nebo undefined. */
export function findCountryByCode(code: string | null | undefined): PhoneCountry | undefined {
  if (!code) return undefined;
  const lc = code.toLowerCase();
  return PHONE_COUNTRIES.find((c) => c.code === lc);
}

/** Vrátí první PhoneCountry, jejíž prefix odpovídá. */
export function findCountryByPrefix(prefix: string | null | undefined): PhoneCountry | undefined {
  if (!prefix) return undefined;
  const norm = prefix.replace(/\s/g, "");
  return PHONE_COUNTRIES.find((c) => c.prefix === norm);
}

/**
 * URL pro vlajku z flagcdn.com. Unicode flag emoji se na Windows / starších
 * systémech nerenderují, takže používáme PNG (s 2× variantou pro retina).
 */
export function flagUrl(code: string, widthPx: number = 20): string {
  return `https://flagcdn.com/w${widthPx}/${code.toLowerCase()}.png`;
}

export function flagSrcSet(code: string, widthPx: number = 20): string {
  return `${flagUrl(code, widthPx)} 1x, ${flagUrl(code, widthPx * 2)} 2x`;
}

/**
 * Formátuje řetězec číslic jako "xxx xxx xxx" (3-3-3). Pro vstupy jiné než
 * 9 znaků jen seskupí po trojicích zleva (např. "123 4567" → "123 456 7").
 */
export function formatPhoneDigits(digits: string): string {
  const clean = digits.replace(/\D/g, "");
  return clean.match(/.{1,3}/g)?.join(" ") ?? "";
}
