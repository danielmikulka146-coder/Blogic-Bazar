// "use client" = tato komponenta běží v prohlížeči, ne na serveru.
// Potřebujeme to, protože používáme useState, useEffect a event handlery (onClick atd.).
"use client";

import { Divider, Group, Stack, Text } from "@mantine/core";
import { ArrowUpDown, ChevronDown, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react"; // AnimatePresence = animace při přidání/odebrání prvků z DOMu
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFilterState } from "@/components/infrastructure/FilterStateProvider"; // sdílený stav pro search a header slot
import { CompactFilterBar } from "@/components/ui/CompactFilterBar";
import { FilterChip } from "@/components/ui/FilterChip";
import { ReactiveCheckOption, ReactiveSeparator } from "@/components/ui/GlassDropdownPanel";
import { PriceRangeControl } from "@/components/ui/PriceRangeControl";
import { useRouter } from "@/i18n/navigation";
import { InzeratCard } from "./InzeratCard";

// Barvy jako konstanty — změna na jednom místě se projeví všude v souboru.
const INK = "#1a1a1a";
const CREAM = "#F4EFE3";
const CARD = "#FBFAF6";
const ORANGE = "#FF5722";
const MONO_STACK = "var(--font-jb-mono), 'Courier New', ui-monospace, monospace";

// TypeScript typ — definuje tvar jednoho inzerátu. Pokud server pošle jiná data, TypeScript na to upozorní.
type Inzerat = {
  id: number;
  nazev: string;
  popis: string;
  kategorie: string;
  kontakt: string;
  stav: string;
  stavZbozi: string | null; // null = inzerát nemá vyplněný stav zboží
  foto: string;
  cena: number;
  free: boolean;
  createdAt: number;
};

// Props = co komponenta přijímá od rodiče (page.tsx předá pole inzerátů).
type Props = { data: Inzerat[]; initialKategorie?: string };

// Union type — SortOption může být jen jedna z těchto čtyř hodnot, nic jiného TypeScript nepřijme.
type SortOption = "newest" | "oldest" | "price_asc" | "price_desc";

const SORT_OPTIONS: SortOption[] = ["newest", "oldest", "price_asc", "price_desc"];
const SORT_LABELS: Record<SortOption, string> = {
  newest: "Nejnovější",
  oldest: "Nejstarší",
  price_asc: "Cena ↑",
  price_desc: "Cena ↓",
};

// SortChip = tlačítko pro řazení s rozbalovacím menu. Je to samostatná komponenta, aby hlavní komponenta nebyla příliš velká.
function SortChip({ sort, setSort }: { sort: SortOption; setSort: (s: SortOption) => void }) {
  const [open, setOpen] = useState(false); // je dropdown otevřený?
  const [hover, setHover] = useState(false); // je myš nad tlačítkem? (pro hover efekt)
  const ref = useRef<HTMLDivElement>(null); // ref = přímý přístup k DOM elementu bez re-renderu

  // Zavře dropdown při kliknutí mimo něj nebo stisknutí Escape — klasické UX chování.
  // useEffect s cleanup funkcí (return) = listener se odstraní, když se dropdown zavře.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]); // závislost [open] = efekt se spustí jen když se open změní

  // Pokud není výchozí řazení, tlačítko se oranžově "aktivuje" — vizuální feedback pro uživatele.
  const isActive = sort !== "newest";
  const bg = isActive ? ORANGE : hover || open ? CREAM : CARD;
  const color = isActive ? "#4A1B0C" : INK;

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          background: bg,
          color,
          border: `2px solid ${INK}`,
          borderRadius: 0,
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          fontFamily: MONO_STACK,
          transition: "background-color 0.15s, color 0.15s",
        }}
      >
        <ArrowUpDown size={12} />
        <span>{SORT_LABELS[sort]}</span>
        <ChevronDown
          size={14}
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              minWidth: 180,
              background: CARD,
              border: `2px dotted ${INK}`,
              borderRadius: 0,
              padding: 4,
              zIndex: 100,
            }}
          >
            {SORT_OPTIONS.map((option) => {
              const selected = sort === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setSort(option);
                    setOpen(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "8px 12px",
                    background: selected ? CREAM : "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: selected ? ORANGE : INK,
                    fontWeight: selected ? 700 : 500,
                    fontSize: 12,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    textAlign: "left",
                    fontFamily: MONO_STACK,
                    borderRadius: 0,
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    if (!selected) e.currentTarget.style.background = CREAM;
                  }}
                  onMouseLeave={(e) => {
                    if (!selected) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {SORT_LABELS[option]}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Hlavní exportovaná komponenta — volá ji page.tsx a předává jí data z databáze.
export function InzeratyListClient({ data, initialKategorie }: Props) {
  // Z kontextu (FilterStateProvider) dostaneme search query z headeru a funkce pro vložení komponent do headeru.
  const { searchQuery, setHeaderSlot, setHeaderSlotActive } = useFilterState();
  const router = useRouter();

  // Auto-refresh každých 5 s — router.refresh() znovu načte data ze serveru (Server
  // Component) bez plného reloadu stránky, takže filtry, scroll i stav zůstanou. Nové
  // inzeráty / změny stavu se tak objeví bez nutnosti ručního obnovení.
  useEffect(() => {
    const interval = window.setInterval(() => router.refresh(), 5000);
    return () => window.clearInterval(interval);
  }, [router]);

  // Stav filtrů — každý useState je jedna nezávislá hodnota uložená v paměti prohlížeče.
  // Při změně kteréhokoli stavu se komponenta znovu vykreslí.
  const [kategorie, setKategorie] = useState<string[]>(() => (initialKategorie ? [initialKategorie] : [])); // vybrané kategorie (pole = může jich být víc)
  const [stavy, setStavy] = useState<string[]>([]); // vybrané stavy inzerátu
  const [stavyZbozi, setStavyZbozi] = useState<string[]>([]); // vybrané stavy zboží
  const [jenZdarma, setJenZdarma] = useState(false); // toggle pro zobrazení jen zdarma inzerátů
  const [minCena, setMinCena] = useState<number | null>(null);
  const [maxCena, setMaxCena] = useState<number | null>(null);
  const [sort, setSort] = useState<SortOption>("newest"); // výchozí řazení = nejnovější

  // useMemo = vypočítá hodnotu jen když se změní závislost ([data]) — jinak vrátí cached výsledek.
  // Tady zjistíme nejvyšší cenu v datech, aby slider věděl, kde je jeho maximum.
  const maxAvailable = useMemo(() => {
    const ceny = data.filter((d) => !d.free).map((d) => d.cena);
    return ceny.length === 0 ? 0 : Math.max(...ceny);
  }, [data]);

  // ref na řádek s filtry — sledujeme jeho polohu vůči viewportu (viz scroll listener níže).
  const filterRowRef = useRef<HTMLDivElement>(null);
  const [chipsInView, setChipsInView] = useState(true); // jsou filtry ještě vidět na obrazovce?

  // Unikátní kategorie z dat seřazené abecedně — Set automaticky odstraní duplicity.
  const allKategorie = useMemo(() => Array.from(new Set(data.map((d) => d.kategorie))).sort(), [data]);
  const allStavy = useMemo(() => {
    const fromData = new Set(data.map((d) => d.stav).filter(Boolean));
    fromData.add("dostupné");
    fromData.add("zarezervováno");
    const order = ["dostupné", "zarezervováno", "rezervováno", "prodáno"];
    return Array.from(fromData).sort((a, b) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b, "cs");
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [data]);
  const allStavyZbozi = useMemo(() => ["nové", "jako nové", "použité", "opotřebované", "poškozené"], []);

  // Filtrování probíhá čistě v prohlížeči — žádný nový dotaz na server.
  // useMemo zajistí přepočet jen když se změní data nebo některý z filtrů.
  const filtered = useMemo(() => {
    // "zarezervováno" a "rezervováno" jsou aliasy pro stejný stav — oba filtrujeme společně.
    const reservedAliases = ["zarezervováno", "rezervováno"];
    const stavMatches = (filter: string, value: string) => {
      if (reservedAliases.includes(filter)) return reservedAliases.includes(value);
      return filter === value;
    };
    const q = searchQuery.trim().toLowerCase();
    return data.filter((i) => {
      if (q && !i.nazev.toLowerCase().includes(q)) return false; // fulltextové vyhledávání v názvu
      if (kategorie.length > 0 && !kategorie.includes(i.kategorie)) return false;
      if (stavy.length > 0 && !stavy.some((s) => stavMatches(s, i.stav))) return false;
      if (stavyZbozi.length > 0 && (!i.stavZbozi || !stavyZbozi.includes(i.stavZbozi))) return false;
      if (jenZdarma && !i.free) return false;
      const effectiveCena = i.free ? 0 : i.cena; // zdarma inzeráty mají pro účely filtru cenu 0
      if (minCena != null && effectiveCena < minCena) return false;
      if (maxCena != null && effectiveCena > maxCena) return false;
      return true;
    });
  }, [data, searchQuery, kategorie, stavy, stavyZbozi, jenZdarma, minCena, maxCena]);

  // [...filtered] = kopie pole, aby sort() neměnil originální filtered (sort mutuje pole in-place).
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sort === "price_asc") return (a.free ? 0 : a.cena) - (b.free ? 0 : b.cena);
      if (sort === "price_desc") return (b.free ? 0 : b.cena) - (a.free ? 0 : a.cena);
      if (sort === "oldest") return (a.createdAt ?? 0) - (b.createdAt ?? 0);
      return (b.createdAt ?? 0) - (a.createdAt ?? 0); // newest (default)
    });
  }, [filtered, sort]);

  // toggle = přidá nebo odebere položku z pole (pro multi-select filtry jako kategorie).
  const toggle = (set: string[], item: string, fn: (s: string[]) => void) => {
    if (set.includes(item)) fn(set.filter((x) => x !== item));
    else fn([...set, item]);
  };

  // useCallback = stejně jako useMemo, ale pro funkce — resetAll se nevytváří znovu při každém renderu.
  // Důležité, protože je v dependency array useEffectu níže.
  const resetAll = useCallback(() => {
    setKategorie([]);
    setStavy([]);
    setStavyZbozi([]);
    setJenZdarma(false);
    setMinCena(null);
    setMaxCena(null);
  }, []);

  const cenaActive = minCena != null || maxCena != null;
  const activeChipCount =
    kategorie.length + stavy.length + stavyZbozi.length + (jenZdarma ? 1 : 0) + (cenaActive ? 1 : 0);
  const hasActiveFilters = activeChipCount > 0;

  // Scroll listener — sleduje, jestli jsou filtry ještě vidět. Když uživatel odscrolluje dolů,
  // filtry zmizí z hlavní oblasti a automaticky se zobrazí v kompaktní liště v headeru.
  useEffect(() => {
    const HEADER_THRESHOLD = 80; // px od vrcholu viewportu — pod tímto bodem je header
    const check = () => {
      const el = filterRowRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect(); // poloha elementu vůči viewportu
      setChipsInView(rect.bottom > HEADER_THRESHOLD);
    };
    check(); // spustit hned při mountu (ne až při prvním scrollu)
    window.addEventListener("scroll", check, { passive: true }); // passive = neblokuje scroll výkon
    window.addEventListener("resize", check);
    return () => {
      // cleanup = odstranění listenerů při opuštění stránky
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []); // [] = spustí se jen jednou po mountu

  // Vkládá kompaktní filtrovací lištu do headeru přes sdílený kontext.
  // Header existuje mimo tuto komponentu, takže přímé volání není možné — používáme "slot" pattern.
  useEffect(() => {
    setHeaderSlot(
      <CompactFilterBar
        kategorie={kategorie}
        setKategorie={setKategorie}
        stavy={stavy}
        setStavy={setStavy}
        stavyZbozi={stavyZbozi}
        setStavyZbozi={setStavyZbozi}
        jenZdarma={jenZdarma}
        setJenZdarma={setJenZdarma}
        minCena={minCena}
        maxCena={maxCena}
        setMinCena={setMinCena}
        setMaxCena={setMaxCena}
        maxAvailableCena={maxAvailable}
        allKategorie={allKategorie}
        allStavy={allStavy}
        allStavyZbozi={allStavyZbozi}
        resetAll={resetAll}
        visible={!chipsInView}
      />,
    );
  }, [
    chipsInView,
    kategorie,
    stavy,
    stavyZbozi,
    jenZdarma,
    minCena,
    maxCena,
    maxAvailable,
    allKategorie,
    allStavy,
    allStavyZbozi,
    resetAll,
    setHeaderSlot,
  ]);

  // Řekne headeru, jestli má slot zobrazit (true) nebo skrýt (false).
  useEffect(() => {
    setHeaderSlotActive(!chipsInView);
  }, [chipsInView, setHeaderSlotActive]);

  // Cleanup při odchodu ze stránky — odstraní filtrovací lištu z headeru.
  // () => () => {} = funkce vracející funkci = React zavolá vnitřní funkci při unmountu.
  useEffect(
    () => () => {
      setHeaderSlot(null);
      setHeaderSlotActive(false);
    },
    [setHeaderSlot, setHeaderSlotActive],
  );

  return (
    <Stack gap="lg">
      {/* Filter bar + sort + stats */}
      <Stack gap="sm">
        <div ref={filterRowRef}>
          <Group gap="xs" wrap="wrap" align="flex-start">
            <FilterChip label="Kategorie" activeCount={kategorie.length}>
              <Stack gap={0}>
                {allKategorie.map((k, i) => (
                  <div key={k}>
                    {i > 0 && <ReactiveSeparator />}
                    <ReactiveCheckOption
                      value={k}
                      checked={kategorie.includes(k)}
                      onToggle={() => toggle(kategorie, k, setKategorie)}
                    />
                  </div>
                ))}
              </Stack>
            </FilterChip>

            <FilterChip label="Stav" activeCount={stavy.length}>
              <Stack gap={0}>
                {allStavy.map((s, i) => (
                  <div key={s}>
                    {i > 0 && <ReactiveSeparator />}
                    <ReactiveCheckOption
                      value={s}
                      checked={stavy.includes(s)}
                      onToggle={() => toggle(stavy, s, setStavy)}
                    />
                  </div>
                ))}
              </Stack>
            </FilterChip>

            <FilterChip label="Stav zboží" activeCount={stavyZbozi.length}>
              <Stack gap={0}>
                {allStavyZbozi.map((s, i) => (
                  <div key={s}>
                    {i > 0 && <ReactiveSeparator />}
                    <ReactiveCheckOption
                      value={s}
                      checked={stavyZbozi.includes(s)}
                      onToggle={() => toggle(stavyZbozi, s, setStavyZbozi)}
                    />
                  </div>
                ))}
              </Stack>
            </FilterChip>

            <FilterChip label="Cena" activeCount={cenaActive ? 1 : 0} panelMinWidth={280}>
              <PriceRangeControl
                minCena={minCena}
                maxCena={maxCena}
                setMinCena={setMinCena}
                setMaxCena={setMaxCena}
                maxAvailable={maxAvailable}
              />
            </FilterChip>

            <FilterChip label="Zdarma" asToggle active={jenZdarma} onToggle={() => setJenZdarma((v) => !v)} />

            <AnimatePresence>
              {hasActiveFilters && (
                <motion.div
                  key="reset"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ type: "spring", bounce: 0.35, duration: 0.5 }}
                  style={{ display: "inline-block" }}
                >
                  <motion.button
                    type="button"
                    onClick={resetAll}
                    whileTap={{ scale: 0.93 }}
                    transition={{ type: "spring", stiffness: 500, damping: 28 }}
                    aria-label="Zrušit filtry"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = CREAM;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = CARD;
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 34,
                      height: 34,
                      background: CARD,
                      color: INK,
                      border: `2px solid ${INK}`,
                      borderRadius: 0,
                      cursor: "pointer",
                      padding: 0,
                      transition: "background-color 0.15s",
                    }}
                  >
                    <X size={14} />
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sort chip — pushed to right */}
            <div style={{ marginLeft: "auto" }}>
              <SortChip sort={sort} setSort={setSort} />
            </div>
          </Group>
        </div>

        <Text size="sm" c="dimmed">
          {filtered.length} z {data.length} inzerátů
        </Text>
      </Stack>

      {/* Dělicí čára */}
      <Divider opacity={0.3} my={-4} />

      {/* CSS Grid s auto-fill — prohlížeč sám rozhodne, kolik 300px sloupců se vejde.
          Responsive bez media queries: na mobilu 1 sloupec, na desktopu 4. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, 300px)",
          gap: 14,
          justifyContent: "center",
        }}
      >
        {/* AnimatePresence sleduje přidání/odebrání karet z DOM a animuje je.
            mode="popLayout" = odcházející karta se okamžitě vyjme z layoutu, ostatní se přeskupí. */}
        <AnimatePresence mode="popLayout">
          {sorted.map((inzerat) => (
            <motion.div
              key={inzerat.id} // key musí být unikátní a stabilní — React ho používá ke sledování prvků
              layout // animuje přesun karty při změně pořadí (Framer Motion)
              initial={{ opacity: 0, scale: 0.92 }} // počáteční stav při vstupu
              animate={{ opacity: 1, scale: 1 }} // cílový stav
              exit={{ opacity: 0, scale: 0.92 }} // stav při odchodu
              transition={{ type: "spring", stiffness: 300, damping: 28 }} // fyzikální model pružiny
            >
              <InzeratCard
                id={inzerat.id}
                nazev={inzerat.nazev}
                foto={inzerat.foto}
                kategorie={inzerat.kategorie}
                stav={inzerat.stav}
                stavZbozi={inzerat.stavZbozi}
                cena={inzerat.cena}
                free={inzerat.free}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <Text c="dimmed" ta="center" py="xl">
          Žádné inzeráty neodpovídají filtrům.
        </Text>
      )}
    </Stack>
  );
}
