"use client";

import { Input } from "@mantine/core";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Fragment, type ReactNode, useEffect, useRef, useState } from "react";
import { LiquidGlass } from "@/components/layout/LiquidGlass";
import { MAX_LIST_HEIGHT, ReactiveOption, ReactiveSeparator } from "./GlassDropdownPanel";

type GlassSelectProps = {
  label?: string;
  placeholder?: string;
  data: string[];
  value?: string;
  onChange?: (value: string) => void;
  error?: ReactNode;
};

/**
 * Select s FilterChip-stylem snap-free LiquidGlass: jeden LiquidGlass od mountu,
 * který morphuje (`motion.div layout`) když se otevře dropdown s options.
 * Žádný portal → žádný cold-mount snap.
 */
export function GlassSelect({ label, placeholder, data, value, onChange, error }: GlassSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const TriggerInner = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 6,
        color: "var(--mantine-color-text)",
        fontSize: 14,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ color: value ? undefined : "var(--mantine-color-placeholder)" }}>{value || placeholder}</span>
      <ChevronDown
        size={16}
        style={{
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s",
          flexShrink: 0,
        }}
      />
    </div>
  );

  return (
    <Input.Wrapper label={label} error={error}>
      <div ref={containerRef} style={{ position: "relative", display: "block", width: "100%" }}>
        {/* Spacer drží layout pro zavřený stav (formulářová políčka pod ním se nepohnou) */}
        <div aria-hidden="true" style={{ visibility: "hidden", padding: "10px 14px" }}>
          {TriggerInner}
        </div>

        {/* Skutečný chip — absolute, roste přes sousedy když je otevřený */}
        <motion.div
          layout
          transition={{ type: "spring", bounce: 0.28, duration: 0.5 }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            zIndex: open ? 100 : 1,
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
            <motion.button
              type="button"
              onClick={() => setOpen((o) => !o)}
              whileTap={{ scale: 0.985 }}
              transition={{ type: "spring", stiffness: 500, damping: 28 }}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                width: "100%",
                padding: "10px 14px",
                display: "block",
                textAlign: "left",
                fontFamily: "inherit",
              }}
            >
              {TriggerInner}
            </motion.button>

            <AnimatePresence initial={false}>
              {open && (
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
                    {data.map((item, i) => (
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
    </Input.Wrapper>
  );
}
