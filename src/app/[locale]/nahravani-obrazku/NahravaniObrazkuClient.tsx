// Mobilní stránka pro nahrávání fotek z telefonu do rozpracovaného inzerátu na PC.
// Flow: PC vygeneruje QR kód s unikátním sessionKey → uživatel naskenuje → tato stránka.
// Fotky se nahrávají přes upload-session API a PC si je v reálném čase "tahá" do formuláře.
"use client";

import { Alert, Badge, Box, Button, Group, Image, Paper, Progress, Stack, Text, Title } from "@mantine/core";
import { Camera, CheckCircle2, ImageIcon, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { resizeImageIfLarger } from "@/lib/clientImageResize"; // komprese před uploadem — šetří data i čas

// Stav jedné fotky v seznamu — union type zajistí, že status může být jen tyto 4 hodnoty.
type UploadedItem = {
  id: string;
  name: string;
  status: "uploading" | "done" | "error" | "removed";
  thumbUrl?: string; // lokální blob URL pro náhled — vznikne ihned, bez čekání na server
  webPath?: string; // cesta na serveru — přijde po úspěšném uploadu
  error?: string;
};

// sessionKey = unikátní identifikátor session — přichází z URL (QR kód ho zakódoval).
export default function NahravaniObrazkuClient({ sessionKey }: { sessionKey: string }) {
  const [items, setItems] = useState<UploadedItem[]>([]);
  const [sessionOk, setSessionOk] = useState<boolean | null>(null); // null = ještě se načítá
  const [sessionClosed, setSessionClosed] = useState(false); // PC zavřel formulář → blokujeme nové uploady
  // Dvě separátní ref tlačítka — jedno otevře fotoaparát, druhé galerii.
  // Skrytý <input> voláme programově přes .click(), protože vlastní Button vypadá lépe.
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Při načtení stránky ověříme, jestli session existuje a je stále otevřená.
  // Zároveň oznámíme serveru, že jsme připojeni (PC pak ví, že telefon je online).
  useEffect(() => {
    if (!sessionKey) {
      setSessionOk(false);
      return;
    }
    fetch(`/api/upload-session/${sessionKey}`)
      .then(async (r) => {
        setSessionOk(r.ok); // false = session neexistuje nebo vypršela
        if (r.ok) {
          const data = (await r.json()) as { closed?: boolean };
          setSessionClosed(data.closed === true);
          if (!data.closed) {
            // Oznámíme serveru "telefon je připojený" — PC si to může zobrazit jako status.
            fetch(`/api/upload-session/${sessionKey}/connected`, { method: "POST" }).catch(() => {});
          }
        }
      })
      .catch(() => setSessionOk(false));
  }, [sessionKey]); // [] se sessionKey = spustí se jen jednou při načtení stránky

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files); // FileList není normální pole — převedeme ho
      if (arr.length === 0 || !sessionKey || sessionClosed) return;

      // Všechny fotky přidáme do seznamu okamžitě se stavem "uploading" a lokálním náhledem.
      // URL.createObjectURL() vytvoří dočasnou blob: URL bez síťového requestu — náhled je instantní.
      const newItems: UploadedItem[] = arr.map((f) => ({
        id: `${f.name}-${f.lastModified}-${Math.random().toString(36).slice(2, 8)}`, // unikátní ID pro React key
        name: f.name,
        status: "uploading",
        thumbUrl: URL.createObjectURL(f), // dočasný lokální náhled — platný jen po dobu tohoto tab
      }));
      setItems((prev) => [...prev, ...newItems]); // přidáme nové položky za existující

      // Fotky nahráváme sekvenčně (for loop, ne Promise.all) — mobilní spojení bývá nestabilní,
      // paralelní uploady by mohly přetížit síť a způsobit více chyb.
      for (let i = 0; i < arr.length; i++) {
        const original = arr[i];
        const itemId = newItems[i].id;
        try {
          // Před uploadem zmenšíme fotku na rozumné rozlišení — originály z telefonu mohou být 12+ MP.
          const file = await resizeImageIfLarger(original);
          const fd = new FormData();
          fd.append("foto", file);
          // Nahrání jedné fotky na server — server ji uloží do dočasné session složky.
          const res = await fetch(`/api/upload-session/${sessionKey}/foto`, {
            method: "POST",
            body: fd,
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = (await res.json()) as { uploaded: { webPath: string }[] };
          const webPath = data.uploaded[0]?.webPath;
          // Aktualizujeme jen tuto konkrétní fotku v seznamu — ostatní zůstanou beze změny.
          setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, status: "done", webPath } : it)));
        } catch (e) {
          setItems((prev) =>
            prev.map((it) =>
              it.id === itemId ? { ...it, status: "error", error: e instanceof Error ? e.message : "Chyba" } : it,
            ),
          );
        }
      }
    },
    [sessionKey, sessionClosed],
  );

  // Polling — každou sekundu se zeptáme serveru na aktuální stav session.
  // Díky tomu víme, když PC smaže fotku (zobrazíme "Smazáno na PC") nebo formulář zavře.
  // Pozn.: WebSocket by byl elegantnější, ale polling stačí pro tento use case a je jednodušší.
  useEffect(() => {
    if (!sessionKey || sessionOk !== true) return; // nespouštíme pokud session není validní
    let stopped = false; // flag pro zastavení — čistší než clearInterval pro async funkce
    const tick = async () => {
      try {
        const res = await fetch(`/api/upload-session/${sessionKey}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { fotky: { webPath: string }[]; closed?: boolean };
        if (data.closed) {
          setSessionClosed(true); // PC zavřel formulář → blokujeme UI
        }
        // Set pro O(1) vyhledávání — efektivnější než .includes() v poli
        const alive = new Set(data.fotky.map((f) => f.webPath));
        setItems((prev) =>
          prev.map((it) =>
            // Pokud fotka byla "done" ale server ji už nezná → PC ji smazal
            it.status === "done" && it.webPath && !alive.has(it.webPath) ? { ...it, status: "removed" } : it,
          ),
        );
      } catch {
        /* ignoruj síťové chyby — příští tick to zkusí znovu */
      }
    };
    const interval = setInterval(() => {
      if (!stopped) tick(); // stopped guard = zabrání spuštění po unmountu
    }, 1000); // 1000ms = 1 sekunda — dostatečně rychlé pro "real-time" pocit
    return () => {
      stopped = true;
      clearInterval(interval); // cleanup = zastavíme polling při odchodu ze stránky
    };
  }, [sessionKey, sessionOk]);

  if (sessionOk === false) {
    return (
      <Box maw={520} mx="auto" pb={96}>
        <Alert color="red" title="Session nenalezena">
          Tento odkaz není platný nebo již vypršel. Otevři znovu QR kód na počítači a naskenuj nový.
        </Alert>
      </Box>
    );
  }

  // Počty pro badges a progress bar — .filter() pokaždé projde celé pole, ale to nevadí (seznam je malý).
  const uploadingCount = items.filter((i) => i.status === "uploading").length;
  const doneCount = items.filter((i) => i.status === "done").length;
  const errorCount = items.filter((i) => i.status === "error").length;
  const removedCount = items.filter((i) => i.status === "removed").length;

  return (
    <Box maw={520} mx="auto" pb={96}>
      <Stack gap="lg">
        <Stack gap={4} align="center">
          <Title order={2} c="var(--mantine-color-text)" ta="center">
            Nahrát z telefonu
          </Title>
          <Text c="dimmed" size="sm" ta="center">
            Fotky se objeví na počítači v rozpracovaném inzerátu.
          </Text>
        </Stack>

        {sessionClosed && (
          <Alert color="orange" title="Nahrávání je ukončené">
            Otevři na počítači nový formulář a naskenuj nový QR kód.
          </Alert>
        )}

        {/* Skrytý input pro fotoaparát — capture="environment" = zadní kamera (ne selfie). */}
        {/* Je skrytý (display: none) a spouštíme ho programově přes ref.click() z tlačítka níže. */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment" // "environment" = zadní kamera; "user" = selfie kamera
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            if (sessionClosed) return;
            if (e.target.files) uploadFiles(e.target.files);
            e.target.value = ""; // reset — bez toho by opakovaný výběr stejné fotky nespustil onChange
          }}
        />
        {/* Skrytý input pro galerii — bez capture atributu → otevře galerii místo fotoaparátu. */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            if (sessionClosed) return;
            if (e.target.files) uploadFiles(e.target.files);
            e.target.value = ""; // stejný reset jako u kamery
          }}
        />
        <div style={{ display: "flex", gap: 12, width: "100%" }}>
          <Button
            size="xl"
            radius="xl"
            leftSection={<Camera size={22} />}
            onClick={() => cameraInputRef.current?.click()}
            disabled={sessionClosed}
            color="orange"
            style={{ flex: 1, minWidth: 0, height: 64, fontSize: 16 }}
          >
            Vyfotit
          </Button>
          <Button
            size="xl"
            radius="xl"
            variant="light"
            leftSection={<ImageIcon size={22} />}
            onClick={() => galleryInputRef.current?.click()}
            disabled={sessionClosed}
            style={{ flex: 1, minWidth: 0, height: 64, fontSize: 16 }}
          >
            Galerie
          </Button>
        </div>

        {items.length > 0 && (
          <Paper p="md" radius="md" withBorder>
            <Stack gap="sm">
              <Group justify="space-between">
                <Text fw={500}>Nahrané fotky</Text>
                <Group gap={6}>
                  {uploadingCount > 0 && (
                    <Badge color="blue" variant="light" leftSection={<Upload size={12} />}>
                      {uploadingCount}
                    </Badge>
                  )}
                  {doneCount > 0 && (
                    <Badge color="green" variant="light" leftSection={<CheckCircle2 size={12} />}>
                      {doneCount}
                    </Badge>
                  )}
                  {errorCount > 0 && (
                    <Badge color="red" variant="light">
                      {errorCount} chyba
                    </Badge>
                  )}
                  {removedCount > 0 && (
                    <Badge color="gray" variant="light">
                      {removedCount} smazáno
                    </Badge>
                  )}
                </Group>
              </Group>

              {/* Progress bar — hodnota je procento hotových fotek z celkového počtu. animated = proužkovaná animace. */}
              {uploadingCount > 0 && <Progress value={(doneCount / items.length) * 100} animated />}

              <Stack gap="xs">
                {/* Každá fotka v seznamu — opacity 0.45 u "removed" dá vizuální feedback bez odebrání řádku. */}
                {items.map((it) => (
                  <Group key={it.id} gap="sm" wrap="nowrap" style={{ opacity: it.status === "removed" ? 0.45 : 1 }}>
                    {it.thumbUrl && (
                      <Image
                        src={it.thumbUrl}
                        alt=""
                        w={48}
                        h={48}
                        fit="cover"
                        radius="sm"
                        style={{
                          flexShrink: 0,
                          filter: it.status === "removed" ? "grayscale(1)" : undefined,
                        }}
                      />
                    )}
                    <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" truncate td={it.status === "removed" ? "line-through" : undefined}>
                        {it.name}
                      </Text>
                      <Text
                        size="xs"
                        c={
                          it.status === "error"
                            ? "red"
                            : it.status === "done"
                              ? "green"
                              : it.status === "removed"
                                ? "gray"
                                : "dimmed"
                        }
                      >
                        {it.status === "uploading" && "Nahrává se..."}
                        {it.status === "done" && "Hotovo"}
                        {it.status === "error" && (it.error ?? "Chyba")}
                        {it.status === "removed" && "Smazáno na PC"}
                      </Text>
                    </Stack>
                  </Group>
                ))}
              </Stack>
            </Stack>
          </Paper>
        )}

        <Text size="xs" c="dimmed" ta="center">
          Tato stránka může zůstat otevřená — můžeš nahrávat postupně.
        </Text>
      </Stack>
    </Box>
  );
}
