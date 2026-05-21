"use client";

import { TextInput } from "@mantine/core";
import { Search } from "lucide-react";
import { useFilterState } from "@/components/infrastructure/FilterStateProvider";

export function SearchBar() {
  const { searchQuery, setSearchQuery } = useFilterState();

  return (
    <div style={{ width: "100%", maxWidth: 240 }}>
      <TextInput
        placeholder="Hledat inzeráty..."
        leftSection={<Search size={16} color="#e0e0e0" />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.currentTarget.value)}
        radius="xl"
        w="100%"
        styles={{
          input: {
            backgroundColor: "transparent",
            border: "none",
            fontSize: 14,
            color: "#e0e0e0",
          },
        }}
        __vars={{ "--input-placeholder-color": "#b8b8b8" }}
      />
    </div>
  );
}
