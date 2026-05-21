"use client";

import { Input } from "@mantine/core";
import { ChevronDown } from "lucide-react";
import { Fragment, type ReactNode, useRef, useState } from "react";
import {
  GlassDropdownPanel,
  MAX_LIST_HEIGHT,
  OPTION_HEIGHT,
  PANEL_PADDING,
  ReactiveOption,
  ReactiveSeparator,
} from "./GlassDropdownPanel";

type GlassSelectProps = {
  label?: string;
  placeholder?: string;
  data: string[];
  value?: string;
  onChange?: (value: string) => void;
  error?: ReactNode;
};

export function GlassSelect({ label, placeholder, data, value, onChange, error }: GlassSelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const estimatedHeight = Math.min(MAX_LIST_HEIGHT, data.length * OPTION_HEIGHT) + PANEL_PADDING;

  return (
    <Input.Wrapper label={label} error={error}>
      <Input
        component="button"
        type="button"
        ref={triggerRef}
        pointer
        onClick={() => setOpen((o) => !o)}
        rightSection={
          <ChevronDown
            size={16}
            style={{
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          />
        }
        styles={{
          input: {
            textAlign: "left",
            color: value ? undefined : "var(--mantine-color-placeholder)",
          },
        }}
      >
        {value || placeholder}
      </Input>

      <GlassDropdownPanel
        triggerRef={triggerRef}
        open={open}
        onClose={() => setOpen(false)}
        estimatedHeight={estimatedHeight}
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
      </GlassDropdownPanel>
    </Input.Wrapper>
  );
}
