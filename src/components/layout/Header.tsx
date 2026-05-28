"use client";

import { Box, Burger, Divider, Drawer, Group, ScrollArea } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Home } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { BlogicLogoHalftone } from "@/components/BlogicLogoHalftone";
import { useAuth } from "@/components/infrastructure/AuthProvider";
import { useFilterState } from "@/components/infrastructure/FilterStateProvider";
import { AuthMobileMenu, AuthPill } from "@/components/layout/AuthPill";
import { SearchBar } from "@/components/layout/SearchBar";
import { Link, usePathname } from "@/i18n/navigation";

const PUBLIC_LINKS = [{ link: "/inzeraty", label: "Inzeráty" }] as const;
const AUTHED_LINKS = [{ link: "/novy-inzerat", label: "Přidat inzerát" }] as const;

const SEARCH_ROUTES = ["/inzeraty"];

const INK = "#1a1a1a";
const ORANGE = "#FF5722";
const CREAM = "#F4EFE3";
const MONO_STACK = "var(--font-jb-mono), 'Courier New', ui-monospace, monospace";

const CAT_SITTING = [
  "  /^--^\\     /^--^\\     /^--^\\",
  "  \\____/     \\____/     \\____/",
  " /      \\   /      \\   /      \\",
  "|        | |        | |        |",
  " \\__  __/   \\__  __/   \\__  __/",
  "    \\ \\       / /         \\ \\",
  "     \\ \\     / /           \\ \\",
  "    / /      \\ \\           / /",
  "    \\/        \\/           \\/",
].join("\n");

export function HeaderSearch() {
  const [opened, { toggle, close }] = useDisclosure(false);
  const { headerSlot, headerSlotActive, headerSlotRight, headerSlotRightActive } = useFilterState();
  const showSlot = headerSlot !== null && headerSlotActive;
  const showSlotRight = headerSlotRight !== null && headerSlotRightActive;
  const { user } = useAuth();
  const pathname = usePathname();
  const hideSearch = !SEARCH_ROUTES.includes(pathname);

  const links = user ? [...PUBLIC_LINKS, ...AUTHED_LINKS] : [...PUBLIC_LINKS];

  const headerItems = links.map((link) => {
    const isActive = pathname === link.link || pathname.startsWith(`${link.link}/`);
    return (
      <Link
        key={link.label}
        href={link.link}
        style={{
          textDecoration: "none",
          padding: "0 10px",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          color: isActive ? ORANGE : INK,
          transition: "color 0.15s",
          fontFamily: MONO_STACK,
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.color = ORANGE;
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.color = INK;
        }}
      >
        {link.label}
      </Link>
    );
  });

  const drawerItems = links.map((link) => (
    <Link
      key={link.label}
      href={link.link}
      style={{
        textDecoration: "none",
        padding: "8px 10px",
        fontSize: 14,
        fontWeight: 600,
        whiteSpace: "nowrap",
        display: "block",
        color: INK,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        fontFamily: MONO_STACK,
      }}
    >
      {link.label}
    </Link>
  ));

  return (
    <>
      {/* Flat full-width bar — cream pruh s dotted spodním borderem. */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 72,
          zIndex: 1000,
          background: CREAM,
          borderBottom: `2px dotted ${INK}`,
        }}
      >
        <Box
          visibleFrom="md"
          aria-hidden
          style={{
            position: "absolute",
            bottom: -40,
            right: 420,
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          <pre
            style={{
              margin: 0,
              fontFamily: MONO_STACK,
              fontSize: 9,
              lineHeight: "10px",
              color: INK,
              whiteSpace: "pre",
              userSelect: "none",
            }}
          >
            {CAT_SITTING}
          </pre>
        </Box>
        <div
          style={{
            width: "100%",
            height: "100%",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <Group h="100%" align="center" justify="space-between" wrap="nowrap" gap="md" style={{ width: "100%" }}>
            {/* Levá část — Home + logo */}
            <Group gap="sm" wrap="nowrap" style={{ flex: "0 0 auto" }}>
              <Link
                href="/"
                aria-label="Domů"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  color: INK,
                  border: `2px solid ${INK}`,
                  background: "transparent",
                  textDecoration: "none",
                }}
              >
                <Home size={18} />
              </Link>
              <Box visibleFrom="sm" style={{ whiteSpace: "nowrap", display: "inline-block" }}>
                <BlogicLogoHalftone size={38} />
              </Box>
            </Group>

            {/* Střed — CompactFilterBar (vlevo) + search + slotRight (cena+rezervace
                pilulka na detailu). Detail page má searchbar skrytý, takže pilulka
                přirozeně sedí v centru. */}
            <Box
              visibleFrom="sm"
              style={{
                flex: 1,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 10,
                minWidth: 0,
              }}
            >
              <AnimatePresence initial={false}>
                {showSlot && (
                  <motion.div
                    key="slot"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.18 }}
                    style={{ display: "inline-flex" }}
                  >
                    {headerSlot}
                  </motion.div>
                )}
              </AnimatePresence>
              {!hideSearch && (
                <div style={{ width: "100%", maxWidth: 360 }}>
                  <SearchBar />
                </div>
              )}
              <AnimatePresence initial={false}>
                {showSlotRight && (
                  <motion.div
                    key="slot-right-center"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    style={{ display: "inline-flex" }}
                  >
                    {headerSlotRight}
                  </motion.div>
                )}
              </AnimatePresence>
            </Box>

            {/* Pravá část — nav + auth + burger */}
            <Group gap={8} wrap="nowrap" style={{ flex: "0 0 auto" }}>
              <Group gap={0} visibleFrom="sm">
                {headerItems}
              </Group>
              <div className="auth-pill-desktop">
                <AuthPill />
              </div>
              <Burger
                opened={opened}
                onClick={toggle}
                size="sm"
                hiddenFrom="sm"
                aria-label="Otevřít menu"
                color={INK}
              />
            </Group>
          </Group>
        </div>
      </div>

      {/* Mobilní menu */}
      <Drawer
        opened={opened}
        onClose={close}
        size="100%"
        padding="md"
        title="Navigace"
        hiddenFrom="sm"
        zIndex={1000000}
      >
        <ScrollArea h="calc(100vh - 80px)" mx="-md">
          <Divider my="sm" />
          {!hideSearch && (
            <>
              <SearchBar />
              <Divider my="sm" />
            </>
          )}
          {drawerItems}
          <Divider my="sm" />
          <AuthMobileMenu onNavigate={close} />
        </ScrollArea>
      </Drawer>
    </>
  );
}
