"use client";

import { TextInput, type TextInputProps } from "@mantine/core";
import { Fragment, useRef, useState } from "react";
import {
  GlassDropdownPanel,
  MAX_LIST_HEIGHT,
  OPTION_HEIGHT,
  PANEL_PADDING,
  ReactiveOption,
  ReactiveSeparator,
} from "./GlassDropdownPanel";

type GlassAutocompleteProps = Omit<TextInputProps, "value" | "onChange"> & {
  data: string[];
  value?: string;
  onChange?: (value: string) => void;
};

export function GlassAutocomplete({ data, value = "", onChange, ...rest }: GlassAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLInputElement>(null);

  const filtered = value ? data.filter((item) => item.toLowerCase().includes(value.toLowerCase())) : data;

  const estimatedHeight = Math.min(MAX_LIST_HEIGHT, filtered.length * OPTION_HEIGHT) + PANEL_PADDING;

  return (
    <>
      <TextInput
        {...rest}
        ref={triggerRef}
        value={value}
        onChange={(e) => {
          onChange?.(e.currentTarget.value);
          setOpen(true);
        }}
        onFocus={(e) => {
          rest.onFocus?.(e);
          setOpen(true);
        }}
      />
      <GlassDropdownPanel
        triggerRef={triggerRef}
        open={open && filtered.length > 0}
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
          {filtered.map((item, i) => (
            <Fragment key={item}>
              {i > 0 && <ReactiveSeparator />}
              <ReactiveOption
                value={item}
                selected={item === value}
                onSelect={() => {
                  onChange?.(item);
                  setOpen(false);
                  triggerRef.current?.blur();
                }}
              />
            </Fragment>
          ))}
        </div>
      </GlassDropdownPanel>
    </>
  );
}
