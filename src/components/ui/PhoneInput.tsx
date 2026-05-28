"use client";

import { ChevronDown, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  defaultPhoneCountry,
  findCountryByCode,
  flagSrcSet,
  flagUrl,
  formatPhoneDigits,
  PHONE_COUNTRIES,
  type PhoneCountry,
} from "@/lib/phoneCountries";

const INK = "#1a1a1a";
const CARD = "#FBFAF6";
const CREAM = "#F4EFE3";
const MUTED = "#888780";
const ORANGE = "#FF5722";
const MONO_STACK = "var(--font-jb-mono), 'Courier New', ui-monospace, monospace";

type Props = {
  /** Aktuální prefix (např. "+420"). Pokud null/undefined, použije se locale default. */
  prefix: string | null;
  /** Aktuální telefon (s formátováním "xxx xxx xxx" nebo bez). */
  value: string;
  onPrefixChange: (prefix: string) => void;
  onValueChange: (value: string) => void;
  /** ISO kód země pro výchozí stav (např. "cz") — používá se když prefix není známý. */
  defaultCountryCode?: string;
  placeholder?: string;
  error?: string | null;
};

export function PhoneInput({
  prefix,
  value,
  onPrefixChange,
  onValueChange,
  defaultCountryCode,
  placeholder = "123 456 789",
  error,
}: Props) {
  // Lazy initializer — spočítá počáteční zemi jednou při mountu. Preferujeme
  // existující `prefix` (např. auto-fill z profilu), pak `defaultCountryCode`
  // (z locale), nakonec hard-fallback na Česko.
  const [selectedCountry, setSelectedCountry] = useState<PhoneCountry>(
    () =>
      PHONE_COUNTRIES.find((c) => c.prefix === prefix) ??
      findCountryByCode(defaultCountryCode) ??
      defaultPhoneCountry("cs"),
  );
  useEffect(() => {
    if (prefix && prefix !== selectedCountry.prefix) {
      const match = PHONE_COUNTRIES.find((c) => c.prefix === prefix);
      if (match) setSelectedCountry(match);
    }
  }, [prefix, selectedCountry.prefix]);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
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
  }, [open]);

  useEffect(() => {
    if (open) {
      setSearch("");
      // Auto-focus searchbar po otevření.
      window.setTimeout(() => searchInputRef.current?.focus(), 20);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/\s/g, "");
    if (!q) return PHONE_COUNTRIES;
    return PHONE_COUNTRIES.filter((c) => {
      if (c.name.toLowerCase().includes(q)) return true;
      if (c.code.includes(q)) return true;
      // Prefix lze hledat se "+" i bez ("420" matchne "+420").
      const prefDigits = c.prefix.replace(/\D/g, "");
      const qDigits = q.replace(/\D/g, "");
      if (qDigits && prefDigits.includes(qDigits)) return true;
      return false;
    });
  }, [search]);

  function selectCountry(c: PhoneCountry) {
    setSelectedCountry(c);
    onPrefixChange(c.prefix);
    setOpen(false);
  }

  function handleNumberChange(raw: string) {
    // Drž jen číslice + mezery. Zformátuj jako "xxx xxx xxx".
    onValueChange(formatPhoneDigits(raw));
  }

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: 0,
          border: `2px dotted ${error ? ORANGE : INK}`,
          background: CARD,
          height: 36,
        }}
      >
        {/* Flag + prefix tlačítko */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Vybrat předvolbu"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "0 10px",
            background: open ? CREAM : "transparent",
            border: "none",
            borderRight: `2px dotted ${INK}`,
            cursor: "pointer",
            color: INK,
            fontFamily: MONO_STACK,
            fontSize: 13,
            whiteSpace: "nowrap",
            transition: "background-color 0.15s",
          }}
        >
          {/** biome-ignore lint/performance/noImgElement: flagcdn dodává malé PNG, next/image by vyžadovalo whitelist domény */}
          <img
            src={flagUrl(selectedCountry.code, 20)}
            srcSet={flagSrcSet(selectedCountry.code, 20)}
            width={20}
            height={15}
            alt=""
            aria-hidden
            style={{ display: "block", marginTop: -2, flexShrink: 0 }}
          />
          <span style={{ fontWeight: 600, marginTop: -2 }}>{selectedCountry.prefix}</span>
          <ChevronDown
            size={12}
            style={{
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
              color: MUTED,
            }}
          />
        </button>
        {/* Telefonní číslo */}
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={value}
          placeholder={placeholder}
          onChange={(e) => handleNumberChange(e.currentTarget.value)}
          style={{
            flex: 1,
            minWidth: 0,
            border: "none",
            outline: "none",
            background: "transparent",
            padding: "0 12px",
            fontFamily: MONO_STACK,
            color: INK,
            fontSize: 14,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "0.02em",
          }}
        />
      </div>

      {error && (
        <div
          style={{
            marginTop: 4,
            fontSize: 11,
            color: ORANGE,
            fontFamily: MONO_STACK,
          }}
        >
          {error}
        </div>
      )}

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              width: 320,
              maxWidth: "100%",
              background: CARD,
              border: `2px solid ${INK}`,
              borderRadius: 0,
              zIndex: 200,
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              display: "flex",
              flexDirection: "column",
              maxHeight: 320,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderBottom: `2px dotted ${INK}`,
              }}
            >
              <Search size={14} color={MUTED} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Hledat zemi nebo +420…"
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontFamily: MONO_STACK,
                  fontSize: 13,
                  color: INK,
                  minWidth: 0,
                }}
              />
            </div>
            <div style={{ overflowY: "auto", maxHeight: 260 }}>
              {filtered.length === 0 ? (
                <div
                  style={{
                    padding: "16px 12px",
                    fontFamily: MONO_STACK,
                    fontSize: 12,
                    color: MUTED,
                    textAlign: "center",
                  }}
                >
                  Žádná země nenalezena
                </div>
              ) : (
                filtered.map((c) => {
                  const isSelected = c.code === selectedCountry.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => selectCountry(c)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = CREAM;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isSelected ? CREAM : "transparent";
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        padding: "8px 12px",
                        background: isSelected ? CREAM : "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: INK,
                        fontFamily: MONO_STACK,
                        fontSize: 13,
                        textAlign: "left",
                      }}
                    >
                      {/** biome-ignore lint/performance/noImgElement: flagcdn small PNG */}
                      <img
                        src={flagUrl(c.code, 20)}
                        srcSet={flagSrcSet(c.code, 20)}
                        width={20}
                        height={15}
                        alt=""
                        aria-hidden
                        style={{ display: "block", marginTop: -2, flexShrink: 0 }}
                      />
                      <span style={{ flex: 1, fontWeight: isSelected ? 700 : 500, marginTop: -2 }}>{c.name}</span>
                      <span style={{ color: MUTED, fontVariantNumeric: "tabular-nums", marginTop: -2 }}>
                        {c.prefix}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
