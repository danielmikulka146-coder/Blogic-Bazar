"use client";

import { closestCenter, DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, horizontalListSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ActionIcon,
  Badge,
  Box,
  Checkbox,
  Group,
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
import { ImageIcon, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LiquidGlass } from "@/components/layout/LiquidGlass";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { useRouter } from "@/i18n/navigation";
import { vytvorInzerat } from "./actions";

const KATEGORIE = ["Elektronika", "Oblečení", "Nábytek", "Sport", "Knihy", "Auto-moto", "Jiné"];
const STAVY = ["dostupné", "rezervováno", "prodáno"];

type FotoItem = { id: string; file: File; url: string };

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
  const [fotky, setFotky] = useState<FotoItem[]>([]);
  const fotkyRef = useRef(fotky);
  fotkyRef.current = fotky;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // úklid object URLs při unmountu
  useEffect(() => {
    return () => {
      for (const f of fotkyRef.current) {
        URL.revokeObjectURL(f.url);
      }
    };
  }, []);

  const form = useForm({
    initialValues: {
      nazev: "",
      popis: "",
      kategorie: "",
      kontakt: "",
      telefon: "",
      stav: "dostupné",
      cena: "" as number | string,
      free: false,
      qrPlatba: false,
    },
    validate: {
      nazev: (v) => (v.trim().length < 3 ? "Název musí mít alespoň 3 znaky" : null),
      popis: (v) => (v.trim().length < 10 ? "Popis musí mít alespoň 10 znaků" : null),
      kategorie: (v) => (!v ? "Vyberte kategorii" : null),
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
      if (target) URL.revokeObjectURL(target.url);
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
      formData.append("foto", item.file);
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
                {fotky.length > 0 && (
                  <Text size="xs" c="dimmed">
                    Přetažením změníte pořadí · první fotka je hlavní
                  </Text>
                )}
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
    </Box>
  );
}
