"use client";

import { Group, Modal, Stack, Text, Title } from "@mantine/core";
import {
  ArrowLeft,
  Bookmark,
  BookmarkX,
  Check,
  Edit3,
  Eye,
  Heart,
  Mail,
  MessageSquare,
  Phone,
  Share2,
  ShoppingBag,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import QRCode from "react-qr-code";
import { useAuth } from "@/components/infrastructure/AuthProvider";
import { useFilterState } from "@/components/infrastructure/FilterStateProvider";
import { Avatar } from "@/components/layout/AuthPill";
import { SaveButton } from "@/components/ui/SaveButton";
import { Link } from "@/i18n/navigation";
import { odstranitInzerat } from "../owner-actions";
import { oznacitZaplaceno, pridatZobrazeni, toggleProdano, toggleRezervace, ukoncitProhlizeni } from "./actions";
import { FotoGalerie } from "./FotoGalerie";

type InzeratData = {
  id: number;
  nazev: string;
  popis: string;
  kategorie: string;
  kontakt: string;
  stav: string;
  cena: number | null;
  free: boolean;
  telefon: string | null;
  stavZbozi: string | null;
  viewsCount: number;
  ownerLastSeenViews: number;
  paymentDone: boolean;
  createdAt: number;
};

type Owner = { name: string; picture: string | null; email: string };

const QR_ACCOUNT = "CZ6508000000192000145399";
const QR_VS = "00000";

// Sestaví QR kód ve formátu SPD (Short Payment Descriptor) — standard českých bank pro platební QR.
// Výsledný string zakóduje do QRCode komponenty, která ho zobrazí jako naskenovaný kód.
function buildSpdString(cena: number, id: number) {
  const am = cena.toFixed(2); // banka vyžaduje 2 desetinná místa
  const msg = `Platba za inzerat ${id}`;
  return `SPD*1.0*ACC:${QR_ACCOUNT}*AM:${am}*CC:CZK*MSG:${msg}*X-VS:${QR_VS}`;
}

function stavZboziLabel(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDateShort(unixSec: number): string | null {
  // Legacy inzeráty z doby před $defaultFn mají createdAt = 0 (1.1.1970) — neukazovat.
  if (!unixSec || unixSec < 1_000_000_000) return null;
  const d = new Date(unixSec * 1000);
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
}

function formatPhone(raw: string): string {
  // 9-mistné CZ čísla → "XXX XXX XXX"; jinak zachovat
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 9) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return raw;
}

/**
 * Stav inzerátu v top meta řádce — barevná tečka + label. Animuje barvu + label
 * při změně stavu (rezervace/prodej).
 */
function StavTecka({ stav, isReservedByMe }: { stav: string; isReservedByMe: boolean }) {
  const isAvailable = stav === "dostupné";
  const isReserved = stav === "zarezervováno" || stav === "rezervováno";
  const isSold = stav === "prodáno";

  let color = "#888780";
  let label = stav.toUpperCase();
  if (isAvailable) {
    color = "#3B6D11";
    label = "DOSTUPNÉ";
  } else if (isSold) {
    color = "#6b6b6b";
    label = "PRODÁNO";
  } else if (isReserved) {
    color = isReservedByMe ? "#FF5722" : "#854F0B";
    label = isReservedByMe ? "TVÁ REZERVACE" : "REZERVOVÁNO";
  }

  return (
    <Group gap={6} wrap="nowrap" align="center">
      <motion.span
        key={color}
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 22 }}
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={label}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.18 }}
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            color,
            fontFamily: "inherit",
          }}
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </Group>
  );
}

/**
 * Velké tlačítko ve sloupci akcí (owner edit/share/delete, modal akce).
 * Halftone outline styl s tint variantami určujícími barvu textu.
 */
function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  tint = "neutral",
  pending,
  fullWidth = true,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  tint?: "neutral" | "orange" | "blue" | "red" | "green";
  pending?: boolean;
  fullWidth?: boolean;
}) {
  const INK = "#1a1a1a";
  const CREAM = "#F4EFE3";
  const CARD = "#FBFAF6";
  const tintColor: Record<string, string> = {
    neutral: INK,
    orange: "#FF5722",
    blue: "#1f5fb8",
    red: "#a8201a",
    green: "#3B6D11",
  };
  const color = tintColor[tint];
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      whileHover={disabled || pending ? undefined : { backgroundColor: CREAM }}
      whileTap={disabled || pending ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 460, damping: 26 }}
      style={{
        cursor: disabled || pending ? "not-allowed" : "pointer",
        padding: "10px 14px",
        display: fullWidth ? "block" : "inline-block",
        width: fullWidth ? "100%" : "auto",
        opacity: disabled ? 0.5 : pending ? 0.7 : 1,
        background: CARD,
        backgroundColor: CARD,
        border: `2px solid ${INK}`,
        borderRadius: 0,
        color,
        fontFamily: "inherit",
      }}
    >
      <Group gap={8} justify="center" align="center" wrap="nowrap">
        {icon}
        <Text
          fw={700}
          size="sm"
          c="currentColor"
          style={{ whiteSpace: "nowrap", letterSpacing: "0.04em", textTransform: "uppercase" }}
        >
          {label}
        </Text>
      </Group>
    </motion.button>
  );
}

/**
 * Vlastníkův toggle "prodáno". Halftone primary CTA: oranžová pro toggle "prodáno",
 * cream + ink border pro toggle zpět na dostupné.
 */
function ProdanoToggle({ stav, onToggle, pending }: { stav: string; onToggle: () => void; pending: boolean }) {
  const INK = "#1a1a1a";
  const CREAM = "#F4EFE3";
  const CARD = "#FBFAF6";
  const ORANGE = "#FF5722";
  const BURNT = "#4A1B0C";
  const isSold = stav === "prodáno";

  const bg = isSold ? CARD : ORANGE;
  const bgHover = isSold ? CREAM : "#e84812";
  const color = isSold ? INK : BURNT;

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      disabled={pending}
      whileHover={pending ? undefined : { backgroundColor: bgHover }}
      whileTap={pending ? undefined : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 380, damping: 24 }}
      style={{
        width: "100%",
        padding: "12px 14px",
        backgroundColor: bg,
        border: `2px solid ${INK}`,
        borderRadius: 0,
        cursor: pending ? "not-allowed" : "pointer",
        opacity: pending ? 0.7 : 1,
        color,
        fontFamily: "inherit",
      }}
    >
      <Group gap={8} justify="center" align="center" wrap="nowrap">
        {isSold ? <Check size={16} /> : <Tag size={16} />}
        <Text
          fw={700}
          size="sm"
          c="currentColor"
          style={{ whiteSpace: "nowrap", letterSpacing: "0.04em", textTransform: "uppercase" }}
        >
          {pending ? "Zpracovávám…" : isSold ? "Vrátit dostupné" : "Označit jako prodáno"}
        </Text>
      </Group>
    </motion.button>
  );
}

/**
 * Pravý header slot — angular bar s cenou a kontextovou akcí.
 * Owner: tlačítko prodáno. Non-owner: rezervovat/zrušit nebo status.
 */
function HeaderRightSlot({
  cenaText,
  stav,
  isOwner,
  isReservedByMe,
  pending,
  onPrimary,
}: {
  cenaText: string;
  stav: string;
  isOwner: boolean;
  isReservedByMe: boolean;
  pending: boolean;
  onPrimary: () => void;
}) {
  const INK = "#1a1a1a";
  const CARD = "#FBFAF6";
  const ORANGE = "#FF5722";
  const BURNT = "#4A1B0C";

  const isReserved = stav === "zarezervováno" || stav === "rezervováno";
  const isSold = stav === "prodáno";

  let trailing: React.ReactNode;
  if (isOwner) {
    trailing = (
      <SlotPillButton key="owner-toggle" onClick={onPrimary} pending={pending} variant={isSold ? "neutral" : "primary"}>
        {pending ? "…" : isSold ? "Vrátit" : "Prodáno"}
      </SlotPillButton>
    );
  } else if (isSold) {
    trailing = (
      <SlotPillLabel key="sold" variant="muted">
        Prodáno
      </SlotPillLabel>
    );
  } else if (isReserved) {
    if (isReservedByMe) {
      trailing = (
        <SlotPillButton key="cancel" onClick={onPrimary} pending={pending} variant="muted">
          {pending ? "…" : "Zrušit"}
        </SlotPillButton>
      );
    } else {
      trailing = (
        <SlotPillLabel key="reserved" variant="muted">
          Rezervováno
        </SlotPillLabel>
      );
    }
  } else {
    trailing = (
      <SlotPillButton key="reserve" onClick={onPrimary} pending={pending} variant="primary">
        {pending ? "…" : "Zarezervovat"}
      </SlotPillButton>
    );
  }

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 6px 4px 10px",
        background: CARD,
        border: `2px solid ${INK}`,
        borderRadius: 0,
        height: 34,
        whiteSpace: "nowrap",
      }}
    >
      <Text
        size="sm"
        fw={800}
        c={ORANGE}
        style={{
          whiteSpace: "nowrap",
          letterSpacing: "0.02em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {cenaText}
      </Text>
      <AnimatePresence mode="wait" initial={false}>
        {trailing}
      </AnimatePresence>
      <style jsx>{`
        :global([data-slot-pill="primary"]) { background: ${ORANGE}; color: ${BURNT}; }
        :global([data-slot-pill="muted"]) { background: ${INK}; color: ${CARD}; }
        :global([data-slot-pill="neutral"]) { background: ${CARD}; color: ${INK}; border: 2px solid ${INK}; }
      `}</style>
    </div>
  );
}

function SlotPillButton({
  children,
  onClick,
  pending,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  pending: boolean;
  variant: "primary" | "muted" | "neutral";
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={pending}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: pending ? 0.6 : 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.14 }}
      data-slot-pill={variant}
      style={{
        border: "none",
        cursor: pending ? "not-allowed" : "pointer",
        padding: "4px 12px",
        borderRadius: 0,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        fontFamily: "inherit",
      }}
    >
      {children}
    </motion.button>
  );
}

function SlotPillLabel({ children, variant }: { children: React.ReactNode; variant: "primary" | "muted" }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      data-slot-pill={variant}
      style={{
        padding: "4px 12px",
        borderRadius: 0,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        display: "inline-block",
      }}
    >
      {children}
    </motion.span>
  );
}

export function InzeratDetailClient({
  inzerat,
  fotky,
  owner,
  isOwner,
  isReservedByMe,
  isBuyer,
  isLoggedIn,
  savedCount,
}: {
  inzerat: InzeratData;
  fotky: string[];
  owner: Owner | null;
  isOwner: boolean;
  isReservedByMe: boolean;
  isBuyer: boolean;
  isLoggedIn: boolean;
  savedCount: number;
}) {
  const { user } = useAuth();
  // Lokální kopie stavu — po akci (rezervace/prodej) aktualizujeme UI okamžitě bez reload stránky.
  const [stav, setStav] = useState(inzerat.stav);
  const [reservedByMe, setReservedByMe] = useState(isReservedByMe);
  const [paymentDone, setPaymentDone] = useState(inzerat.paymentDone);
  const [buyerIsMe, setBuyerIsMe] = useState(isBuyer);
  // useTransition = spustí async akci na pozadí, pending=true mezitím → UI lze deaktivovat (spinner/disabled).
  const [pending, startTransition] = useTransition();
  const [paymentOpen, setPaymentOpen] = useState(false); // otevřený modal s QR platbou
  const [confirmDelete, setConfirmDelete] = useState(false); // potvrzovací krok před smazáním
  const [shareToast, setShareToast] = useState<string | null>(null); // text dočasného toastu dole
  const { setHeaderSlotRight, setHeaderSlotRightActive } = useFilterState();
  const actionRef = useRef<HTMLDivElement>(null);
  const [actionVisible, setActionVisible] = useState(true);

  const cenaText = inzerat.free ? "Zdarma" : `${inzerat.cena?.toLocaleString("cs-CZ")} Kč`;
  // QR platba je vždy zapnutá; jen schováme když je inzerát zdarma nebo bez ceny.
  const canShowQr = !inzerat.free && inzerat.cena != null && inzerat.cena > 0;

  // Delta zobrazení od poslední owner návštěvy.
  const viewsDelta = Math.max(0, inzerat.viewsCount - inzerat.ownerLastSeenViews);

  // Ref guard kvůli React Strict Mode — v dev prostředí React záměrně mountuje komponenty 2×
  // aby odhalil vedlejší efekty. Bez guardu by se views inkrementovaly o +2 místo +1.
  const viewRecordedRef = useRef(false);
  useEffect(() => {
    if (viewRecordedRef.current) return; // druhý mount v Strict Mode → přeskočit
    viewRecordedRef.current = true;
    pridatZobrazeni(inzerat.id).catch(() => {}); // .catch(() => {}) = ignorujeme chybu sítě, není kritická
    return () => {
      // Cleanup při odchodu ze stránky — resetuje "nová zobrazení" counter pro ownera.
      ukoncitProhlizeni(inzerat.id).catch(() => {});
    };
  }, [inzerat.id]);

  // Jedno tlačítko, dvě chování — záleží na tom, jestli jsi owner nebo kupující.
  // useCallback = funkce se znovu nevytváří při každém renderu, důležité pro stabilitu v useLayoutEffect.
  const handlePrimary = useCallback(() => {
    if (!isLoggedIn) return;
    startTransition(async () => {
      if (isOwner) {
        const res = await toggleProdano(inzerat.id);
        if (res.ok) {
          setStav((s) => (s === "prodáno" ? "dostupné" : "prodáno"));
          if (stav !== "prodáno") setPaymentDone(false);
        }
      } else {
        const res = await toggleRezervace(inzerat.id);
        if (res.ok) {
          if (stav === "dostupné") {
            setStav("zarezervováno");
            setReservedByMe(true);
          } else if (reservedByMe) {
            setStav("dostupné");
            setReservedByMe(false);
          }
        } else if (res.error) {
          setShareToast(res.error);
          window.setTimeout(() => setShareToast(null), 2200);
        }
      }
    });
  }, [inzerat.id, isOwner, isLoggedIn, stav, reservedByMe]);

  const handlePaymentDone = useCallback(() => {
    startTransition(async () => {
      const res = await oznacitZaplaceno(inzerat.id);
      if (res.ok) {
        setPaymentDone(true);
        if (!isOwner) {
          setBuyerIsMe(true);
          setStav("prodáno");
        }
      }
      setPaymentOpen(false);
    });
  }, [inzerat.id, isOwner]);

  const handlePaymentOther = useCallback(() => {
    // Stejné chování jako "Zaplaceno" — jen jiný UX flow (kupující říká, že zaplatí mimo).
    handlePaymentDone();
  }, [handlePaymentDone]);

  const handleShare = useCallback(async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: inzerat.nazev, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareToast("Odkaz zkopírován");
      window.setTimeout(() => setShareToast(null), 1600);
    } catch {
      // uživatel zrušil share
    }
  }, [inzerat.nazev]);

  const handleDelete = useCallback(() => {
    startTransition(async () => {
      await odstranitInzerat(inzerat.id);
      window.location.href = "/inzeraty";
    });
  }, [inzerat.id]);

  // IntersectionObserver je efektivnější alternativa ke scroll listeneru —
  // prohlížeč sám sleduje, kdy element vstoupí/opustí viewport, bez zbytečných výpočtů.
  // rootMargin: "-480px" = element se "skryje" dřív, než fyzicky zmizí z obrazovky.
  useLayoutEffect(() => {
    const el = actionRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const initiallyVisible = rect.bottom > 260;
    setActionVisible(initiallyVisible);
    const observer = new IntersectionObserver(([entry]) => setActionVisible(entry.isIntersecting), {
      threshold: 0,
      rootMargin: "-480px 0px 0px 0px",
    });
    observer.observe(el);
    return () => observer.disconnect(); // cleanup = zastavit sledování při odchodu ze stránky
  }, []);

  // useLayoutEffect místo useEffect — spustí se synchronně před vykreslením prohlížeče.
  // Díky tomu header zobrazí slot ve stejném framu, ne o jeden frame později (žádný bliknutí).
  useLayoutEffect(() => {
    setHeaderSlotRight(
      <HeaderRightSlot
        cenaText={cenaText}
        stav={stav}
        isOwner={isOwner}
        isReservedByMe={reservedByMe}
        pending={pending}
        onPrimary={handlePrimary}
      />,
    );
  }, [stav, cenaText, pending, handlePrimary, isOwner, reservedByMe, setHeaderSlotRight]);

  useLayoutEffect(() => {
    setHeaderSlotRightActive(!actionVisible);
  }, [actionVisible, setHeaderSlotRightActive]);

  useEffect(
    () => () => {
      setHeaderSlotRight(null);
      setHeaderSlotRightActive(false);
    },
    [setHeaderSlotRight, setHeaderSlotRightActive],
  );

  return (
    <Stack gap="xl" maw={1100} mx="auto">
      {/* Zpět na inzeráty — text-only, větší padding aby vznikl dýchací prostor */}
      <div style={{ padding: "8px 0 4px" }}>
        <Link
          href="/inzeraty"
          style={{
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: "var(--mantine-color-dimmed)",
            fontSize: 14,
            fontWeight: 500,
            transition: "color 0.16s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--mantine-color-text)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--mantine-color-dimmed)";
          }}
        >
          <ArrowLeft size={16} />
          <span>Zpět na inzeráty</span>
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 6fr) minmax(0, 4fr)",
          gap: 32,
          alignItems: "stretch",
        }}
        className="inzerat-detail-grid"
      >
        {/* LEVÝ SLOUPEC — galerie */}
        <div>
          <FotoGalerie fotky={fotky} nazev={inzerat.nazev} />
        </div>

        {/* PRAVÝ SLOUPEC — info + akce. Flex column + height 100% kopíruje
            výšku galerie (díky align-items: stretch v gridu), takže InzerentCard
            s margin-top: auto se zarovná se spodním okrajem galerie. */}
        <div ref={actionRef} style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
          <Stack gap="md">
            {/* Meta řádka: kategorie · stav zboží · datum · (non-owner: stav inzerátu) */}
            <Group gap={8} wrap="wrap">
              <MetaItem text={inzerat.kategorie.toUpperCase()} />
              {inzerat.stavZbozi && (
                <>
                  <MetaDot />
                  <MetaItem text={stavZboziLabel(inzerat.stavZbozi).toUpperCase()} />
                </>
              )}
              {formatDateShort(inzerat.createdAt) && (
                <>
                  <MetaDot />
                  <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: "0.06em" }}>
                    Přidáno {formatDateShort(inzerat.createdAt)}
                  </Text>
                </>
              )}
              {!isOwner && (
                <>
                  <MetaDot />
                  <StavTecka stav={stav} isReservedByMe={reservedByMe} />
                </>
              )}
            </Group>

            <Title order={1} c="var(--mantine-color-text)" style={{ fontSize: 30, lineHeight: 1.1, fontWeight: 800 }}>
              {inzerat.nazev}
            </Title>

            <Group gap={10} align="baseline" wrap="nowrap">
              <Text
                c="#FF5722"
                fw={800}
                style={{
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 32,
                  lineHeight: 1,
                }}
              >
                {inzerat.free ? "Zdarma" : inzerat.cena?.toLocaleString("cs-CZ")}
              </Text>
              {!inzerat.free && (
                <Text c="dimmed" fw={500} size="sm">
                  Kč
                </Text>
              )}
              {!canShowQr && !inzerat.free && (
                <Text c="dimmed" size="xs" style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>
                  platba dle dohody
                </Text>
              )}
            </Group>

            {/* Tenká dělící čára pod cenou — odděluje meta od akcí */}
            <div
              aria-hidden="true"
              style={{
                height: 0,
                borderTop: "2px dotted #1a1a1a",
                margin: "4px 0",
              }}
            />

            {/* STATUS panel pro OWNERA — jedno tlačítko */}
            {isOwner && (
              <Stack gap={6}>
                <Text size="xs" tt="uppercase" fw={700} style={{ letterSpacing: "0.1em", color: "#888780" }}>
                  Stav inzerátu
                </Text>
                <ProdanoToggle stav={stav} onToggle={handlePrimary} pending={pending} />
              </Stack>
            )}

            {/* OWNERSKÉ statistiky — Zobrazení / Uloženo */}
            {isOwner && (
              <Group gap={10} wrap="wrap">
                <StatCard icon={<Eye size={14} />} label="Zobrazení" value={inzerat.viewsCount} delta={viewsDelta} />
                <StatCard icon={<Heart size={14} />} label="Uloženo" value={savedCount} />
              </Group>
            )}
          </Stack>

          {/* SPODNÍ SKUPINA — akce + inzerent karta.
              U 1 fotky: marginTop: auto zarovná se spodním okrajem galerie.
              U víc fotek: thumbnaily prodlužují galerii a vzniká velká mezera,
              tak skupinu necháme těsně pod cenou (žádné auto). */}
          <Stack
            gap="md"
            style={{
              marginTop: fotky.length > 1 ? undefined : "auto",
              paddingTop: 16,
            }}
          >
            <Stack gap={8}>
              {isOwner ? (
                <>
                  <Link href={`/inzeraty/${inzerat.id}/upravit`} style={{ textDecoration: "none" }}>
                    <ActionButton icon={<Edit3 size={16} />} label="Upravit inzerát" />
                  </Link>
                  <ActionButton icon={<Share2 size={16} />} label="Sdílet" onClick={handleShare} />
                  {!confirmDelete ? (
                    <ActionButton
                      icon={<Trash2 size={16} />}
                      label="Smazat inzerát"
                      tint="red"
                      onClick={() => setConfirmDelete(true)}
                    />
                  ) : (
                    <Stack gap={6}>
                      <Text size="xs" c="dimmed" ta="center">
                        Opravdu smazat?
                      </Text>
                      <Group gap={8} grow>
                        <ActionButton
                          icon={<X size={16} />}
                          label="Zrušit"
                          onClick={() => setConfirmDelete(false)}
                          disabled={pending}
                        />
                        <ActionButton
                          icon={<Trash2 size={16} />}
                          label="Smazat"
                          tint="red"
                          onClick={handleDelete}
                          pending={pending}
                        />
                      </Group>
                    </Stack>
                  )}
                </>
              ) : (
                <NonOwnerActions
                  stav={stav}
                  isReservedByMe={reservedByMe}
                  isLoggedIn={isLoggedIn}
                  isFree={inzerat.free}
                  paymentDone={paymentDone}
                  buyerIsMe={buyerIsMe}
                  pending={pending}
                  onReserveToggle={handlePrimary}
                  onBuy={() => setPaymentOpen(true)}
                  saveSlot={<SaveButton inzeratId={inzerat.id} variant="wide" />}
                  onShare={handleShare}
                />
              )}
            </Stack>

            {owner && (
              <InzerentCard
                owner={owner}
                telefon={inzerat.telefon}
                showWriteButton={!isOwner && !!user}
                mailSubject={`Inzerát: ${inzerat.nazev}`}
              />
            )}
          </Stack>
        </div>

        {/* Dotted full-width linka mezi gridem a popisem — spans přes oba sloupce */}
        <div
          aria-hidden="true"
          style={{
            gridColumn: "1 / -1",
            height: 0,
            borderTop: "2px dotted #1a1a1a",
            marginTop: 8,
          }}
        />

        {/* POPIS — jen pod galerií (sloupec 1), aby nesnídal pod info panel */}
        <Stack gap={6} style={{ gridColumn: "1 / 2" }}>
          <Text
            size="sm"
            tt="uppercase"
            fw={700}
            style={{
              letterSpacing: "0.1em",
              color: "#888780",
              fontFamily: "var(--font-jb-mono), 'Courier New', ui-monospace, monospace",
            }}
          >
            Popis
          </Text>
          <Text
            c="#1a1a1a"
            style={{
              whiteSpace: "pre-wrap",
              lineHeight: 1.6,
              fontFamily: "var(--font-jb-mono), 'Courier New', ui-monospace, monospace",
            }}
          >
            {inzerat.popis}
          </Text>
        </Stack>
      </div>

      {/* QR / platba modal */}
      <Modal
        opened={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        centered
        withCloseButton={false}
        padding={0}
        size="auto"
        radius={0}
        overlayProps={{ backgroundOpacity: 0.6, blur: 10 }}
        styles={{ content: { background: "transparent", boxShadow: "none" } }}
      >
        <Stack
          gap="md"
          align="center"
          p="lg"
          style={{
            minWidth: 360,
            background: "#FBFAF6",
            border: "2px solid #1a1a1a",
          }}
        >
          {canShowQr && (
            <div
              style={{
                background: "white",
                padding: 20,
                borderRadius: 0,
                border: "2px dotted #1a1a1a",
              }}
            >
              <QRCode value={buildSpdString(inzerat.cena as number, inzerat.id)} size={280} />
            </div>
          )}
          <Stack gap={2} align="center">
            <Text c="#1a1a1a" size="sm" fw={700} style={{ letterSpacing: "0.04em" }}>
              {cenaText}
              {canShowQr ? " · Naskenuj v bankovní aplikaci" : ""}
            </Text>
            {canShowQr && (
              <Text c="#888780" size="xs">
                Účet: {QR_ACCOUNT} · VS: {QR_VS}
              </Text>
            )}
          </Stack>
          <Group gap={10} grow style={{ width: "100%" }}>
            <ActionButton
              icon={<Check size={16} />}
              label="Zaplaceno"
              tint="green"
              onClick={handlePaymentDone}
              pending={pending}
            />
            <ActionButton
              icon={<MessageSquare size={16} />}
              label="Zaplatím jinak"
              tint="neutral"
              onClick={handlePaymentOther}
              pending={pending}
            />
          </Group>
        </Stack>
      </Modal>

      {/* Toast */}
      <AnimatePresence>
        {shareToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: "fixed",
              bottom: 24,
              left: "50%",
              transform: "translateX(-50%)",
              padding: "10px 18px",
              borderRadius: 0,
              background: "#1a1a1a",
              color: "#F4EFE3",
              border: "2px solid #1a1a1a",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              zIndex: 1500,
            }}
          >
            {shareToast}
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        @media (max-width: 768px) {
          :global(.inzerat-detail-grid) {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
        }
      `}</style>
    </Stack>
  );
}

function MetaItem({ text }: { text: string }) {
  return (
    <Text size="xs" fw={700} tt="uppercase" style={{ letterSpacing: "0.1em", color: "#888780" }}>
      {text}
    </Text>
  );
}

function MetaDot() {
  return <span style={{ color: "#888780", fontSize: 10 }}>·</span>;
}

function StatCard({
  icon,
  label,
  value,
  delta,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  delta?: number;
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 110,
        padding: "10px 12px",
        borderRadius: 0,
        background: "#FBFAF6",
        border: "2px dotted #1a1a1a",
      }}
    >
      <Group gap={6} c="#888780">
        {icon}
        <Text size="xs" tt="uppercase" fw={700} style={{ letterSpacing: "0.1em", color: "#888780" }}>
          {label}
        </Text>
      </Group>
      <Group gap={6} align="baseline" mt={4}>
        <Text c="#1a1a1a" fw={800} size="xl" style={{ lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          {value}
        </Text>
        {delta != null && delta > 0 && (
          <Text c="#3B6D11" size="xs" fw={700}>
            +{delta}
          </Text>
        )}
      </Group>
    </div>
  );
}

/**
 * Sjednocené tlačítko pro non-owner akce. Halftone outline styl.
 *   - default: cream bg, ink text, solid ink border
 *   - primary: oranžové CTA (Zarezervovat, Koupit) s tmavě hnědým textem
 *   - light: transparentní bg, ink text, solid ink border (Napsat e-mail)
 *   - danger: cream bg, oranžový text, solid ink border (kontextuální nebezpečné akce)
 */
function DarkButton({
  icon,
  label,
  onClick,
  disabled,
  pending,
  variant = "default",
  shimmer = false,
}: {
  icon?: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  pending?: boolean;
  variant?: "default" | "primary" | "danger" | "light";
  shimmer?: boolean;
}) {
  const INK = "#1a1a1a";
  const CREAM = "#F4EFE3";
  const CARD = "#FBFAF6";
  const ORANGE = "#FF5722";
  const BURNT = "#4A1B0C";

  const isDanger = variant === "danger";
  const isPrimary = variant === "primary";
  const isLight = variant === "light";
  const isDisabled = disabled || pending;

  let bg: string;
  let bgHover: string;
  let textColor: string;

  if (isPrimary) {
    bg = ORANGE;
    bgHover = "#e84812";
    textColor = BURNT;
  } else if (isDanger) {
    bg = CARD;
    bgHover = CREAM;
    textColor = ORANGE;
  } else if (isLight) {
    bg = "transparent";
    bgHover = CREAM;
    textColor = INK;
  } else {
    bg = CARD;
    bgHover = CREAM;
    textColor = INK;
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      whileHover={isDisabled ? undefined : { backgroundColor: bgHover }}
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 460, damping: 26 }}
      style={{
        position: "relative",
        overflow: "hidden",
        width: "100%",
        padding: "12px 16px",
        borderRadius: 0,
        backgroundColor: bg,
        border: `2px solid ${INK}`,
        cursor: isDisabled ? "not-allowed" : "pointer",
        color: textColor,
        fontFamily: "inherit",
        opacity: disabled ? 0.45 : pending ? 0.7 : 1,
      }}
    >
      {shimmer && !isDisabled && (
        <motion.div
          aria-hidden="true"
          initial={{ x: "-130%" }}
          animate={{ x: "130%" }}
          transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity, repeatDelay: 3.4 }}
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.45) 50%, transparent 100%)",
            pointerEvents: "none",
          }}
        />
      )}
      <Group gap={10} justify="center" align="center" wrap="nowrap" style={{ position: "relative", zIndex: 1 }}>
        {icon}
        <Text
          fw={700}
          size="sm"
          c="currentColor"
          style={{ whiteSpace: "nowrap", letterSpacing: "0.04em", textTransform: "uppercase" }}
        >
          {pending ? "…" : label}
        </Text>
      </Group>
    </motion.button>
  );
}

/**
 * Malé čtvercové icon-only tlačítko (sdílet vedle Uložit). Halftone outline,
 * stejná výška jako SaveButton wide.
 */
function IconSquareButton({
  icon,
  ariaLabel,
  onClick,
}: {
  icon: React.ReactNode;
  ariaLabel: string;
  onClick?: () => void;
}) {
  const INK = "#1a1a1a";
  const CREAM = "#F4EFE3";
  const CARD = "#FBFAF6";
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = CREAM;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = CARD;
      }}
      style={{
        cursor: "pointer",
        background: CARD,
        color: INK,
        border: `2px solid ${INK}`,
        borderRadius: 0,
        padding: 10,
        width: 52,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "inherit",
        transition: "background-color 0.15s",
      }}
    >
      {icon}
    </motion.button>
  );
}

/**
 * Non-owner akce panel. Logika:
 *   - dostupné → jedno tlačítko "Zarezervovat" (s shimmer)
 *   - moje rezervace → rozdělí se na "Zrušit rezervaci" + "Koupit" (free: jen zrušit)
 *   - cizí rezervace → info "Inzerát si zarezervoval někdo jiný"
 *   - prodáno → "Zaplaceno" disabled (pokud kupující) nebo nic
 *
 * Layout animation: tlačítko se rozdělí na 2 přes Framer Motion layout.
 */
function NonOwnerActions({
  stav,
  isReservedByMe,
  isLoggedIn,
  isFree,
  paymentDone,
  buyerIsMe,
  pending,
  onReserveToggle,
  onBuy,
  saveSlot,
  onShare,
}: {
  stav: string;
  isReservedByMe: boolean;
  isLoggedIn: boolean;
  isFree: boolean;
  paymentDone: boolean;
  buyerIsMe: boolean;
  pending: boolean;
  onReserveToggle: () => void;
  onBuy: () => void;
  saveSlot: React.ReactNode;
  onShare: () => void;
}) {
  const isReserved = stav === "zarezervováno" || stav === "rezervováno";
  const isSold = stav === "prodáno";
  const isMineReserved = isReserved && isReservedByMe;

  // Co je hlavní akční řádek?
  let mainAction: React.ReactNode;
  if (paymentDone || buyerIsMe) {
    mainAction = (
      <motion.div
        key="paid"
        layout
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
      >
        <DarkButton icon={<Check size={16} />} label="Zaplaceno" disabled />
      </motion.div>
    );
  } else if (isMineReserved) {
    mainAction = (
      <motion.div
        key="split"
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ type: "spring", stiffness: 360, damping: 28 }}
        style={{ display: "grid", gridTemplateColumns: isFree ? "1fr" : "1fr 1fr", gap: 8 }}
      >
        <motion.div layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
          <DarkButton
            icon={<BookmarkX size={16} />}
            label="Zrušit rezervaci"
            onClick={onReserveToggle}
            pending={pending}
            disabled={!isLoggedIn}
          />
        </motion.div>
        {!isFree && (
          <motion.div
            layout
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 }}
          >
            <DarkButton
              icon={<ShoppingBag size={16} />}
              label="Koupit"
              variant="primary"
              onClick={onBuy}
              disabled={!isLoggedIn || isSold}
              shimmer
            />
          </motion.div>
        )}
      </motion.div>
    );
  } else if (isReserved && !isReservedByMe) {
    mainAction = (
      <motion.div
        key="taken"
        layout
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        style={{
          padding: "13px 14px",
          borderRadius: 0,
          background: "#FBFAF6",
          border: "2px dashed #1a1a1a",
          textAlign: "center",
        }}
      >
        <Text size="sm" fw={700} style={{ color: "#1a1a1a", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Inzerát si zarezervoval někdo jiný
        </Text>
      </motion.div>
    );
  } else if (isSold) {
    mainAction = <motion.div key="sold" layout style={{ display: "none" }} />;
  } else {
    // available
    mainAction = (
      <motion.div
        key="reserve"
        layout
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
      >
        <DarkButton
          icon={<Bookmark size={16} />}
          label="Zarezervovat"
          variant="primary"
          onClick={onReserveToggle}
          pending={pending}
          disabled={!isLoggedIn}
          shimmer
        />
      </motion.div>
    );
  }

  return (
    <Stack gap={8}>
      <AnimatePresence mode="popLayout" initial={false}>
        {mainAction}
      </AnimatePresence>
      <Group gap={8} wrap="nowrap" align="stretch">
        <div style={{ flex: 1, minWidth: 0 }}>{saveSlot}</div>
        <IconSquareButton icon={<Share2 size={18} />} ariaLabel="Sdílet" onClick={onShare} />
      </Group>
    </Stack>
  );
}

/**
 * Karta inzerenta — avatar + jméno + INZERENT label + e-mail + telefon
 * + tlačítko "Napsat e-mail" na celé šířce uvnitř.
 */
function InzerentCard({
  owner,
  telefon,
  showWriteButton,
  mailSubject,
}: {
  owner: Owner;
  telefon: string | null;
  showWriteButton: boolean;
  mailSubject: string;
}) {
  const mailto = `mailto:${owner.email}?subject=${encodeURIComponent(mailSubject)}`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      style={{
        padding: 16,
        borderRadius: 0,
        background: "#FBFAF6",
        border: "2px dotted #1a1a1a",
        boxShadow: "none",
      }}
    >
      <Stack gap={12}>
        <Group gap={12} wrap="nowrap" align="center">
          <Avatar src={owner.picture} name={owner.name} size={44} />
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Text c="#1a1a1a" size="sm" fw={700} truncate>
              {owner.name}
            </Text>
            <Text
              size="xs"
              fw={700}
              style={{
                letterSpacing: "0.1em",
                color: "#888780",
                textTransform: "uppercase",
                fontFamily: "var(--font-jb-mono), 'Courier New', ui-monospace, monospace",
              }}
            >
              INZERENT
            </Text>
          </Stack>
        </Group>

        <Stack gap={8}>
          <Group gap={8} wrap="nowrap" align="center">
            <Mail size={14} style={{ flexShrink: 0, color: "#888780" }} />
            <Text c="#1a1a1a" size="xs" fw={500} style={{ wordBreak: "break-all" }}>
              {owner.email}
            </Text>
          </Group>
          {telefon && (
            <Group gap={8} wrap="nowrap" align="center">
              <Phone size={14} style={{ flexShrink: 0, color: "#888780" }} />
              <Text c="#1a1a1a" size="xs" fw={500}>
                {formatPhone(telefon)}
              </Text>
            </Group>
          )}
        </Stack>

        {showWriteButton && (
          <a href={mailto} style={{ textDecoration: "none", display: "block" }}>
            <DarkButton icon={<Mail size={16} />} label="Napsat e-mail" variant="light" />
          </a>
        )}
      </Stack>
    </motion.div>
  );
}
