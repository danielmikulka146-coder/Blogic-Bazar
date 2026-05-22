"use client";

import { Badge, Grid, Group, Modal, Stack, Text, Title } from "@mantine/core";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { useFilterState } from "@/components/infrastructure/FilterStateProvider";
import { LiquidGlass } from "@/components/layout/LiquidGlass";
import { rezervujInzerat } from "./actions";
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
  qrPlatba: boolean;
};

const QR_ACCOUNT = "CZ6508000000192000145399";
const QR_VS = "00000";

function buildSpdString(cena: number, id: number) {
  const am = cena.toFixed(2);
  const msg = `Platba za inzerat ${id}`;
  return `SPD*1.0*ACC:${QR_ACCOUNT}*AM:${am}*CC:CZK*MSG:${msg}*X-VS:${QR_VS}`;
}

function stavColor(stav: string) {
  if (stav === "dostupné") return "green";
  if (stav === "prodáno") return "red";
  return "orange";
}

function RezervujButton({ onClick, pending }: { onClick: () => void; pending: boolean }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={pending}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: pending ? 0.65 : 1, y: 0 }}
      whileHover={pending ? undefined : { scale: 1.03 }}
      whileTap={pending ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 380, damping: 24 }}
      style={{
        border: "none",
        background: "transparent",
        cursor: pending ? "not-allowed" : "pointer",
        padding: 0,
        display: "block",
        width: "100%",
        position: "relative",
        overflow: "hidden",
        borderRadius: 12,
      }}
    >
      <LiquidGlass
        radius={12}
        glassThickness={60}
        bezelWidth={20}
        refractiveIndex={1.5}
        scaleRatio={0.7}
        blur={1.0}
        specularSaturation={4}
        specularOpacity={0.7}
        tintColor="253, 126, 20"
        tintOpacity={0.22}
        innerShadowBlur={10}
        innerShadowSpread={-3}
        outerShadowBlur={20}
        fallbackBlur={16}
        style={{ padding: "12px 0", textAlign: "center", position: "relative", overflow: "hidden" }}
      >
        {/* Subtle shimmer — periodicky projede přes tlačítko, ať na sebe upoutá pozornost */}
        {!pending && (
          <motion.div
            aria-hidden="true"
            initial={{ x: "-130%" }}
            animate={{ x: "130%" }}
            transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity, repeatDelay: 3.2 }}
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.28) 50%, transparent 100%)",
              pointerEvents: "none",
              zIndex: 10,
            }}
          />
        )}
        <Text
          fw={600}
          c="var(--mantine-color-text)"
          size="sm"
          style={{ whiteSpace: "nowrap", position: "relative", zIndex: 1 }}
        >
          {pending ? "Rezervuji…" : "Zarezervovat"}
        </Text>
      </LiquidGlass>
    </motion.button>
  );
}

function ZobrazitQrButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: "none",
        background: "transparent",
        cursor: "pointer",
        padding: 0,
        display: "block",
        width: "100%",
      }}
    >
      <LiquidGlass
        radius={12}
        glassThickness={60}
        bezelWidth={20}
        refractiveIndex={1.5}
        scaleRatio={0.7}
        blur={1.0}
        specularSaturation={4}
        specularOpacity={0.7}
        tintColor="100, 180, 255"
        tintOpacity={0.18}
        innerShadowBlur={10}
        innerShadowSpread={-3}
        outerShadowBlur={20}
        fallbackBlur={16}
        style={{ padding: "12px 0", textAlign: "center" }}
      >
        <Text fw={600} c="var(--mantine-color-text)" size="sm" style={{ whiteSpace: "nowrap" }}>
          Zobrazit QR platbu
        </Text>
      </LiquidGlass>
    </button>
  );
}

function HeaderRightSlot({
  cenaText,
  stav,
  onRezervovat,
  pending,
}: {
  cenaText: string;
  stav: string;
  onRezervovat: () => void;
  pending: boolean;
}) {
  const canReserve = stav === "dostupné";

  return (
    <LiquidGlass
      radius="pill"
      glassThickness={80}
      bezelWidth={60}
      refractiveIndex={1.5}
      scaleRatio={0.7}
      blur={1.0}
      specularSaturation={4}
      specularOpacity={0.75}
      tintColor="253, 126, 20"
      tintOpacity={canReserve ? 0.1 : 1.0}
      innerShadowBlur={10}
      innerShadowSpread={-4}
      outerShadowBlur={28}
      fallbackBlur={18}
      style={{ padding: "7px 8px", overflow: "hidden" }}
    >
      {/* Shimmer — projede jednou po přechodu do reserved */}
      <AnimatePresence initial={false}>
        {!canReserve && (
          <motion.div
            key="shimmer"
            initial={{ x: "-130%" }}
            animate={{ x: "130%" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: "easeOut", delay: 0.1 }}
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.32) 50%, transparent 100%)",
              pointerEvents: "none",
              zIndex: 10,
            }}
          />
        )}
      </AnimatePresence>

      <Group gap={6} align="center" wrap="nowrap" style={{ height: 34 }}>
        <Text size="sm" fw={700} c="var(--mantine-color-text)" style={{ paddingLeft: 8, whiteSpace: "nowrap" }}>
          {cenaText}
        </Text>

        {/* Animovaný swap obsahu: button ↔ status text */}
        <AnimatePresence mode="wait" initial={false}>
          {canReserve ? (
            <motion.button
              key="btn"
              type="button"
              onClick={onRezervovat}
              disabled={pending}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: pending ? 0.6 : 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.16 }}
              style={{
                border: "none",
                background: "rgba(253, 126, 20, 0.28)",
                cursor: pending ? "not-allowed" : "pointer",
                padding: "4px 14px",
                borderRadius: 999,
                color: "var(--mantine-color-text)",
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: "nowrap",
                fontFamily: "inherit",
              }}
            >
              {pending ? "Rezervuji…" : "Zarezervovat"}
            </motion.button>
          ) : (
            <motion.span
              key="status"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.16 }}
              style={{
                padding: "4px 14px",
                borderRadius: 999,
                background: "rgba(255, 255, 255, 0.22)",
                color: "var(--mantine-color-text)",
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: "nowrap",
                display: "inline-block",
              }}
            >
              {stav}
            </motion.span>
          )}
        </AnimatePresence>
      </Group>
    </LiquidGlass>
  );
}

export function InzeratDetailClient({ inzerat, fotky }: { inzerat: InzeratData; fotky: string[] }) {
  const [stav, setStav] = useState(inzerat.stav);
  const [pending, setPending] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const { setHeaderSlotRight, setHeaderSlotRightActive } = useFilterState();
  const actionRef = useRef<HTMLDivElement>(null);
  const [actionVisible, setActionVisible] = useState(true);

  const canShowQr = inzerat.qrPlatba && !inzerat.free && inzerat.cena != null && inzerat.cena > 0;

  const cenaText = inzerat.free ? "Zdarma" : `${inzerat.cena?.toLocaleString("cs-CZ")} Kč`;

  const pendingRef = useRef(false);
  const handleRezervovat = useCallback(async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setStav("zarezervováno");
    try {
      await rezervujInzerat(inzerat.id);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, [inzerat.id]);

  // Scroll detection
  useEffect(() => {
    const el = actionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setActionVisible(entry.isIntersecting), {
      threshold: 0,
      rootMargin: "-80px 0px 0px 0px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Right slot je vždy zaregistrovaný v contextu (kvůli stability cache),
  // headerSlotRightActive řídí animaci hlavní pilulky mezi centrem a off-center.
  useEffect(() => {
    setHeaderSlotRight(
      <HeaderRightSlot cenaText={cenaText} stav={stav} onRezervovat={handleRezervovat} pending={pending} />,
    );
  }, [stav, cenaText, pending, handleRezervovat, setHeaderSlotRight]);

  // Slot je "aktivní" když uživatel scrollne přes akční sekci → hlavní pilulka se posune off-center
  useEffect(() => {
    setHeaderSlotRightActive(!actionVisible);
  }, [actionVisible, setHeaderSlotRightActive]);

  // Cleanup při navigaci pryč
  useEffect(
    () => () => {
      setHeaderSlotRight(null);
      setHeaderSlotRightActive(false);
    },
    [setHeaderSlotRight, setHeaderSlotRightActive],
  );

  return (
    <Stack gap="xl" maw={900} mx="auto">
      {/* Galerie 3/4, info 1/4 */}
      <Grid gutter="lg" style={{ alignItems: "start" }}>
        <Grid.Col span={{ base: 12, sm: 9 }}>
          <FotoGalerie fotky={fotky} nazev={inzerat.nazev} />
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 3 }}>
          <div ref={actionRef}>
            <Stack gap="md">
              <Group justify="space-between" align="center">
                <Badge color="blue" variant="light">
                  {inzerat.kategorie}
                </Badge>
                <Badge color={stavColor(stav)} variant="light">
                  {stav}
                </Badge>
              </Group>

              <Title order={2} c="var(--mantine-color-text)" size="h4">
                {inzerat.nazev}
              </Title>

              <Text c="var(--mantine-color-text)" fw={700} size="lg">
                {cenaText}
              </Text>

              {stav === "dostupné" && <RezervujButton onClick={handleRezervovat} pending={pending} />}

              {canShowQr && <ZobrazitQrButton onClick={() => setQrOpen(true)} />}

              <Stack gap={4}>
                <Text c="dimmed" size="xs" tt="uppercase" fw={600}>
                  Kontakt
                </Text>
                <Text c="var(--mantine-color-text)" size="sm">
                  {inzerat.kontakt}
                </Text>
              </Stack>
            </Stack>
          </div>
        </Grid.Col>
      </Grid>

      {/* Popis pod oběma sloupci */}
      <Stack gap={4}>
        <Text c="dimmed" size="sm" tt="uppercase" fw={600}>
          Popis
        </Text>
        <Text c="var(--mantine-color-text)" style={{ whiteSpace: "pre-wrap" }}>
          {inzerat.popis}
        </Text>
      </Stack>

      {canShowQr && (
        <Modal
          opened={qrOpen}
          onClose={() => setQrOpen(false)}
          centered
          withCloseButton={false}
          padding={0}
          size="auto"
          radius="lg"
          overlayProps={{ backgroundOpacity: 0.55, blur: 8 }}
          styles={{ content: { background: "transparent", boxShadow: "none" } }}
        >
          <Stack gap="md" align="center" p="lg">
            <div
              style={{
                background: "white",
                padding: 24,
                borderRadius: 20,
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
              }}
            >
              <QRCode value={buildSpdString(inzerat.cena as number, inzerat.id)} size={320} />
            </div>
            <Stack gap={2} align="center">
              <Text c="white" size="sm" fw={600}>
                {cenaText} · Naskenujte v bankovní aplikaci
              </Text>
              <Text c="rgba(255,255,255,0.7)" size="xs">
                Účet: {QR_ACCOUNT} · VS: {QR_VS}
              </Text>
            </Stack>
          </Stack>
        </Modal>
      )}
    </Stack>
  );
}
