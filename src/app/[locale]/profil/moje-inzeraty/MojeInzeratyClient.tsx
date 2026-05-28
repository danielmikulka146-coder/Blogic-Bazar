// Client Component — zobrazí grid vlastních inzerátů s možností úpravy a mazání.
// Mazání se odehraje lokálně (animace zmizení) bez reload stránky.
"use client";

import { Group, Stack } from "@mantine/core";
import { Edit3, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { InzeratCard } from "@/app/[locale]/inzeraty/InzeratCard";
import { odstranitInzerat } from "@/app/[locale]/inzeraty/owner-actions";
import { Link } from "@/i18n/navigation";

const INK = "#1a1a1a";
const CARD = "#FBFAF6";
const CREAM = "#F4EFE3";
const ORANGE = "#FF5722";
const BURNT = "#4A1B0C";
const MONO_STACK = "var(--font-jb-mono), 'Courier New', ui-monospace, monospace";

type Row = {
  id: number;
  nazev: string;
  foto: string;
  kategorie: string;
  stav: string;
  stavZbozi: string | null;
  cena: number;
  free: boolean;
};

export function MojeInzeratyClient({ data }: { data: Row[] }) {
  const [items, setItems] = useState(data); // lokální kopie — odstraněné inzeráty zmizí z pole bez reload
  const [confirmId, setConfirmId] = useState<number | null>(null); // ID inzerátu čekající na potvrzení smazání
  const [pendingId, startTransition] = useTransition(); // true dokud server action běží
  const [busyId, setBusyId] = useState<number | null>(null); // ID inzerátu, který se právě maže

  const handleDelete = (id: number) => {
    setBusyId(id); // okamžitě označíme konkrétní inzerát jako "maže se" (deaktivuje tlačítka)
    startTransition(async () => {
      try {
        await odstranitInzerat(id); // server action — smaže z DB a disku
        // Po úspěšném smazání odebereme inzerát z lokálního stavu → AnimatePresence ho animuje ven.
        setItems((prev) => prev.filter((x) => x.id !== id));
      } finally {
        // finally = spustí se vždy (i při chybě) — vyčistíme stav ať dopadlo cokoli
        setBusyId(null);
        setConfirmId(null);
      }
    });
  };

  return (
    <AnimatePresence mode="popLayout">
      {items.map((item) => {
        const isConfirming = confirmId === item.id;
        const isDeleting = busyId === item.id && pendingId;
        return (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
          >
            <Stack gap={8}>
              <InzeratCard
                id={item.id}
                nazev={item.nazev}
                foto={item.foto}
                kategorie={item.kategorie}
                stav={item.stav}
                stavZbozi={item.stavZbozi}
                cena={item.cena}
                free={item.free}
              />
              {/* Dvoustupňové mazání — první klik zobrazí potvrzení, teprve druhý smaže.
                  Zabraňuje náhodným smazáním, zejména na mobilu kde je "Smazat" lehce odklepnutelné. */}
              <Group gap={6} wrap="nowrap" grow>
                {!isConfirming ? (
                  <>
                    <ActionButton
                      href={`/inzeraty/${item.id}/upravit`} // href místo onClick = přechod na stránku úpravy
                      icon={<Edit3 size={14} />}
                      label="Upravit"
                    />
                    <ActionButton
                      icon={<Trash2 size={14} />}
                      label="Smazat"
                      onClick={() => setConfirmId(item.id)} // první klik — jen zobrazí potvrzení
                      tint="danger"
                    />
                  </>
                ) : (
                  <>
                    <ActionButton
                      label="Zrušit"
                      onClick={() => setConfirmId(null)} // zruší potvrzovací mód
                      disabled={!!isDeleting}
                    />
                    <ActionButton
                      icon={<Trash2 size={14} />}
                      label={isDeleting ? "Mažu…" : "Opravdu smazat"}
                      onClick={() => handleDelete(item.id)} // druhý klik — skutečné smazání
                      tint="primary"
                      disabled={!!isDeleting}
                    />
                  </>
                )}
              </Group>
            </Stack>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}

type Tint = "default" | "danger" | "primary";

// Polymorfní tlačítko — renderuje se jako <Link> (navigace) nebo <button> (akce) podle toho, jestli dostane href.
// Sdílí stejný vizuální styl, takže "Upravit" a "Smazat" vypadají konzistentně.
function ActionButton({
  href,
  icon,
  label,
  onClick,
  disabled,
  tint = "default",
}: {
  href?: string;
  icon?: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  tint?: Tint;
}) {
  const bg = tint === "primary" ? ORANGE : CARD;
  const color = tint === "primary" ? BURNT : tint === "danger" ? ORANGE : INK; // danger = oranžový text (varování)
  const sharedStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "8px 10px",
    background: bg,
    color,
    border: `2px solid ${INK}`,
    borderRadius: 0,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: MONO_STACK,
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    textDecoration: "none",
    whiteSpace: "nowrap",
    opacity: disabled ? 0.6 : 1,
    transition: "background-color 0.15s",
    width: "100%",
  };
  const hoverHandlers = {
    onMouseEnter: (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
      if (disabled || tint === "primary") return;
      e.currentTarget.style.background = CREAM;
    },
    onMouseLeave: (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
      if (disabled || tint === "primary") return;
      e.currentTarget.style.background = bg;
    },
  };

  // Pokud má href, renderujeme jako Next.js Link — správné SEO, prefetching, router navigace.
  if (href) {
    return (
      <Link href={href} style={sharedStyle} {...hoverHandlers}>
        {icon}
        <span>{label}</span>
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={sharedStyle} {...hoverHandlers}>
      {icon}
      <span>{label}</span>
    </button>
  );
}
