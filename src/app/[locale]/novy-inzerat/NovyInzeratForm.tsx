"use client";

import { closestCenter, DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, horizontalListSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ActionIcon,
  Badge,
  Box,
  Checkbox,
  CopyButton,
  Group,
  Loader,
  Modal,
  NumberInput,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE } from "@mantine/dropzone";
import { useForm } from "@mantine/form";
import { Check, Copy, ImageIcon, LogIn, Smartphone, Trash2, Upload, X } from "lucide-react";
import { useLocale } from "next-intl";
import QRCode from "qrcode";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/infrastructure/AuthProvider";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { useRouter } from "@/i18n/navigation";
import { resizeImageIfLarger } from "@/lib/clientImageResize";
import { defaultPhoneCountry, formatPhoneDigits } from "@/lib/phoneCountries";
import { odstranitInzerat } from "../inzeraty/owner-actions";
import { upravitInzerat, vytvorInzerat } from "./actions";

const KATEGORIE = ["Elektronika", "Oblečení", "Nábytek", "Sport", "Knihy", "Auto-moto", "Jiné"];
const STAVY_ZBOZI = ["nové", "jako nové", "použité", "opotřebované", "poškozené"];
const STAVY = ["dostupné", "zarezervováno", "prodáno"];

const INK = "#1a1a1a";
const CARD = "#FBFAF6";
const ORANGE = "#FF5722";
const BURNT = "#4A1B0C";
const MUTED = "#888780";
const MONO_STACK = "var(--font-jb-mono), 'Courier New', ui-monospace, monospace";

export type InitialInzerat = {
  id: number;
  nazev: string;
  popis: string;
  kategorie: string;
  kontakt: string;
  telefon: string | null;
  stav: string;
  stavZbozi: string | null;
  cena: number;
  free: boolean;
};

type Props = {
  /** Pokud je předán, formulář běží v edit režimu (předvyplní pole, jiný submit). */
  initialInzerat?: InitialInzerat;
  /** Web cesty (např. `/inzeraty/5/abc.webp`) k fotkám, které již existují na disku. */
  initialFotky?: string[];
};

type FotoItem = {
  id: string;
  url: string;
  file?: File;
  remotePath?: string;
  /** Cesta v `/public/inzeraty/{id}` u fotek načtených z DB v edit režimu. */
  existingPath?: string;
};

/** Rozdělí uložené tel. číslo "+420 123 456 789" na prefix a vlastní číslo. */
function splitStoredTelefon(stored: string | null | undefined): { prefix: string; number: string } {
  if (!stored) return { prefix: "", number: "" };
  const trimmed = stored.trim();
  if (trimmed.startsWith("+")) {
    const spaceIdx = trimmed.indexOf(" ");
    if (spaceIdx > 0) {
      return { prefix: trimmed.slice(0, spaceIdx), number: trimmed.slice(spaceIdx + 1) };
    }
    return { prefix: trimmed, number: "" };
  }
  return { prefix: "", number: trimmed };
}

function SortableThumbnail({ item, onRemove, isFirst }: { item: FotoItem; onRemove: () => void; isFirst: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  return (
    <Box
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        position: "relative",
        width: 120,
        height: 120,
        flexShrink: 0,
        cursor: isDragging ? "grabbing" : "grab",
        borderRadius: 0,
        overflow: "hidden",
        border: isFirst ? `2px solid ${ORANGE}` : `2px dotted ${INK}`,
        background: CARD,
      }}
      {...attributes}
      {...listeners}
    >
      {/* biome-ignore lint/performance/noImgElement: dnd-kit drag needs raw <img>; object URLs aren't friendly to next/image */}
      <img
        src={item.url}
        alt=""
        draggable={false}
        style={{ width: "100%", height: "100%", objectFit: "cover", userSelect: "none" }}
      />
      {isFirst && (
        <Badge
          size="xs"
          variant="filled"
          style={{
            position: "absolute",
            top: 6,
            left: 6,
            background: ORANGE,
            color: BURNT,
            borderRadius: 0,
            fontFamily: MONO_STACK,
            letterSpacing: "0.06em",
          }}
        >
          Hlavní
        </Badge>
      )}
      <ActionIcon
        size="sm"
        variant="filled"
        radius={0}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onRemove}
        style={{
          position: "absolute",
          top: 6,
          right: 6,
          background: INK,
          color: CARD,
          borderRadius: 0,
        }}
        aria-label="Odebrat foto"
      >
        <X size={14} />
      </ActionIcon>
    </Box>
  );
}

/** Section header — centrovaný titulek mezi dotted linkami přes plnou šířku. */
function SectionHeader({ title }: { title: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginTop: 4,
        marginBottom: 8,
        width: "100%",
        fontFamily: MONO_STACK,
        fontSize: 11,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: INK,
      }}
    >
      <span aria-hidden style={{ flex: 1, height: 0, borderTop: `2px dotted ${MUTED}` }} />
      <span style={{ color: INK, fontWeight: 700, whiteSpace: "nowrap" }}>{title}</span>
      <span aria-hidden style={{ flex: 1, height: 0, borderTop: `2px dotted ${MUTED}` }} />
    </div>
  );
}

const FIELD_LABEL_PROPS: Record<string, unknown> = {
  fw: 700,
  c: INK,
  size: "xs",
  tt: "uppercase",
  style: { letterSpacing: "0.08em", fontFamily: MONO_STACK },
};

const INPUT_FIELD_STYLES = {
  input: {
    background: CARD,
    border: `2px dotted ${INK}`,
    borderRadius: 0,
    fontFamily: MONO_STACK,
    color: INK,
  },
} as const;

export default function NovyInzeratForm({ initialInzerat, initialFotky }: Props = {}) {
  const router = useRouter();
  const locale = useLocale();
  const { user, loading: authLoading } = useAuth();
  const isEdit = initialInzerat != null;
  const initialTelefon = useMemo(() => splitStoredTelefon(initialInzerat?.telefon), [initialInzerat?.telefon]);

  const [fotky, setFotky] = useState<FotoItem[]>(() =>
    (initialFotky ?? []).map((p, i) => ({
      id: `existing-${i}-${p}`,
      url: p,
      existingPath: p,
    })),
  );
  const fotkyRef = useRef(fotky);
  fotkyRef.current = fotky;

  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [uploadSessionKey, setUploadSessionKey] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const uploadSessionKeyRef = useRef<string | null>(null);
  const seenRemoteRef = useRef<Set<string>>(new Set());
  uploadSessionKeyRef.current = uploadSessionKey;

  // Smazat inzerát (jen v edit režimu)
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    return () => {
      for (const f of fotkyRef.current) {
        if (f.file) URL.revokeObjectURL(f.url);
      }
    };
  }, []);

  // QR pro nahrání z telefonu
  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/upload-session", { method: "POST" });
        const data = (await res.json()) as { key: string };
        if (cancelled) return;
        const url = `${window.location.origin}/${locale}/nahravani-obrazku?key=${data.key}`;
        const qr = await QRCode.toDataURL(url, { width: 320, margin: 1 });
        if (cancelled) return;
        setUploadSessionKey(data.key);
        setUploadUrl(url);
        setQrDataUrl(qr);
      } catch {
        /* tiché selhání */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale, user]);

  const initialMobileConnectedRef = useRef<boolean | null>(null);
  const phoneModalOpenRef = useRef(phoneModalOpen);
  phoneModalOpenRef.current = phoneModalOpen;

  const openPhoneUpload = useCallback(() => {
    initialMobileConnectedRef.current = null;
    setPhoneModalOpen(true);
  }, []);

  useEffect(() => {
    if (!uploadSessionKey) return;
    let stopped = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/upload-session/${uploadSessionKey}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          fotky: { webPath: string; filename: string }[];
          mobileConnected?: boolean;
        };

        if (phoneModalOpenRef.current) {
          const connected = data.mobileConnected ?? false;
          if (initialMobileConnectedRef.current === null) {
            initialMobileConnectedRef.current = connected;
          } else if (connected && !initialMobileConnectedRef.current) {
            setPhoneModalOpen(false);
            initialMobileConnectedRef.current = true;
          }
        }

        const novinky = data.fotky.filter((f) => !seenRemoteRef.current.has(f.webPath));
        if (novinky.length > 0) {
          for (const n of novinky) seenRemoteRef.current.add(n.webPath);
          setFotky((prev) => [
            ...prev,
            ...novinky.map((n) => ({
              id: `remote-${n.filename}`,
              url: n.webPath,
              remotePath: n.webPath,
            })),
          ]);
          if (phoneModalOpenRef.current) {
            setPhoneModalOpen(false);
          }
        }
      } catch {
        /* ignoruj */
      }
    };
    const interval = setInterval(() => {
      if (!stopped) tick();
    }, 1000);
    tick();
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [uploadSessionKey]);

  const defaultCountry = useMemo(() => defaultPhoneCountry(locale), [locale]);

  const form = useForm({
    initialValues: {
      nazev: initialInzerat?.nazev ?? "",
      popis: initialInzerat?.popis ?? "",
      kategorie: initialInzerat?.kategorie ?? "",
      kontakt: initialInzerat?.kontakt ?? user?.email ?? "",
      telefon: initialTelefon.number ? formatPhoneDigits(initialTelefon.number) : "",
      telefonPrefix: initialTelefon.prefix || defaultCountry.prefix,
      stav: initialInzerat?.stav ?? "dostupné",
      stavZbozi: initialInzerat?.stavZbozi ?? "",
      cena: (initialInzerat?.cena ?? "") as number | string,
      free: initialInzerat?.free ?? false,
    },
    validate: {
      nazev: (v) => (v.trim().length < 3 ? "Název musí mít alespoň 3 znaky" : null),
      popis: (v) => (v.trim().length < 10 ? "Popis musí mít alespoň 10 znaků" : null),
      kategorie: (v) => (!v ? "Vyberte kategorii" : null),
      stavZbozi: (v) => (!v ? "Vyberte stav zboží" : null),
      kontakt: (v, values) => {
        const email = v.trim();
        const tel = values.telefon.trim();
        if (email.length === 0 && tel.length === 0) return "Zadejte e-mail nebo telefon";
        if (email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Zadejte platný e-mail";
        return null;
      },
      telefon: (v, values) => {
        const tel = v.trim();
        const email = values.kontakt.trim();
        if (tel.length === 0 && email.length === 0) return "Zadejte telefon nebo e-mail";
        if (tel.length > 0) {
          const normalized = tel.replace(/[\s-]/g, "");
          if (!/^(\+|00)?[0-9]{9,15}$/.test(normalized)) return "Zadejte platné telefonní číslo";
        }
        return null;
      },
      cena: (v, values) => {
        if (values.free) return null;
        if (v === "" || v === undefined || Number(v) <= 0) return "Zadejte cenu nebo zaškrtněte Zdarma";
        return null;
      },
    },
  });

  async function pridejFotky(dropped: File[]) {
    const resized = await Promise.all(dropped.map((f) => resizeImageIfLarger(f)));
    const nove: FotoItem[] = resized.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      url: URL.createObjectURL(file),
    }));
    setFotky((prev) => [...prev, ...nove]);
  }

  function odeberFotku(id: string) {
    setFotky((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.file) URL.revokeObjectURL(target.url);
      // Pro session upload: smaž ji rovnou ze session, aby nezůstávala na disku.
      // Pro existující fotku: jen odeber ze stavu — server ji při save smaže.
      if (target?.remotePath && uploadSessionKey) {
        const filename = target.remotePath.split("/").pop();
        if (filename) {
          fetch(`/api/upload-session/${uploadSessionKey}/foto/${filename}`, { method: "DELETE" }).catch(() => {});
        }
      }
      return prev.filter((f) => f.id !== id);
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setFotky((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  }

  // Flag který vypne beforeunload warning, jakmile uživatel cíleně odešle formulář
  // (jinak by se objevila otázka i při následném router.push).
  const submittingRef = useRef(false);
  const suppressBeforeUnloadRef = useRef(false);

  // V edit režimu počáteční stav fotky = existující. Tyto neoznačujeme jako
  // "rozpracovaný draft" — varování při zavírání chceme jen když user něco změnil.
  const initialFotkyKeyRef = useRef(JSON.stringify((initialFotky ?? []).map((p) => `existing:${p}`)));

  const currentFotkySignature = useCallback(() => {
    return JSON.stringify(
      fotkyRef.current.map((f) => {
        if (f.existingPath) return `existing:${f.existingPath}`;
        if (f.file) return `file:${f.id}`;
        if (f.remotePath) return `remote:${f.remotePath}`;
        return "?";
      }),
    );
  }, []);

  const hasUnsavedDraft = useCallback(() => {
    const fotkyChanged = currentFotkySignature() !== initialFotkyKeyRef.current;
    return formRef.current.isDirty() || fotkyChanged;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFotkySignature]);

  const closePhoneUploadSession = useCallback(() => {
    const key = uploadSessionKeyRef.current;
    if (!key) return;
    fetch(`/api/upload-session/${key}/close`, { method: "POST", keepalive: true }).catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (!submittingRef.current) {
        closePhoneUploadSession();
      }
    };
  }, [closePhoneUploadSession]);

  useEffect(() => {
    const handler = () => {
      if (!submittingRef.current) {
        closePhoneUploadSession();
      }
    };
    window.addEventListener("pagehide", handler);
    return () => window.removeEventListener("pagehide", handler);
  }, [closePhoneUploadSession]);

  useEffect(() => {
    const leaveMessage = isEdit
      ? "Máš neuložené změny. Opravdu chceš odejít?"
      : "Máš rozepsaný inzerát. Opravdu chceš odejít?";
    const handler = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || submittingRef.current || !hasUnsavedDraft()) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement)) return;
      if (target.target && target.target !== "_self") return;

      const url = new URL(target.href, window.location.href);
      if (url.origin !== window.location.origin || url.href === window.location.href) return;

      event.preventDefault();
      if (!window.confirm(leaveMessage)) return;

      suppressBeforeUnloadRef.current = true;
      closePhoneUploadSession();
      window.location.assign(url.href);
    };

    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [closePhoneUploadSession, hasUnsavedDraft, isEdit]);

  async function handleSubmit(values: typeof form.values) {
    submittingRef.current = true;
    const formData = new FormData();
    for (const [key, val] of Object.entries(values)) {
      formData.append(key, String(val));
    }

    // Pošli pořadí fotek + soubory v tom samém pořadí, ve kterém se objevují
    // v `fotky[]`. Server pak z `fotoEntry` zpětně poskládá pořadí kombinací
    // s `foto` (File queue) a kontrolou existencí.
    for (const item of fotky) {
      if (item.existingPath) {
        formData.append("fotoEntry", `existing:${item.existingPath}`);
      } else if (item.file) {
        formData.append("fotoEntry", "file");
        formData.append("foto", item.file);
      } else if (item.remotePath) {
        formData.append("fotoEntry", `session:${item.remotePath}`);
      }
    }
    if (uploadSessionKey) {
      formData.append("uploadSessionKey", uploadSessionKey);
    }

    if (isEdit && initialInzerat) {
      formData.append("id", String(initialInzerat.id));
      await upravitInzerat(formData);
      router.push(`/inzeraty/${initialInzerat.id}`);
    } else {
      await vytvorInzerat(formData);
      router.push("/inzeraty");
    }
  }

  const handleFormSubmit = form.onSubmit(handleSubmit);

  async function handleDelete() {
    if (!initialInzerat) return;
    setDeleting(true);
    try {
      submittingRef.current = true;
      await odstranitInzerat(initialInzerat.id);
      router.push("/profil/moje-inzeraty");
    } finally {
      setDeleting(false);
    }
  }

  // Auto-fill e-mailu z Google účtu (jen v create režimu — v editu se prefilluje
  // z existujícího inzerátu a uživatelův e-mail bychom přepsali kontakt z inzerátu).
  const lastAutofilledEmail = useRef<string>("");
  const formRef = useRef(form);
  formRef.current = form;
  useEffect(() => {
    if (isEdit) return;
    const email = user?.email;
    if (!email) return;
    const f = formRef.current;
    const current = f.values.kontakt;
    if (current === "" || current === lastAutofilledEmail.current) {
      f.setFieldValue("kontakt", email);
      lastAutofilledEmail.current = email;
    }
  }, [user?.email, isEdit]);

  // Browser warning při zavření tabu/refreshi pokud uživatel rozepsal formulář
  // nebo nahrál fotky.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (submittingRef.current || suppressBeforeUnloadRef.current) return;
      if (!hasUnsavedDraft()) return;
      e.preventDefault();
      // Chrome / starší prohlížeče potřebují returnValue, novější ignorují string.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedDraft]);

  // Auto-fill telefonu z uloženého profilu (jen v create režimu).
  const autofilledTelefonRef = useRef(false);
  useEffect(() => {
    if (isEdit) return;
    if (autofilledTelefonRef.current) return;
    if (!user) return;
    const f = formRef.current;
    if (f.values.telefon.trim().length > 0) {
      autofilledTelefonRef.current = true;
      return;
    }
    if (user.telefon) {
      f.setFieldValue("telefon", formatPhoneDigits(user.telefon));
    }
    if (user.telefonPrefix) {
      f.setFieldValue("telefonPrefix", user.telefonPrefix);
    }
    autofilledTelefonRef.current = true;
  }, [user, isEdit]);

  if (!user && !authLoading) {
    return (
      <Box maw={520} mx="auto" pt={48}>
        <Paper p="xl" radius={0} withBorder style={{ borderColor: INK, borderWidth: 2, borderStyle: "dotted" }}>
          <Stack gap="md" align="center" ta="center">
            <LogIn size={36} color={ORANGE} />
            <Text fw={700} c={INK} size="lg" style={{ fontFamily: MONO_STACK }}>
              Přihlas se pro {isEdit ? "úpravu inzerátu" : "přidání inzerátu"}
            </Text>
            <Text c={MUTED} size="sm" style={{ fontFamily: MONO_STACK }}>
              Inzeráty na Blogic Bazaru může vytvářet pouze přihlášený uživatel. Použij tlačítko „Přihlásit" v pravém
              horním rohu — přihlášení proběhne přes tvůj Google účet.
            </Text>
          </Stack>
        </Paper>
      </Box>
    );
  }

  return (
    <Box maw={640} mx="auto" pb={96}>
      <div>
        <Group justify="space-between" align="center" mb={16} wrap="nowrap">
          <h1
            style={{
              fontFamily: MONO_STACK,
              fontWeight: 700,
              fontSize: 28,
              color: INK,
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            {isEdit ? "Upravit inzerát" : "Nový inzerát"}
          </h1>
          {isEdit && !confirmDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 10px",
                background: "transparent",
                border: `2px solid ${INK}`,
                borderRadius: 0,
                cursor: "pointer",
                color: ORANGE,
                fontFamily: MONO_STACK,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              <Trash2 size={13} /> Smazat
            </button>
          )}
          {isEdit && confirmDelete && (
            <Group gap={6} wrap="nowrap">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                style={{
                  padding: "6px 10px",
                  background: CARD,
                  border: `2px solid ${INK}`,
                  borderRadius: 0,
                  cursor: "pointer",
                  color: INK,
                  fontFamily: MONO_STACK,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Zrušit
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: "6px 10px",
                  background: ORANGE,
                  color: BURNT,
                  border: `2px solid ${INK}`,
                  borderRadius: 0,
                  cursor: deleting ? "wait" : "pointer",
                  fontFamily: MONO_STACK,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {deleting ? "Mažu…" : "Opravdu smazat"}
              </button>
            </Group>
          )}
        </Group>

        <form onSubmit={handleFormSubmit} noValidate>
          <Stack gap="md">
            {/* FOTKY */}
            <SectionHeader title="FOTKY" />
            <Stack gap="sm">
              <Group justify="space-between" align="center">
                {fotky.length > 0 ? (
                  <Text size="xs" c={MUTED} visibleFrom="sm" style={{ fontFamily: MONO_STACK }}>
                    Přetažením změníte pořadí · první fotka je hlavní
                  </Text>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={openPhoneUpload}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    background: "transparent",
                    border: `2px solid ${INK}`,
                    borderRadius: 0,
                    cursor: "pointer",
                    fontFamily: MONO_STACK,
                    fontSize: 12,
                    color: ORANGE,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    fontWeight: 700,
                  }}
                >
                  <Smartphone size={14} /> Nahrát z telefonu
                </button>
              </Group>

              <Dropzone
                accept={IMAGE_MIME_TYPE}
                onDrop={pridejFotky}
                styles={{
                  root: {
                    border: `2px dotted ${INK}`,
                    borderRadius: 0,
                    background: CARD,
                  },
                }}
              >
                <Group justify="center" gap="md" mih={90} style={{ pointerEvents: "none" }}>
                  <Dropzone.Accept>
                    <Upload size={28} />
                  </Dropzone.Accept>
                  <Dropzone.Reject>
                    <X size={28} />
                  </Dropzone.Reject>
                  <Dropzone.Idle>
                    <ImageIcon size={28} color={MUTED} />
                  </Dropzone.Idle>
                  <Stack gap={2} align="center">
                    <Text size="sm" fw={600} style={{ fontFamily: MONO_STACK, color: INK }}>
                      Přetáhněte obrázky sem nebo klikněte
                    </Text>
                    <Text size="xs" c={MUTED} style={{ fontFamily: MONO_STACK }}>
                      PNG · JPEG · WEBP · GIF
                    </Text>
                  </Stack>
                </Group>
              </Dropzone>

              {fotky.length > 0 && (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={fotky.map((f) => f.id)} strategy={horizontalListSortingStrategy}>
                    <ScrollArea type="auto" offsetScrollbars>
                      <Group gap="sm" wrap="nowrap" py={4}>
                        {fotky.map((item, idx) => (
                          <SortableThumbnail
                            key={item.id}
                            item={item}
                            isFirst={idx === 0}
                            onRemove={() => odeberFotku(item.id)}
                          />
                        ))}
                      </Group>
                    </ScrollArea>
                  </SortableContext>
                </DndContext>
              )}
            </Stack>

            {/* O VĚCI */}
            <SectionHeader title="O VĚCI" />
            <Stack gap="md">
              <TextInput
                label="Název"
                labelProps={FIELD_LABEL_PROPS}
                placeholder="Co prodáváte?"
                styles={INPUT_FIELD_STYLES}
                {...form.getInputProps("nazev")}
              />

              <Textarea
                label="Popis"
                labelProps={FIELD_LABEL_PROPS}
                placeholder="Popis zboží, stav, rok výroby…"
                minRows={4}
                autosize
                styles={INPUT_FIELD_STYLES}
                {...form.getInputProps("popis")}
              />

              <Select
                label="Kategorie"
                labelProps={FIELD_LABEL_PROPS}
                placeholder="Vyberte"
                data={KATEGORIE}
                {...form.getInputProps("kategorie")}
              />

              <Select
                label="Stav zboží"
                labelProps={FIELD_LABEL_PROPS}
                placeholder="Jak je na tom?"
                data={STAVY_ZBOZI}
                {...form.getInputProps("stavZbozi")}
              />

              {isEdit && (
                <Select
                  label="Stav inzerátu"
                  labelProps={FIELD_LABEL_PROPS}
                  data={STAVY}
                  {...form.getInputProps("stav")}
                />
              )}
            </Stack>

            {/* CENA */}
            <SectionHeader title="CENA" />
            <Stack gap="md">
              <Checkbox
                label="Zdarma"
                color={ORANGE}
                radius={0}
                styles={{
                  input: {
                    borderRadius: 0,
                    border: `2px solid ${INK}`,
                  },
                  label: { fontFamily: MONO_STACK, fontSize: 13, color: INK, fontWeight: 600 },
                }}
                {...form.getInputProps("free", { type: "checkbox" })}
              />
              <NumberInput
                label="Cena"
                labelProps={FIELD_LABEL_PROPS}
                placeholder="0"
                min={0}
                suffix=" Kč"
                thousandSeparator=" "
                disabled={form.values.free}
                styles={{
                  ...INPUT_FIELD_STYLES,
                  input: {
                    ...INPUT_FIELD_STYLES.input,
                    opacity: form.values.free ? 0.4 : 1,
                  },
                }}
                {...form.getInputProps("cena")}
              />
            </Stack>

            {/* KONTAKT */}
            <SectionHeader title="KONTAKT" />
            <Stack gap="md">
              <Group justify="space-between" align="center" wrap="nowrap">
                <Text fw={600} size="sm" style={{ fontFamily: MONO_STACK, color: INK }}>
                  Kontakt{" "}
                  <Text span c={MUTED} size="xs" style={{ fontFamily: MONO_STACK }}>
                    (stačí jedno)
                  </Text>
                </Text>
                {(() => {
                  const email = user?.email;
                  if (!email || email === form.values.kontakt) return null;
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        form.setFieldValue("kontakt", email);
                        lastAutofilledEmail.current = email;
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: ORANGE,
                        fontFamily: MONO_STACK,
                        fontSize: 11,
                        cursor: "pointer",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        textDecoration: "underline",
                      }}
                    >
                      Použít e-mail z Google
                    </button>
                  );
                })()}
              </Group>
              <TextInput
                label="E-mail"
                labelProps={FIELD_LABEL_PROPS}
                placeholder="vas@email.cz"
                type="email"
                styles={INPUT_FIELD_STYLES}
                {...form.getInputProps("kontakt")}
              />
              <Stack gap={4}>
                <Text {...(FIELD_LABEL_PROPS as Record<string, unknown>)}>Telefon</Text>
                <PhoneInput
                  prefix={form.values.telefonPrefix}
                  value={form.values.telefon}
                  defaultCountryCode={defaultCountry.code}
                  onPrefixChange={(p) => form.setFieldValue("telefonPrefix", p)}
                  onValueChange={(v) => form.setFieldValue("telefon", v)}
                  error={form.errors.telefon as string | undefined}
                />
              </Stack>
            </Stack>

            <Group justify="flex-end" mt="md">
              <button
                type="submit"
                style={{
                  background: ORANGE,
                  color: BURNT,
                  border: `2px solid ${INK}`,
                  borderRadius: 0,
                  padding: "12px 20px",
                  fontFamily: MONO_STACK,
                  fontWeight: 500,
                  fontSize: 14,
                  cursor: "pointer",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  transition: "box-shadow 150ms ease-out",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 16px rgba(255, 87, 34, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {isEdit ? "Uložit změny" : "Přidat inzerát"}
              </button>
            </Group>
          </Stack>
        </form>
      </div>

      <Modal
        opened={phoneModalOpen}
        onClose={() => setPhoneModalOpen(false)}
        title="Nahrát z telefonu"
        centered
        size="sm"
        radius={0}
      >
        <Stack gap="md" align="center">
          <Text size="sm" c={MUTED} ta="center" style={{ fontFamily: MONO_STACK }}>
            Naskenuj QR kód telefonem. Otevře se stránka, kde můžeš vyfotit nebo vybrat fotky — objeví se zde
            automaticky.
          </Text>

          {qrDataUrl ? (
            <Box style={{ background: "white", padding: 12, border: `2px solid ${INK}`, lineHeight: 0 }}>
              {/** biome-ignore lint/performance/noImgElement: data: URL pro QR */}
              <img src={qrDataUrl} alt="QR kód pro nahrávání" width={256} height={256} />
            </Box>
          ) : (
            <Group gap="xs">
              <Loader size="sm" />
              <Text size="sm" style={{ fontFamily: MONO_STACK }}>
                Generuji QR kód…
              </Text>
            </Group>
          )}

          {uploadUrl && (
            <Stack gap={4} w="100%">
              <Text size="xs" c={MUTED} style={{ fontFamily: MONO_STACK }}>
                Nebo otevři odkaz ručně:
              </Text>
              <Group gap="xs" wrap="nowrap">
                <TextInput value={uploadUrl} readOnly style={{ flex: 1 }} size="xs" styles={INPUT_FIELD_STYLES} />
                <CopyButton value={uploadUrl}>
                  {({ copied, copy }) => (
                    <ActionIcon
                      variant="light"
                      color={copied ? "green" : "orange"}
                      onClick={copy}
                      aria-label="Zkopírovat odkaz"
                      radius={0}
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                    </ActionIcon>
                  )}
                </CopyButton>
              </Group>
            </Stack>
          )}

          <Text size="xs" c={MUTED} ta="center" style={{ fontFamily: MONO_STACK }}>
            Telefon a počítač musí být na stejné WiFi.
          </Text>
        </Stack>
      </Modal>
    </Box>
  );
}
