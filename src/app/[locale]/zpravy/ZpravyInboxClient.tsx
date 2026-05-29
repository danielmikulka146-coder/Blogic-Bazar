"use client";

import { Stack, Text, Title } from "@mantine/core";
import { Check, MessageSquare, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Avatar } from "@/components/layout/AuthPill";
import { Link } from "@/i18n/navigation";

type ConvItem = {
  id: number;
  inzeratId: number | null;
  inzeratNazev: string;
  buyerId: number;
  buyerName: string;
  buyerPicture: string | null;
  sellerId: number;
  sellerName: string;
  sellerPicture: string | null;
  lastMessageAt: number;
  lastMessage: string | null;
  lastMessageSenderId: number | null;
  isRead: boolean | number;
};

function formatRelativeTime(unixSec: number): string {
  const diff = Math.floor(Date.now() / 1000) - unixSec;
  if (diff < 60) return "Právě teď";
  if (diff < 3600) return `Před ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Před ${Math.floor(diff / 3600)} hod`;
  const d = new Date(unixSec * 1000);
  return `${d.getDate()}. ${d.getMonth() + 1}.`;
}

export function ZpravyInboxClient({
  conversations,
  currentUserId,
}: {
  conversations: ConvItem[];
  currentUserId: number;
}) {
  const INK = "#1a1a1a";
  const CREAM = "#F4EFE3";
  const CARD = "#FBFAF6";

  // Lokální stav — po smazání odebereme konverzaci z UI bez router.refresh()
  const [convs, setConvs] = useState(conversations);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/chat/conversations/${id}`, { method: "DELETE" });
      if (res.ok) {
        setConvs((prev) => prev.filter((c) => c.id !== id));
        setConfirmId(null);
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Stack gap="xl" maw={680} mx="auto">
      <Stack gap={4} pt={8}>
        <Title order={1} style={{ fontSize: 28, fontWeight: 800, color: INK }}>
          Zprávy
        </Title>
        <Text size="sm" c="dimmed" fw={500}>
          {convs.length === 0
            ? "Zatím žádné konverzace"
            : `${convs.length} konverzac${convs.length === 1 ? "e" : convs.length < 5 ? "e" : "í"}`}
        </Text>
      </Stack>

      {convs.length === 0 ? (
        <div
          style={{
            padding: "48px 24px",
            textAlign: "center",
            background: CARD,
            border: "2px dotted #1a1a1a",
          }}
        >
          <MessageSquare size={32} style={{ color: "#888780", marginBottom: 12 }} />
          <Text c="dimmed" size="sm" fw={600} tt="uppercase" style={{ letterSpacing: "0.08em" }}>
            Žádné konverzace
          </Text>
          <Text c="dimmed" size="xs" mt={4}>
            Napiš prodejci na stránce inzerátu
          </Text>
        </div>
      ) : (
        <Stack gap={2}>
          {convs.map((conv) => {
            const isBuyer = conv.buyerId === currentUserId;
            const otherName = isBuyer ? conv.sellerName : conv.buyerName;
            const otherPicture = isBuyer ? conv.sellerPicture : conv.buyerPicture;
            const isUnread = !conv.isRead;
            const isOwner = conv.sellerId === currentUserId;
            const isConfirming = confirmId === conv.id;
            const isDeleting = deletingId === conv.id;

            return (
              <div
                key={conv.id}
                style={{
                  position: "relative",
                  background: CARD,
                  border: `2px solid ${INK}`,
                  borderBottom: "none",
                }}
              >
                <Link
                  href={`/zpravy/${conv.id}`}
                  style={{ textDecoration: "none", display: "block" }}
                  onClick={(e) => {
                    // Při otevřené konfirmaci klik na řádek konfirmaci zruší namísto navigace
                    if (isConfirming) {
                      e.preventDefault();
                      setConfirmId(null);
                    }
                  }}
                >
                  <motion.div
                    whileHover={isConfirming ? undefined : { backgroundColor: CREAM }}
                    transition={{ duration: 0.12 }}
                    style={{
                      padding: "14px 16px",
                      paddingRight: isOwner ? 56 : 16,
                      display: "flex",
                      gap: 14,
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ flexShrink: 0, position: "relative" }}>
                      <Avatar src={otherPicture} name={otherName} size={44} />
                      {isUnread && (
                        <span
                          style={{
                            position: "absolute",
                            top: 0,
                            right: 0,
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: "#FF5722",
                            border: `2px solid ${CARD}`,
                          }}
                        />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                        <Text size="sm" fw={isUnread ? 800 : 600} c={INK} truncate style={{ letterSpacing: "0.01em" }}>
                          {otherName}
                        </Text>
                        <Text size="xs" c="dimmed" fw={500} style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                          {formatRelativeTime(conv.lastMessageAt)}
                        </Text>
                      </div>
                      <Text
                        size="xs"
                        c="dimmed"
                        fw={600}
                        truncate
                        style={{ letterSpacing: "0.04em", textTransform: "uppercase", fontSize: 10 }}
                      >
                        {conv.inzeratNazev}
                      </Text>
                      {conv.lastMessage && (
                        <Text
                          size="xs"
                          c={isUnread ? INK : "dimmed"}
                          fw={isUnread ? 700 : 400}
                          truncate
                          mt={2}
                          style={{ fontStyle: "italic" }}
                        >
                          {conv.lastMessageSenderId === currentUserId ? "Ty: " : ""}
                          {conv.lastMessage}
                        </Text>
                      )}
                    </div>
                  </motion.div>
                </Link>

                {/* Delete UI — jen pro vlastníka inzerátu */}
                {isOwner && (
                  <AnimatePresence mode="wait" initial={false}>
                    {isConfirming ? (
                      <motion.div
                        key="confirm"
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        transition={{ duration: 0.14 }}
                        style={{
                          position: "absolute",
                          top: 0,
                          right: 0,
                          bottom: 0,
                          display: "flex",
                          alignItems: "stretch",
                          gap: 0,
                          background: CARD,
                          paddingLeft: 8,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setConfirmId(null)}
                          disabled={isDeleting}
                          aria-label="Zrušit smazání"
                          style={{
                            width: 40,
                            background: CARD,
                            border: `2px solid ${INK}`,
                            borderRight: "none",
                            cursor: isDeleting ? "not-allowed" : "pointer",
                            color: INK,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontFamily: "inherit",
                          }}
                        >
                          <X size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(conv.id)}
                          disabled={isDeleting}
                          aria-label="Potvrdit smazání"
                          style={{
                            width: 40,
                            background: "#a8201a",
                            border: `2px solid ${INK}`,
                            cursor: isDeleting ? "not-allowed" : "pointer",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontFamily: "inherit",
                            opacity: isDeleting ? 0.7 : 1,
                          }}
                        >
                          {isDeleting ? <Check size={16} /> : <Trash2 size={16} />}
                        </button>
                      </motion.div>
                    ) : (
                      <motion.button
                        key="trash"
                        type="button"
                        onClick={() => setConfirmId(conv.id)}
                        whileHover={{ backgroundColor: CREAM }}
                        whileTap={{ scale: 0.92 }}
                        aria-label="Smazat konverzaci"
                        style={{
                          position: "absolute",
                          top: "50%",
                          right: 10,
                          transform: "translateY(-50%)",
                          width: 36,
                          height: 36,
                          background: CARD,
                          border: `2px solid ${INK}`,
                          cursor: "pointer",
                          color: "#a8201a",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: "inherit",
                        }}
                      >
                        <Trash2 size={15} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                )}
              </div>
            );
          })}
          {/* Spodní okraj poslední položky */}
          <div style={{ height: 2, background: INK }} />
        </Stack>
      )}
    </Stack>
  );
}
