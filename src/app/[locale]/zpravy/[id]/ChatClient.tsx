"use client";

import { Stack, Text } from "@mantine/core";
import { ArrowLeft, Check, Send, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/layout/AuthPill";
import { Link, useRouter } from "@/i18n/navigation";

type MsgItem = {
  id: number;
  text: string;
  senderId: number;
  createdAt: number;
  senderName: string;
  senderPicture: string | null;
};

function formatTime(unixSec: number): string {
  const d = new Date(unixSec * 1000);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function formatDateLabel(unixSec: number): string {
  const d = new Date(unixSec * 1000);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Dnes";
  if (d.toDateString() === yesterday.toDateString()) return "Včera";
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
}

export function ChatClient({
  convId,
  currentUserId,
  isInzeratOwner,
  otherUser,
  inzerat,
  initialMessages,
}: {
  convId: number;
  currentUserId: number;
  isInzeratOwner: boolean;
  otherUser: { id: number; name: string; picture: string | null } | null;
  inzerat: { id: number; nazev: string } | null;
  initialMessages: MsgItem[];
}) {
  const INK = "#1a1a1a";
  const CREAM = "#F4EFE3";
  const CARD = "#FBFAF6";
  const ORANGE = "#FF5722";

  const router = useRouter();
  const [msgs, setMsgs] = useState<MsgItem[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastIdRef = useRef(initialMessages.at(-1)?.id ?? 0);

  // Po načtení stránky dej focus do textarea, aby uživatel mohl rovnou psát.
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/chat/conversations/${convId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/zpravy");
      } else {
        setDeleting(false);
        setConfirmDelete(false);
      }
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }, [convId, router]);

  // Scroll dolů při nových zprávách
  useEffect(() => {
    if (msgs.length === 0) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  // Polling každé 3 sekundy pro nové zprávy
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/chat/conversations/${convId}/messages`);
        // 404 = konverzace byla smazána (např. vlastníkem inzerátu) → přesměruj do inboxu
        if (res.status === 404 || res.status === 403) {
          router.push("/zpravy");
          return;
        }
        if (!res.ok) return;
        const data = (await res.json()) as { messages: MsgItem[] };
        const newMsgs = data.messages.filter((m) => m.id > lastIdRef.current);
        const latest = newMsgs.at(-1);
        if (latest) {
          lastIdRef.current = latest.id;
          setMsgs((prev) => [...prev, ...newMsgs]);
        }
      } catch {
        // síťová chyba — tiše ignorujeme, zkusíme příště
      }
    };

    const interval = window.setInterval(poll, 3000);
    return () => window.clearInterval(interval);
  }, [convId, router]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");

    try {
      const res = await fetch(`/api/chat/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        setInput(text); // vrátíme text pokud odeslání selhalo
        return;
      }
      const data = (await res.json()) as { message: MsgItem };
      setMsgs((prev) => [...prev, data.message]);
      lastIdRef.current = data.message.id;
    } finally {
      setSending(false);
    }
  }, [input, sending, convId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // Seskupení zpráv podle dne
  const grouped: { label: string; messages: MsgItem[] }[] = [];
  for (const msg of msgs) {
    const label = formatDateLabel(msg.createdAt);
    const last = grouped.at(-1);
    if (last?.label === label) {
      last.messages.push(msg);
    } else {
      grouped.push({ label, messages: [msg] });
    }
  }

  return (
    <Stack gap={0} maw={680} mx="auto" style={{ height: "calc(100dvh - 120px)", minHeight: 400 }}>
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          background: CARD,
          border: `2px solid ${INK}`,
          borderBottom: "none",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <Link href="/zpravy" style={{ color: "#888780", display: "flex", alignItems: "center" }}>
          <ArrowLeft size={18} />
        </Link>
        {otherUser && <Avatar src={otherUser.picture} name={otherUser.name} size={36} />}
        <Stack gap={1} style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={800} c={INK} truncate>
            {otherUser?.name ?? "Uživatel"}
          </Text>
          {inzerat && (
            <Link href={`/inzeraty/${inzerat.id}`} style={{ textDecoration: "none" }}>
              <Text
                size="xs"
                fw={600}
                style={{ letterSpacing: "0.06em", textTransform: "uppercase", color: "#888780", fontSize: 10 }}
                truncate
              >
                {inzerat.nazev}
              </Text>
            </Link>
          )}
        </Stack>

        {/* Delete tlačítko — jen pro vlastníka inzerátu */}
        {isInzeratOwner && (
          <motion.button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={deleting}
            whileHover={{ backgroundColor: CREAM }}
            whileTap={{ scale: 0.92 }}
            aria-label="Smazat konverzaci"
            style={{
              flexShrink: 0,
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: CARD,
              border: `2px solid ${INK}`,
              color: "#a8201a",
              cursor: deleting ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            <Trash2 size={16} />
          </motion.button>
        )}
      </div>

      {/* Konfirmace smazání — překryje header */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            style={{
              padding: "12px 16px",
              background: CARD,
              border: `2px solid ${INK}`,
              borderTop: "none",
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexShrink: 0,
            }}
          >
            <Text size="sm" fw={700} c={INK} style={{ flex: 1, letterSpacing: "0.02em" }}>
              Smazat celou konverzaci?
            </Text>
            <motion.button
              type="button"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              whileTap={{ scale: 0.94 }}
              style={{
                padding: "6px 10px",
                background: CARD,
                border: `2px solid ${INK}`,
                color: INK,
                cursor: deleting ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "inherit",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              <X size={14} /> Zrušit
            </motion.button>
            <motion.button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              whileTap={{ scale: 0.94 }}
              style={{
                padding: "6px 10px",
                background: "#a8201a",
                border: `2px solid ${INK}`,
                color: "#fff",
                cursor: deleting ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "inherit",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                opacity: deleting ? 0.7 : 1,
              }}
            >
              {deleting ? <Check size={14} /> : <Trash2 size={14} />} {deleting ? "Mažu…" : "Smazat"}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zprávy */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          background: "#F7F4EE",
          border: `2px solid ${INK}`,
          borderBottom: "none",
          borderTop: "none",
        }}
      >
        {msgs.length === 0 && (
          <div style={{ textAlign: "center", paddingTop: 40 }}>
            <Text c="dimmed" size="sm" fw={600} tt="uppercase" style={{ letterSpacing: "0.08em" }}>
              Zahaj konverzaci
            </Text>
            <Text c="dimmed" size="xs" mt={4}>
              Napiš svou první zprávu
            </Text>
          </div>
        )}

        {grouped.map((group) => (
          <div key={group.label}>
            {/* Oddělovač dne */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                margin: "16px 0 12px",
              }}
            >
              <div style={{ flex: 1, height: 1, background: "#d4cfc3" }} />
              <Text
                size="xs"
                c="dimmed"
                fw={700}
                style={{ letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}
              >
                {group.label}
              </Text>
              <div style={{ flex: 1, height: 1, background: "#d4cfc3" }} />
            </div>

            <Stack gap={6}>
              {group.messages.map((msg) => {
                const isMe = msg.senderId === currentUserId;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      display: "flex",
                      flexDirection: isMe ? "row-reverse" : "row",
                      gap: 8,
                      alignItems: "flex-end",
                    }}
                  >
                    {!isMe && (
                      <div style={{ flexShrink: 0 }}>
                        <Avatar src={msg.senderPicture} name={msg.senderName} size={28} />
                      </div>
                    )}
                    <div
                      style={{
                        maxWidth: "72%",
                        padding: "8px 12px",
                        background: isMe ? ORANGE : CARD,
                        border: `2px solid ${INK}`,
                        color: isMe ? "#4A1B0C" : INK,
                      }}
                    >
                      <Text size="sm" fw={500} style={{ lineHeight: 1.45, wordBreak: "break-word" }}>
                        {msg.text}
                      </Text>
                      <Text
                        size="xs"
                        style={{
                          marginTop: 4,
                          opacity: 0.6,
                          fontSize: 10,
                          textAlign: isMe ? "right" : "left",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {formatTime(msg.createdAt)}
                      </Text>
                    </div>
                  </motion.div>
                );
              })}
            </Stack>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        style={{
          display: "flex",
          gap: 0,
          background: CARD,
          border: `2px solid ${INK}`,
          flexShrink: 0,
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Napiš zprávu… (Enter = odeslat)"
          rows={1}
          style={{
            flex: 1,
            padding: "14px 16px",
            border: "none",
            outline: "none",
            resize: "none",
            background: "transparent",
            fontFamily: "inherit",
            fontSize: 14,
            color: INK,
            lineHeight: 1.5,
          }}
        />
        <motion.button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || sending}
          whileTap={input.trim() && !sending ? { scale: 0.94 } : undefined}
          style={{
            width: 52,
            flexShrink: 0,
            background: input.trim() && !sending ? ORANGE : CREAM,
            border: "none",
            borderLeft: `2px solid ${INK}`,
            cursor: input.trim() && !sending ? "pointer" : "not-allowed",
            color: input.trim() && !sending ? "#4A1B0C" : "#888780",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.15s",
          }}
        >
          <Send size={18} />
        </motion.button>
      </div>
    </Stack>
  );
}
