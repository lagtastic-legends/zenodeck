"use client";

import { useEffect, useCallback, useState } from "react";
import { SearchLottieIcon } from "@/components/ui/search-lottie-icon";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { getVisibleTools } from "@/lib/tools/registry";
import { useNavStore } from "@/lib/navigation/nav-store";
import { useSearchStore } from "@/lib/search/search-store";
import { cn } from "@/lib/utils";

const ACCENT_MAP: Record<string, string> = {
  emerald: "bg-emerald-500/10 text-emerald-500",
  cyan: "bg-cyan-500/10 text-cyan-500",
  purple: "bg-purple-500/10 text-purple-500",
  orange: "bg-orange-500/10 text-orange-500",
  red: "bg-red-500/10 text-red-500",
  blue: "bg-blue-500/10 text-blue-500",
  yellow: "bg-yellow-500/10 text-yellow-500",
  pink: "bg-pink-500/10 text-pink-500",
  indigo: "bg-indigo-500/10 text-indigo-500",
};

export function SearchPalette({
  hideTrigger = false,
  triggerClassName,
}: {
  hideTrigger?: boolean;
  triggerClassName?: string;
}) {
  const { isOpen, setOpen, toggle } = useSearchStore();
  const navigate = useNavStore((s) => s.navigate);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [toggle]);

  /* Register as an active overlay so back key/gesture dismisses the search palette first */
  useEffect(() => {
    if (isOpen) {
      return useNavStore.getState().registerOverlay("search-palette", () => {
        setOpen(false);
        return true;
      });
    }
  }, [isOpen, setOpen]);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, [setOpen]);

  return (
    <>
      {!hideTrigger && (
        <button
          onClick={() => setOpen(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={cn(
            "group flex min-h-11 min-w-11 sm:min-h-8 sm:min-w-0 items-center justify-center gap-2 rounded-full border border-border/70 bg-card/60 px-2.5 sm:px-3 py-1.5 text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:text-foreground hover:bg-card/90",
            triggerClassName
          )}
          title="Search Tools (Cmd+K)"
          aria-label="Search Tools"
        >
          <SearchLottieIcon
            isHovered={isHovered}
            isOpen={isOpen}
            className="size-4 text-muted-foreground group-hover:text-primary transition-colors"
          />
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] sm:inline">
            SEARCH
          </span>
        </button>
      )}

      <CommandDialog open={isOpen} onOpenChange={setOpen}>
        <CommandInput placeholder="Search tools, features, converters..." />
        <CommandList>
          <CommandEmpty>No tools found.</CommandEmpty>
          <CommandGroup heading="Tools & Modules">
            {getVisibleTools().map((tool) => (
              <CommandItem
                key={tool.id}
                value={tool.name + " " + tool.description}
                onSelect={() => runCommand(() => navigate(tool.id))}
                className="flex items-center gap-3 py-3 cursor-pointer"
              >
                <div className={`grid size-8 place-items-center rounded-lg ${ACCENT_MAP[tool.accent] || "bg-primary/10 text-primary"}`}>
                  <tool.icon className="size-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-display text-sm font-semibold text-foreground">
                    {tool.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {tool.description}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
