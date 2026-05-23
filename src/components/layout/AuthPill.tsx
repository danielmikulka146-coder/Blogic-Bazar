"use client";

import { Text } from "@mantine/core";
import { Bookmark, LogIn, LogOut, Package } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/components/infrastructure/AuthProvider";
import { LiquidGlass } from "@/components/layout/LiquidGlass";
import { Link, useRouter } from "@/i18n/navigation";

type GoogleButtonConfig = {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "small" | "medium" | "large";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  width?: number;
  locale?: string;
};

type GoogleAccountsId = {
  initialize: (config: {
    client_id: string;
    callback: (resp: { credential?: string }) => void;
    ux_mode?: "popup";
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    use_fedcm_for_prompt?: boolean;
  }) => void;
  renderButton: (parent: HTMLElement, options: GoogleButtonConfig) => void;
  prompt: (cb?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
};

function getGoogleAccountsId(): GoogleAccountsId | null {
  const g = (window as unknown as { google?: { accounts?: { id?: GoogleAccountsId } } }).google;
  return g?.accounts?.id ?? null;
}

const PANEL_GAP = 24;

/**
 * Přihlašovací pilulka — Liquid Glass tlačítko s panel/menu vykresleným přes
 * createPortal na document.body. Důvod: AuthPill je uvnitř header LiquidGlassu,
 * a nested backdrop-filter:url() nedává správný výsledek — vnitřní glass sampluje
 * výstup vnějšího, ne stránku za ním. Portal to obchází tím, že panel uniká
 * z header stacking contextu úplně.
 */
export function AuthPill() {
  const { user, signInWithCredential, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);

  const triggerRef = useRef<HTMLDivElement>(null);
  const signInPanelRef = useRef<HTMLDivElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const googleButtonHostRef = useRef<HTMLDivElement>(null);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const initializedRef = useRef(false);

  useEffect(() => setMounted(true), []);

  // Inicializace GSI client jakmile je skript dostupný.
  useEffect(() => {
    if (!clientId || initializedRef.current) return;
    let cancelled = false;
    const tryInit = () => {
      if (cancelled) return;
      const accountsId = getGoogleAccountsId();
      if (!accountsId) {
        window.setTimeout(tryInit, 200);
        return;
      }
      accountsId.initialize({
        client_id: clientId,
        callback: async (resp) => {
          if (!resp?.credential) return;
          try {
            await signInWithCredential(resp.credential);
            setError(null);
            setSignInOpen(false);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Přihlášení selhalo");
          }
        },
        ux_mode: "popup",
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: false,
      });
      initializedRef.current = true;
    };
    tryInit();
    return () => {
      cancelled = true;
    };
  }, [clientId, signInWithCredential]);

  // Sledování pozice triggeru — když je menu/panel otevřený a uživatel scrolluje
  // nebo resize, panel se musí přepočítat.
  useEffect(() => {
    if (!signInOpen && !open) return;
    const update = () => {
      if (!triggerRef.current) return;
      setTriggerRect(triggerRef.current.getBoundingClientRect());
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [signInOpen, open]);

  // Render oficiálního Google tlačítka uvnitř panelu jakmile se panel mountne.
  useEffect(() => {
    if (!signInOpen || !googleButtonHostRef.current) return;
    const accountsId = getGoogleAccountsId();
    if (!accountsId) {
      setError("Google sign-in se ještě nenačetl, zkus to za chvíli znovu");
      return;
    }
    googleButtonHostRef.current.innerHTML = "";
    accountsId.renderButton(googleButtonHostRef.current, {
      type: "standard",
      theme: "filled_black",
      size: "large",
      text: "signin_with",
      shape: "pill",
      logo_alignment: "left",
      width: 240,
      locale: "cs",
    });
  }, [signInOpen]);

  // Click outside / Escape — fungují pro portal i pro trigger.
  useEffect(() => {
    if (!open && !signInOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (signInPanelRef.current?.contains(target)) return;
      if (menuPanelRef.current?.contains(target)) return;
      setOpen(false);
      setSignInOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setSignInOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, signInOpen]);

  const handleSignInClick = useCallback(() => {
    if (!clientId) {
      setError("Chybí NEXT_PUBLIC_GOOGLE_CLIENT_ID v .env.local");
      return;
    }
    setError(null);

    if (signInOpen) {
      setSignInOpen(false);
      return;
    }

    const accountsId = getGoogleAccountsId();
    if (!accountsId) {
      setError("Google sign-in se ještě nenačetl, zkus to za chvíli znovu");
      return;
    }

    // 1) One Tap prompt → 2) fallback panel s renderButton.
    let resolved = false;
    const openPanel = () => {
      if (resolved) return;
      resolved = true;
      setSignInOpen(true);
    };
    try {
      accountsId.prompt((notification) => {
        if (resolved) return;
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          openPanel();
        } else {
          resolved = true;
        }
      });
    } catch {
      openPanel();
      return;
    }
    window.setTimeout(openPanel, 700);
  }, [clientId, signInOpen]);

  // Pozice panelu (fixed) — pod triggerem zarovnaný napravo.
  const panelStyle: React.CSSProperties =
    triggerRect != null
      ? {
          position: "fixed",
          top: triggerRect.bottom + PANEL_GAP,
          right: Math.max(8, window.innerWidth - triggerRect.right),
          zIndex: 1100,
          transformOrigin: "top right",
        }
      : { position: "fixed", top: -9999, left: -9999, zIndex: 1100 };

  const signInPanel =
    mounted &&
    createPortal(
      <AnimatePresence>
        {signInOpen && triggerRect && (
          <motion.div
            ref={signInPanelRef}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            style={panelStyle}
          >
            <LiquidGlass
              radius={20}
              glassThickness={70}
              bezelWidth={30}
              refractiveIndex={1.5}
              scaleRatio={0.7}
              blur={1.0}
              specularSaturation={4}
              specularOpacity={0.6}
              tintColor="0, 0, 0"
              tintOpacity={0.08}
              innerShadowBlur={16}
              innerShadowSpread={-4}
              outerShadowBlur={32}
              fallbackBlur={22}
              style={{ padding: 22 }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, minWidth: 280 }}>
                <Text size="xs" c="var(--mantine-color-text)" ta="center" fw={500} style={{ opacity: 0.85 }}>
                  Přihlas se přes Google účet
                </Text>
                <div
                  ref={googleButtonHostRef}
                  style={{
                    minHeight: 44,
                    borderRadius: 999,
                    overflow: "hidden",
                  }}
                />
                {error && (
                  <Text size="xs" c="red" ta="center" style={{ maxWidth: 240 }}>
                    {error}
                  </Text>
                )}
              </div>
            </LiquidGlass>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    );

  const menuPanel =
    mounted &&
    createPortal(
      <AnimatePresence>
        {open && triggerRect && user && (
          <motion.div
            ref={menuPanelRef}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            style={{ ...panelStyle, minWidth: 240 }}
          >
            <LiquidGlass
              radius={16}
              glassThickness={60}
              bezelWidth={24}
              refractiveIndex={1.5}
              scaleRatio={0.7}
              blur={1.0}
              specularSaturation={4}
              specularOpacity={0.6}
              tintColor="0, 0, 0"
              tintOpacity={0.08}
              innerShadowBlur={14}
              innerShadowSpread={-4}
              outerShadowBlur={28}
              fallbackBlur={20}
              style={{ padding: 6 }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "10px 12px 8px" }}>
                  <Text size="xs" c="dimmed" style={{ lineHeight: 1.1 }}>
                    Přihlášený jako
                  </Text>
                  <Text size="sm" c="var(--mantine-color-text)" fw={600} truncate>
                    {user.email}
                  </Text>
                </div>
                <Divider />
                <MenuItem
                  icon={<Package size={15} />}
                  label="Moje inzeráty"
                  onClick={() => {
                    setOpen(false);
                    router.push("/profil/moje-inzeraty");
                  }}
                />
                <MenuItem
                  icon={<Bookmark size={15} />}
                  label="Uložené inzeráty"
                  onClick={() => {
                    setOpen(false);
                    router.push("/profil/ulozene-inzeraty");
                  }}
                />
                <Divider />
                <MenuItem
                  icon={<LogOut size={15} />}
                  label="Odhlásit"
                  onClick={async () => {
                    setOpen(false);
                    await signOut();
                  }}
                />
              </div>
            </LiquidGlass>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    );

  if (!user) {
    return (
      <div ref={triggerRef} style={{ position: "relative", display: "inline-block" }}>
        <button
          type="button"
          onClick={handleSignInClick}
          aria-label="Přihlásit se přes Google"
          aria-expanded={signInOpen}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: 0,
            display: "block",
          }}
        >
          <LiquidGlass
            radius="pill"
            glassThickness={50}
            bezelWidth={16}
            refractiveIndex={1.5}
            scaleRatio={0.7}
            blur={1.0}
            specularSaturation={4}
            specularOpacity={0.5}
            tintColor="253, 126, 20"
            tintOpacity={0.08}
            innerShadowBlur={10}
            innerShadowSpread={-3}
            outerShadowBlur={20}
            fallbackBlur={16}
            style={{ padding: "8px 16px" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "var(--mantine-color-text)",
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              <LogIn size={14} />
              <span>Přihlásit</span>
            </div>
          </LiquidGlass>
        </button>

        {signInPanel}

        {error && !signInOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              background: "rgba(0,0,0,0.85)",
              padding: "6px 10px",
              borderRadius: 8,
              fontSize: 11,
              color: "white",
              whiteSpace: "nowrap",
              maxWidth: 260,
            }}
          >
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={triggerRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Účet"
        aria-expanded={open}
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
          padding: 0,
          display: "block",
        }}
      >
        <LiquidGlass
          radius="pill"
          glassThickness={60}
          bezelWidth={20}
          refractiveIndex={1.5}
          scaleRatio={0.7}
          blur={1.0}
          specularSaturation={4}
          specularOpacity={0.7}
          tintColor="253, 126, 20"
          tintOpacity={0.08}
          innerShadowBlur={10}
          innerShadowSpread={-3}
          outerShadowBlur={20}
          fallbackBlur={16}
          style={{ padding: "4px 14px 4px 4px" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "var(--mantine-color-text)",
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            <Avatar src={user.picture} name={user.name} size={26} />
            <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>
              {user.name.split(" ")[0]}
            </span>
          </div>
        </LiquidGlass>
      </button>

      {menuPanel}
    </div>
  );
}

export function Avatar({ src, name, size = 26 }: { src: string | null; name: string; size?: number }) {
  const [error, setError] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  if (src && !error) {
    return (
      // biome-ignore lint/performance/noImgElement: external Google profile picture
      <img
        src={src}
        alt={name}
        onError={() => setError(true)}
        referrerPolicy="no-referrer"
        width={size}
        height={size}
        style={{ borderRadius: "50%", display: "block", objectFit: "cover" }}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "rgba(253, 126, 20, 0.32)",
        color: "var(--mantine-color-text)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.max(10, Math.round(size * 0.46)),
        fontWeight: 700,
      }}
    >
      {initial}
    </div>
  );
}

function Divider() {
  return (
    <div
      aria-hidden="true"
      style={{
        height: 1,
        margin: "2px 8px",
        background: "var(--glass-separator, rgba(255,255,255,0.12))",
        pointerEvents: "none",
      }}
    />
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "100%",
        padding: "8px 12px",
        cursor: "pointer",
        background: hover ? "var(--glass-hover-bg, rgba(255,255,255,0.08))" : "transparent",
        transition: "background-color 0.12s",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 14,
        color: "var(--mantine-color-text)",
        border: "none",
        textAlign: "left",
        fontFamily: "inherit",
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function AuthMobileMenu({ onNavigate }: { onNavigate: () => void }) {
  const { user, signOut } = useAuth();
  const router = useRouter();

  if (!user) {
    return (
      <Link
        href="/"
        onClick={(e) => {
          e.preventDefault();
          onNavigate();
          const btn = document.querySelector<HTMLButtonElement>('button[aria-label="Přihlásit se přes Google"]');
          btn?.click();
        }}
        style={{
          textDecoration: "none",
          padding: "8px 10px",
          fontSize: 14,
          fontWeight: 500,
          color: "var(--mantine-color-text)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <LogIn size={16} /> Přihlásit
      </Link>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "10px 10px", display: "flex", gap: 10, alignItems: "center" }}>
        <Avatar src={user.picture} name={user.name} size={32} />
        <div style={{ minWidth: 0 }}>
          <Text size="sm" fw={600} truncate>
            {user.name}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {user.email}
          </Text>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          onNavigate();
          router.push("/profil/moje-inzeraty");
        }}
        style={mobileItemStyle}
      >
        <Package size={16} /> Moje inzeráty
      </button>
      <button
        type="button"
        onClick={() => {
          onNavigate();
          router.push("/profil/ulozene-inzeraty");
        }}
        style={mobileItemStyle}
      >
        <Bookmark size={16} /> Uložené inzeráty
      </button>
      <button
        type="button"
        onClick={async () => {
          onNavigate();
          await signOut();
        }}
        style={mobileItemStyle}
      >
        <LogOut size={16} /> Odhlásit
      </button>
    </div>
  );
}

const mobileItemStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  padding: "8px 10px",
  textAlign: "left",
  fontSize: 14,
  fontWeight: 500,
  color: "var(--mantine-color-text)",
  display: "flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
  fontFamily: "inherit",
};
