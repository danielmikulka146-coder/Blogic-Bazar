"use client";

import { Text } from "@mantine/core";
import { Bookmark, LogIn, LogOut, Package, ShoppingBag } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/components/infrastructure/AuthProvider";
import { Link, useRouter } from "@/i18n/navigation";

const INK = "#1a1a1a";
const CREAM = "#F4EFE3";
const CARD = "#FBFAF6";
const ORANGE = "#FF5722";
const MONO_STACK = "var(--font-jb-mono), 'Courier New', ui-monospace, monospace";

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

const PANEL_GAP = 12;

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
      shape: "rectangular",
      logo_alignment: "left",
      width: 240,
      locale: "cs",
    });
  }, [signInOpen]);

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
            <div
              style={{
                padding: 18,
                background: CARD,
                border: `2px dotted ${INK}`,
                borderRadius: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 14,
                minWidth: 280,
              }}
            >
              <Text size="xs" c={INK} ta="center" fw={600} style={{ letterSpacing: "0.04em" }}>
                Přihlas se přes Google účet
              </Text>
              <div ref={googleButtonHostRef} style={{ minHeight: 44 }} />
              {error && (
                <Text size="xs" c={ORANGE} ta="center" style={{ maxWidth: 240 }}>
                  {error}
                </Text>
              )}
            </div>
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
            <div
              style={{
                padding: 4,
                background: CARD,
                border: `2px dotted ${INK}`,
                borderRadius: 0,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "10px 12px 8px" }}>
                  <Text size="xs" c="#888780" tt="uppercase" style={{ letterSpacing: "0.08em", lineHeight: 1.1 }}>
                    Přihlášený jako
                  </Text>
                  <Text size="sm" c={INK} fw={700} truncate mt={2}>
                    {user.email}
                  </Text>
                </div>
                <DottedDivider />
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
                <MenuItem
                  icon={<ShoppingBag size={15} />}
                  label="Koupené inzeráty"
                  onClick={() => {
                    setOpen(false);
                    router.push("/profil/koupene-inzeraty");
                  }}
                />
                <DottedDivider />
                <MenuItem
                  icon={<LogOut size={15} />}
                  label="Odhlásit"
                  onClick={async () => {
                    setOpen(false);
                    await signOut();
                  }}
                />
              </div>
            </div>
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
          onMouseEnter={(e) => {
            e.currentTarget.style.background = CREAM;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = CARD;
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 14px",
            border: `2px solid ${INK}`,
            background: CARD,
            color: INK,
            borderRadius: 0,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            fontFamily: MONO_STACK,
            transition: "background-color 0.15s",
          }}
        >
          <LogIn size={14} />
          <span>Přihlásit</span>
        </button>

        {signInPanel}

        {error && !signInOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              background: INK,
              padding: "6px 10px",
              borderRadius: 0,
              fontSize: 11,
              color: CREAM,
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
        onMouseEnter={(e) => {
          e.currentTarget.style.background = CREAM;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = CARD;
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "3px 12px 3px 3px",
          border: `2px solid ${INK}`,
          background: CARD,
          color: INK,
          borderRadius: 0,
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          fontFamily: MONO_STACK,
          transition: "background-color 0.15s",
        }}
      >
        <Avatar src={user.picture} name={user.name} size={26} />
        <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>{user.name.split(" ")[0]}</span>
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
        background: ORANGE,
        color: "#4A1B0C",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.max(10, Math.round(size * 0.46)),
        fontWeight: 800,
      }}
    >
      {initial}
    </div>
  );
}

function DottedDivider() {
  return (
    <div
      aria-hidden="true"
      style={{
        height: 0,
        margin: "4px 0",
        borderTop: `2px dotted ${INK}`,
        opacity: 0.55,
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
        background: hover ? CREAM : "transparent",
        transition: "background-color 0.12s",
        borderRadius: 0,
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 13,
        fontWeight: 600,
        color: INK,
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
          fontWeight: 600,
          color: INK,
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
          <Text size="sm" fw={700} truncate>
            {user.name}
          </Text>
          <Text size="xs" c="#888780" truncate>
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
        onClick={() => {
          onNavigate();
          router.push("/profil/koupene-inzeraty");
        }}
        style={mobileItemStyle}
      >
        <ShoppingBag size={16} /> Koupené inzeráty
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
  fontWeight: 600,
  color: INK,
  display: "flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
  fontFamily: "inherit",
};
