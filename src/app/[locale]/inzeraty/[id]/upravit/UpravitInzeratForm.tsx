"use client";

import {
  Box,
  Button,
  Checkbox,
  Group,
  NumberInput,
  Paper,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { LiquidGlass } from "@/components/layout/LiquidGlass";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { useRouter } from "@/i18n/navigation";
import { odstranitInzerat, upravitInzerat } from "../../owner-actions";

const KATEGORIE = ["Elektronika", "Oblečení", "Nábytek", "Sport", "Knihy", "Auto-moto", "Jiné"];
const STAVY_ZBOZI = ["nové", "jako nové", "použité", "opotřebované", "poškozené"];
const STAVY = ["dostupné", "zarezervováno", "prodáno"];

type InzeratRow = {
  id: number;
  nazev: string;
  popis: string;
  kategorie: string;
  kontakt: string;
  stav: string;
  stavZbozi: string | null;
  cena: number;
  free: boolean;
  qrPlatba: boolean;
  telefon: string | null;
};

export function UpravitInzeratForm({ inzerat }: { inzerat: InzeratRow }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const form = useForm({
    initialValues: {
      nazev: inzerat.nazev,
      popis: inzerat.popis,
      kategorie: inzerat.kategorie,
      kontakt: inzerat.kontakt,
      telefon: inzerat.telefon ?? "",
      stav: inzerat.stav,
      stavZbozi: inzerat.stavZbozi ?? "",
      cena: (inzerat.cena ?? 0) as number | string,
      free: inzerat.free,
      qrPlatba: inzerat.qrPlatba,
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
      cena: (v, values) => {
        if (values.free) return null;
        if (v === "" || v === undefined || Number(v) <= 0) return "Zadejte cenu nebo zaškrtněte Zdarma";
        return null;
      },
    },
  });

  async function handleSubmit(values: typeof form.values) {
    setSubmitting(true);
    try {
      await upravitInzerat({
        id: inzerat.id,
        nazev: values.nazev.trim(),
        popis: values.popis.trim(),
        kategorie: values.kategorie,
        kontakt: values.kontakt.trim(),
        telefon: values.telefon.trim() || null,
        stav: values.stav,
        stavZbozi: values.stavZbozi || null,
        cena: values.free ? 0 : Number(values.cena),
        free: values.free,
        qrPlatba: values.qrPlatba,
      });
      router.push(`/inzeraty/${inzerat.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await odstranitInzerat(inzerat.id);
      router.push("/profil/moje-inzeraty");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Box maw={680} mx="auto" pb={96}>
      <Group justify="space-between" align="center" mb="lg">
        <Title order={2} c="var(--mantine-color-text)">
          Upravit inzerát
        </Title>
        {!confirmDelete ? (
          <Button
            variant="subtle"
            color="red"
            size="sm"
            leftSection={<Trash2 size={14} />}
            onClick={() => setConfirmDelete(true)}
          >
            Smazat
          </Button>
        ) : (
          <Group gap="xs">
            <Button size="xs" variant="default" onClick={() => setConfirmDelete(false)}>
              Zrušit
            </Button>
            <Button size="xs" color="red" loading={deleting} onClick={handleDelete}>
              Opravdu smazat
            </Button>
          </Group>
        )}
      </Group>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="lg">
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
              <GlassSelect
                label="Kategorie"
                placeholder="Vyberte"
                data={KATEGORIE}
                {...form.getInputProps("kategorie")}
              />
              <GlassSelect
                label="Stav zboží"
                placeholder="Jak je na tom?"
                data={STAVY_ZBOZI}
                {...form.getInputProps("stavZbozi")}
              />
              <GlassSelect label="Stav inzerátu" data={STAVY} {...form.getInputProps("stav")} />
            </Stack>
          </Paper>

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
              disabled={submitting}
              style={{
                border: "none",
                background: "transparent",
                cursor: submitting ? "wait" : "pointer",
                padding: 0,
                display: "block",
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
                style={{ padding: "10px 24px" }}
              >
                <Text fw={600} c="var(--mantine-color-text)" size="sm" style={{ whiteSpace: "nowrap" }}>
                  {submitting ? "Ukládám…" : "Uložit změny"}
                </Text>
              </LiquidGlass>
            </button>
          </Group>
        </Box>
      </form>
    </Box>
  );
}
