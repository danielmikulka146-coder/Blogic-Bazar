"use client";

import { Autocomplete } from "@mantine/core";
import { Search } from "lucide-react";

export function SearchBar() {
  return (
    <Autocomplete
      placeholder="Hledat inzeráty..."
      leftSection={<Search size={16} />}
      data={["Nábytek", "Elektronika", "Knihy", "Oblečení", "Dětské věci"]}
      radius="xl"
      w="100%"
      maw={480}
      styles={{
        input: {
          backgroundColor: "transparent",
          border: "none",
          fontSize: 14,
        },
      }}
    />
  );
}
