"use client";

import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface PinCodeInputProps {
  length?: number;
  value?: string;
  onChange?: (code: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function PinCodeInput({
  length = 6,
  value = "",
  onChange,
  onComplete,
  disabled = false,
  autoFocus = false,
  className,
  ariaLabel = "6-digit pairing code",
}: PinCodeInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Pad or slice value to match length
  const digits = Array.from({ length }, (_, i) => value[i] || "");

  useEffect(() => {
    if (autoFocus && inputRefs.current[0] && !disabled) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus, disabled]);

  const handleInputChange = (index: number, char: string) => {
    // Only accept numeric digits
    const cleaned = char.replace(/\D/g, "");
    if (!cleaned) {
      // User erased
      const newDigits = [...digits];
      newDigits[index] = "";
      const newCode = newDigits.join("");
      onChange?.(newCode);
      return;
    }

    const lastDigit = cleaned.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = lastDigit;
    const newCode = newDigits.join("");

    onChange?.(newCode);

    if (newCode.length === length) {
      onComplete?.(newCode);
    }

    // Auto-advance to next input
    if (index < length - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
      inputRefs.current[index + 1]?.select();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        // Current slot is already empty, jump to previous and clear it
        e.preventDefault();
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        const newCode = newDigits.join("");
        onChange?.(newCode);
        inputRefs.current[index - 1]?.focus();
        inputRefs.current[index - 1]?.select();
      } else {
        const newDigits = [...digits];
        newDigits[index] = "";
        const newCode = newDigits.join("");
        onChange?.(newCode);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
      inputRefs.current[index - 1]?.select();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
      inputRefs.current[index + 1]?.select();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    const numericChars = pastedData.replace(/\D/g, "").slice(0, length);
    if (!numericChars) return;

    onChange?.(numericChars);

    if (numericChars.length === length) {
      onComplete?.(numericChars);
      const lastIndex = length - 1;
      inputRefs.current[lastIndex]?.focus();
    } else {
      const nextIndex = Math.min(numericChars.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("flex items-center justify-center gap-1.5 sm:gap-2", className)}
    >
      {Array.from({ length }).map((_, index) => {
        const isMiddle = length === 6 && index === 3;
        return (
          <React.Fragment key={index}>
            {isMiddle && (
              <span className="text-muted-foreground/40 font-mono text-lg font-bold select-none px-0.5">
                –
              </span>
            )}
            <input
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digits[index]}
              disabled={disabled}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              onFocus={(e) => e.target.select()}
              aria-label={`Digit ${index + 1} of ${length}`}
              className={cn(
                "w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-mono font-bold",
                "bg-background/80 border-2 rounded-xl text-foreground shadow-sm transition-all duration-150",
                "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
                digits[index] ? "border-primary/60 bg-primary/5" : "border-border/60",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
}
