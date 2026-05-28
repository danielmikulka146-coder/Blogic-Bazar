"use client";

import { TextInput } from "@mantine/core";
import { Search } from "lucide-react";
import { useFilterState } from "@/components/infrastructure/FilterStateProvider";

const INK = "#1a1a1a";
const CARD = "#FBFAF6";

export function SearchBar() {
  const { searchQuery, setSearchQuery } = useFilterState();

  return (
    <div style={{ width: "100%", maxWidth: 340 }}>
      <TextInput
        placeholder="Hledat inzerát…"
        leftSection={<Search size={16} color={INK} />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.currentTarget.value)}
        radius={0}
        w="100%"
        styles={{
          input: {
            backgroundColor: CARD,
            border: `2px dotted ${INK}`,
            borderRadius: 0,
            fontSize: 13,
            color: INK,
            fontFamily: "var(--font-jb-mono), 'Courier New', ui-monospace, monospace",
            height: 36,
            minHeight: 36,
          },
        }}
        __vars={{ "--input-placeholder-color": "#7d7c78" }}
      />
    </div>
  );
}
