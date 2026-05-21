"use client";

import { Alert, Badge, Box, Button, Group, Image, Paper, Progress, Stack, Text, Title } from "@mantine/core";
import { Camera, CheckCircle2, ImageIcon, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type UploadedItem = {
  id: string;
  name: string;
  status: "uploading" | "done" | "error" | "removed";
  thumbUrl?: string;
  webPath?: string;
  error?: string;
};

export default function NahravaniObrazkuClient({ sessionKey }: { sessionKey: string }) {
  const [items, setItems] = useState<UploadedItem[]>([]);
  const [sessionOk, setSessionOk] = useState<boolean | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!sessionKey) {
      setSessionOk(false);
      return;
    }
    fetch(`/api/upload-session/${sessionKey}`)
      .then((r) => setSessionOk(r.ok))
      .catch(() => setSessionOk(false));
  }, [sessionKey]);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      if (arr.length === 0 || !sessionKey) return;

      const newItems: UploadedItem[] = arr.map((f) => ({
        id: `${f.name}-${f.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        name: f.name,
        status: "uploading",
        thumbUrl: URL.createObjectURL(f),
      }));
      setItems((prev) => [...prev, ...newItems]);

      for (let i = 0; i < arr.length; i++) {
        const file = arr[i];
        const itemId = newItems[i].id;
        try {
          const fd = new FormData();
          fd.append("foto", file);
          const res = await fetch(`/api/upload-session/${sessionKey}/foto`, {
            method: "POST",
            body: fd,
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = (await res.json()) as { uploaded: { webPath: string }[] };
          const webPath = data.uploaded[0]?.webPath;
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
    [sessionKey],
  );

  // Sync s PC — když na PC fotku smažou, označíme ji zde jako "removed"
  useEffect(() => {
    if (!sessionKey || sessionOk !== true) return;
    let stopped = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/upload-session/${sessionKey}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { fotky: { webPath: string }[] };
        const alive = new Set(data.fotky.map((f) => f.webPath));
        setItems((prev) =>
          prev.map((it) =>
            it.status === "done" && it.webPath && !alive.has(it.webPath) ? { ...it, status: "removed" } : it,
          ),
        );
      } catch {
        /* ignoruj */
      }
    };
    const interval = setInterval(() => {
      if (!stopped) tick();
    }, 2500);
    return () => {
      stopped = true;
      clearInterval(interval);
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

        <Group grow gap="sm">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files) uploadFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files) uploadFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <Button
            size="lg"
            leftSection={<Camera size={20} />}
            onClick={() => cameraInputRef.current?.click()}
            color="orange"
          >
            Vyfotit
          </Button>
          <Button
            size="lg"
            variant="light"
            leftSection={<ImageIcon size={20} />}
            onClick={() => galleryInputRef.current?.click()}
          >
            Galerie
          </Button>
        </Group>

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

              {uploadingCount > 0 && <Progress value={(doneCount / items.length) * 100} animated />}

              <Stack gap="xs">
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
