"use client";

/**
 * Compact labeled controls shared by every audio module.
 */

import type { ReactNode } from "react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ------------------------------------------------------------------ */

interface ParamSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  /** Formats the floating value chip, e.g. v => `${v} dB`. */
  display?: (v: number) => string;
  hintLeft?: string;
  hintRight?: string;
}

export function ParamSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  disabled,
  display,
  hintLeft,
  hintRight,
}: ParamSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[10px] md:text-xs lg:text-[13px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] md:text-xs lg:text-[13px] font-semibold text-primary">
          {display ? display(value) : String(value)}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={label}
      />
      {(hintLeft || hintRight) && (
        <div className="flex justify-between font-mono text-[9px] md:text-[10px] text-muted-foreground/70">
          <span>{hintLeft}</span>
          <span>{hintRight}</span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

interface ParamSelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
}

export function ParamSelect({ label, value, options, onChange, disabled }: ParamSelectProps) {
  return (
    <div className="space-y-1.5">
      <p className="font-mono text-[10px] md:text-xs lg:text-[13px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="min-h-11 font-mono text-sm" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="font-mono">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/* ------------------------------------------------------------------ */

interface ParamToggleProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  hint?: string;
}

export function ParamToggle({ label, checked, onChange, disabled, hint }: ParamToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/40 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10px] md:text-xs lg:text-[13px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        {hint && <p className="mt-1 font-mono text-[9px] md:text-[10px] text-muted-foreground/70">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ${
          checked ? "bg-primary" : "bg-muted-foreground/30 dark:bg-input"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 shrink-0 transform rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Panel wrapper giving every control cluster the same chrome. */
export function ParamPanel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-card/40 p-4">
      {title && (
        <p className="font-mono text-[10px] md:text-xs lg:text-[13px] font-semibold uppercase tracking-[0.22em] text-neon/90">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}
