"use client";

import { TextInput, type TextInputProps } from "@mantine/core";
import { AnimatePresence, motion } from "motion/react";
import { Fragment, useEffect, useRef, useState } from "react";
import { LiquidGlass } from "@/components/layout/LiquidGlass";
import { MAX_LIST_HEIGHT, ReactiveOption, ReactiveSeparator } from "./GlassDropdownPanel";

type GlassAutocompleteProps = Omit<TextInputProps, "value" | "onChange"> & {
  data: string[];
  value?: string;
  onChange?: (value: string) => void;
};

/**
 * Autocomplete s FilterChip-stylem snap-free LiquidGlass — TextInput a dropdown jsou
 * uvnitř jedné LiquidGlass instance, která morphuje při otevření dropdownu.
 */
export function GlassAutocomplete({ data, value = "", onChange, ...rest }: GlassAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const filtered = value ? data.filter((item) => item.toLowerCase().includes(value.toLowerCase())) : data;
  const showDropdown = open && filtered.length > 0;

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const triggerInput = (
    <TextInput
      {...rest}
      value={value}
      onChange={(e) => {
        onChange?.(e.currentTarget.value);
        setOpen(true);
      }}
      onFocus={(e) => {
        rest.onFocus?.(e);
        setOpen(true);
      }}
      styles={{
        input: { background: "transparent", border: "none" },
      }}
    />
  );

  return (
    <div ref={containerRef} style={{ position: "relative", display: "block", width: "100%" }}>
      {/* Spacer drží layout */}
      <div aria-hidden="true" style={{ visibility: "hidden" }}>
        {triggerInput}
      </div>

      <motion.div
        layout
        transition={{ type: "spring", bounce: 0.28, duration: 0.5 }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          zIndex: showDropdown ? 100 : 1,
        }}
      >
        <LiquidGlass
          radius={14}
          glassThickness={50}
          bezelWidth={16}
          refractiveIndex={1.5}
          scaleRatio={0.7}
          blur={1.0}
          specularSaturation={4}
          specularOpacity={0.5}
          tintColor="0, 0, 0"
          tintOpacity={0.08}
          innerShadowBlur={10}
          innerShadowSpread={-3}
          outerShadowBlur={20}
          fallbackBlur={16}
        >
          {triggerInput}

          <AnimatePresence initial={false}>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.08, duration: 0.2 } }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                style={{ padding: "2px 6px 6px" }}
              >
                <div
                  role="listbox"
                  style={{
                    maxHeight: MAX_LIST_HEIGHT,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {filtered.map((item, i) => (
                    <Fragment key={item}>
                      {i > 0 && <ReactiveSeparator />}
                      <ReactiveOption
                        value={item}
                        selected={item === value}
                        onSelect={() => {
                          onChange?.(item);
                          setOpen(false);
                        }}
                      />
                    </Fragment>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </LiquidGlass>
      </motion.div>
    </div>
  );
}
