"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Wrench, Database } from "lucide-react";
import { SearchLottieIcon } from "@/components/ui/search-lottie-icon";
import { useNavStore } from "@/lib/navigation/nav-store";
import { useSearchStore } from "@/lib/search/search-store";
import { cn } from "@/lib/utils";

/**
 * Sticky Mobile CTA that docks to the bottom of the viewport on mobile devices.
 * Automatically conceals itself when a tool is active to prevent blocking tool interactions.
 */
export function StickyMobileCta() {
  const view = useNavStore((s) => s.view);
  const navigate = useNavStore((s) => s.navigate);
  const openSearch = useSearchStore((s) => s.open);

  if (view !== "dashboard") return null;

  const scrollToTools = () => {
    const el = document.getElementById("tool-matrix");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 26 }}
        aria-label="Mobile Quick Actions"
        className="fixed bottom-0 left-0 right-0 z-30 sm:hidden border-t border-border/80 bg-background/85 backdrop-blur-xl px-3 sm:px-4 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pl-[calc(env(safe-area-inset-left)+0.75rem)] pr-[calc(env(safe-area-inset-right)+0.75rem)] shadow-elevation2"
      >
        <div className="mx-auto flex max-w-md items-center justify-between gap-2.5">
          {/* Quick Tool Explorer CTA */}
          <motion.button
            type="button"
            onClick={scrollToTools}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 450, damping: 22 }}
            className="flex flex-1 min-h-[44px] items-center justify-center gap-2 rounded-tactile bg-primary py-2.5 px-3.5 font-display text-[11px] font-bold uppercase tracking-wider text-primary-foreground shadow-tactile active:shadow-none"
          >
            <Wrench className="size-3.5 shrink-0" />
            <span>Tools</span>
          </motion.button>

          {/* Quick Search */}
          <motion.button
            type="button"
            onClick={openSearch}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 450, damping: 22 }}
            className="group flex min-h-[44px] items-center justify-center gap-1.5 rounded-tactile border border-border/80 bg-card/70 py-2.5 px-4 font-mono text-[11px] font-medium text-muted-foreground shadow-tactile hover:text-foreground hover:border-primary/40 transition-colors"
          >
            <SearchLottieIcon className="size-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
            <span>Search</span>
          </motion.button>

          {/* Quick Vault */}
          <motion.button
            type="button"
            onClick={() => navigate("vault")}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 450, damping: 22 }}
            className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-tactile border border-border/80 bg-card/70 py-2.5 px-4 font-mono text-[11px] font-medium text-neon shadow-tactile hover:border-neon/40"
          >
            <Database className="size-3.5 shrink-0" />
            <span>Vault</span>
          </motion.button>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
