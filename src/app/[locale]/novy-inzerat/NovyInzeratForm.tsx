"use client";

import { closestCenter, DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, horizontalListSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  CopyButton,
  Group,
  Loader,
  Modal,
  NumberInput,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE } from "@mantine/dropzone";
import { useForm } from "@mantine/form";
import { Check, Copy, ImageIcon, Smartphone, Upload, X } from "lucide-react";
import { useLocale } from "next-intl";
import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import { LiquidGlass } from "@/components/layout/LiquidGlass";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { useRouter } from "@/i18n/navigation";
import { vytvorInzerat } from "./actions";

const KATEGORIE = ["Elektronika", "Oblečení", "Nábytek", "Sport", "Knihy", "Auto-moto", "Jiné"];
const STAVY = ["dostupné", "rezervováno", "prodáno"];
const STAVY_ZBOZI = ["nové", "jako nové", "použité", "opotřebované", "poškozené"];

type FotoItem = {
  id: string;
  url: string;
  file?: File;
  remotePath?: string;
};

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
        borderRadius: 8,
        overflow: "hidden",
        border: isFirst ? "2px solid var(--mantine-color-blue-5)" : "1px solid var(--mantine-color-dark-4)",
        background: "var(--mantine-color-dark-6)",
      }}
      {...attributes}
      {...listeners}
    >
      <img
        src={item.url}
        alt=""
        draggable={false}
        style={{ width: "100%", height: "100%", objectFit: "cover", userSelect: "none" }}
      />
      {isFirst && (
        <Badge size="xs" variant="filled" color="blue" style={{ position: "absolute", top: 6, left: 6 }}>
          Hlavní
        </Badge>
      )}
      <ActionIcon
        size="sm"
        color="red"
        variant="filled"
        radius="xl"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onRemove}
        style={{ position: "absolute", top: 6, right: 6 }}
        aria-label="Odebrat foto"
      >
        <X size={14} />
      </ActionIcon>
    </Box>
  );
}

export default function NovyInzeratForm() {
  const router = useRouter();
  const locale = useLocale();
  const [fotky, setFotky] = useState<FotoItem[]>([]);
  const fotkyRef = useRef(fotky);
  fotkyRef.current = fotky;

  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [uploadSessionKey, setUploadSessionKey] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const seenRemoteRef = useRef<Set<string>>(new Set());

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // úklid object URLs při unmountu
  useEffect(() => {
    return () => {
      for (const f of fotkyRef.current) {
        if (f.file) URL.revokeObjectURL(f.url);
      }
    };
  }, []);

  const openPhoneUpload = useCallback(async () => {
    setPhoneModalOpen(true);
    if (uploadSessionKey) return;
    try {
      const res = await fetch("/api/upload-session", { method: "POST" });
      const data = (await res.json()) as { key: string };
      const url = `${window.location.origin}/${locale}/nahravani-obrazku?key=${data.key}`;
      const qr = await QRCode.toDataURL(url, { width: 320, margin: 1 });
      setUploadSessionKey(data.key);
      setUploadUrl(url);
      setQrDataUrl(qr);
    } catch {
      setPhoneModalOpen(false);
    }
  }, [uploadSessionKey, locale]);

  // Polling — když je modal otevřený nebo session existuje, pravidelně se ptá serveru
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
        if (data.mobileConnected) {
          setPhoneModalOpen(false);
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
        }
      } catch {
        /* ignoruj přechodné chyby */
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

  const form = useForm({
    initialValues: {
      nazev: "",
      popis: "",
      kategorie: "",
      kontakt: "",
      telefon: "",
      stav: "dostupné",
      stavZbozi: "",
      cena: "" as number | string,
      free: false,
      qrPlatba: false,
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

  function pridejFotky(dropped: File[]) {
    const nove: FotoItem[] = dropped.map((file) => ({
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
      if (target?.remotePath && uploadSessionKey) {
        // Necháváme path v seenRemoteRef, aby se polling fotku znovu nevrátil.
        // Server se uklidí, aby ji telefon viděl jako smazanou.
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

  async function handleSubmit(values: typeof form.values) {
    const formData = new FormData();
    for (const [key, val] of Object.entries(values)) {
      formData.append(key, String(val));
    }
    for (const item of fotky) {
      if (item.file) {
        formData.append("foto", item.file);
      } else if (item.remotePath) {
        formData.append("remoteFoto", item.remotePath);
      }
    }
    if (uploadSessionKey) {
      formData.append("uploadSessionKey", uploadSessionKey);
    }
    await vytvorInzerat(formData);
    router.push("/inzeraty");
  }

  return (
    <Box maw={680} mx="auto" pb={96}>
      <Title order={2} c="var(--mantine-color-text)" mb="lg">
        Nový inzerát
      </Title>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="lg">
          {/* FOTKY */}
          <Paper p="md" radius="md" withBorder>
            <Stack gap="sm">
              <Group justify="space-between" align="center">
                <Text fw={500}>Fotky</Text>
                <Group gap="xs">
                  {fotky.length > 0 && (
                    <Text size="xs" c="dimmed" visibleFrom="sm">
                      Přetažením změníte pořadí · první fotka je hlavní
                    </Text>
                  )}
                  <Button size="xs" variant="light" leftSection={<Smartphone size={14} />} onClick={openPhoneUpload}>
                    Nahrát z telefonu
                  </Button>
                </Group>
              </Group>

              <Dropzone
                accept={IMAGE_MIME_TYPE}
                onDrop={pridejFotky}
                styles={{ root: { borderStyle: "dashed", background: "transparent" } }}
              >
                <Group justify="center" gap="md" mih={90} style={{ pointerEvents: "none" }}>
                  <Dropzone.Accept>
                    <Upload size={32} />
                  </Dropzone.Accept>
                  <Dropzone.Reject>
                    <X size={32} />
                  </Dropzone.Reject>
                  <Dropzone.Idle>
                    <ImageIcon size={32} />
                  </Dropzone.Idle>
                  <Stack gap={2} align="center">
                    <Text size="sm" fw={500}>
                      Přetáhněte obrázky sem nebo klikněte
                    </Text>
                    <Text size="xs" c="dimmed">
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
          </Paper>

          {/* ZÁKLAD */}
          <Paper p="md" radius="md" withBorder>
            <Stack gap="md">
              <TextInput label="Název" placeholder="Co prodáváte?" {...form.getInputProps("nazev")} />

              <Textarea
                label="Popis"
                placeholder="Popis zboží, stav, rok výroby…"
                minRows={4}
                autosize
                {...form.getInputProps("popis")}
              />

              <Group grow>
                <GlassSelect
                  label="Kategorie"
                  placeholder="Vyberte"
                  data={KATEGORIE}
                  {...form.getInputProps("kategorie")}
                />
                <GlassSelect label="Stav" data={STAVY} {...form.getInputProps("stav")} />
              </Group>

              <GlassSelect
                label="Stav zboží"
                placeholder="Jak je na tom?"
                data={STAVY_ZBOZI}
                {...form.getInputProps("stavZbozi")}
              />
            </Stack>
          </Paper>

          {/* CENA */}
          <Paper p="md" radius="md" withBorder>
            <Stack gap="md">
              <Checkbox label="Zdarma" {...form.getInputProps("free", { type: "checkbox" })} />
              {!form.values.free && (
                <NumberInput
                  label="Cena"
                  placeholder="0"
                  min={0}
                  suffix=" Kč"
                  thousandSeparator=" "
                  {...form.getInputProps("cena")}
                />
              )}
              {!form.values.free && (
                <Checkbox
                  label="QR platba"
                  description="V detailu inzerátu se zobrazí QR kód pro rychlou platbu"
                  {...form.getInputProps("qrPlatba", { type: "checkbox" })}
                />
              )}
            </Stack>
          </Paper>

          {/* KONTAKT */}
          <Paper p="md" radius="md" withBorder>
            <Stack gap="md">
              <Text fw={500} size="sm">
                Kontakt{" "}
                <Text span c="dimmed" size="xs">
                  (stačí jedno)
                </Text>
              </Text>
              <TextInput label="E-mail" placeholder="vas@email.cz" type="email" {...form.getInputProps("kontakt")} />
              <TextInput label="Telefon" placeholder="+420 123 456 789" type="tel" {...form.getInputProps("telefon")} />
            </Stack>
          </Paper>
        </Stack>

        {/* STICKY SUBMIT */}
        <Box
          style={{
            position: "sticky",
            bottom: 0,
            marginTop: 24,
            padding: "12px 0",
            zIndex: 1000,
          }}
        >
          <Group justify="flex-end">
            <button
              type="submit"
              style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, display: "block" }}
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
                style={{ padding: "10px 24px" }}
              >
                <Text fw={600} c="var(--mantine-color-text)" size="sm" style={{ whiteSpace: "nowrap" }}>
                  Přidat inzerát
                </Text>
              </LiquidGlass>
            </button>
          </Group>
        </Box>
      </form>

      <Modal
        opened={phoneModalOpen}
        onClose={() => setPhoneModalOpen(false)}
        title="Nahrát z telefonu"
        centered
        size="sm"
      >
        <Stack gap="md" align="center">
          <Text size="sm" c="dimmed" ta="center">
            Naskenuj QR kód telefonem. Otevře se stránka, kde můžeš vyfotit nebo vybrat fotky — objeví se zde
            automaticky.
          </Text>

          {qrDataUrl ? (
            <Box
              style={{
                background: "white",
                padding: 12,
                borderRadius: 12,
                lineHeight: 0,
              }}
            >
              {/** biome-ignore lint/performance/noImgElement: data: URL pro QR; next/image to nepodporuje */}
              <img src={qrDataUrl} alt="QR kód pro nahrávání" width={256} height={256} />
            </Box>
          ) : (
            <Group gap="xs">
              <Loader size="sm" />
              <Text size="sm">Generuji QR kód…</Text>
            </Group>
          )}

          {uploadUrl && (
            <Stack gap={4} w="100%">
              <Text size="xs" c="dimmed">
                Nebo otevři odkaz ručně:
              </Text>
              <Group gap="xs" wrap="nowrap">
                <TextInput value={uploadUrl} readOnly style={{ flex: 1 }} size="xs" />
                <CopyButton value={uploadUrl}>
                  {({ copied, copy }) => (
                    <ActionIcon
                      variant="light"
                      color={copied ? "green" : "blue"}
                      onClick={copy}
                      aria-label="Zkopírovat odkaz"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                    </ActionIcon>
                  )}
                </CopyButton>
              </Group>
            </Stack>
          )}

          <Text size="xs" c="dimmed" ta="center">
            Telefon a počítač musí být na stejné WiFi.
          </Text>
        </Stack>
      </Modal>
    </Box>
  );
}
