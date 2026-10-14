"use client";

import { Cpu, ShieldCheck, Mail, MapPin, Download, Smartphone } from "lucide-react";
import Link from "next/link";
import { usePwaStore } from "@/lib/pwa/pwa-store";

export function AppFooter() {
  const currentYear = new Date().getFullYear();
  const setDownloadModalOpen = usePwaStore((s) => s.setDownloadModalOpen);

  return (
    <footer className="mt-auto border-t border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
        {/* Main Footer Row */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          {/* Brand & Address */}
          <div className="space-y-1.5 text-left">
            <div className="flex items-center gap-2">
              <span className="font-display text-xs font-bold tracking-[0.24em] text-foreground uppercase">
                ZENODECK LABS
              </span>
            </div>

            <p className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
              <MapPin className="size-3 shrink-0 text-primary" />
              100 Montgomery St, Suite 1400, San Francisco, CA 94104
            </p>

            <p className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
              <Mail className="size-3 shrink-0 text-neon" />
              <a href="mailto:support.zenodeck@gmail.com" className="hover:text-foreground transition-colors underline">
                support.zenodeck@gmail.com
              </a>
            </p>
          </div>

          {/* Trust Guarantees */}
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
              <Cpu className="size-3.5 text-neon" />
              100% on-device processing
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
              <ShieldCheck className="size-3.5 text-pulse" />
              zero file uploads
            </span>
          </div>
        </div>

        {/* Bottom Legal & Links Row */}
        <div className="flex flex-col gap-3 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[10px] text-muted-foreground">
            © {currentYear} ZenoDeck Labs, Inc. All rights reserved. Powered by WebAssembly.
          </p>

          <nav aria-label="Legal and Help" className="flex flex-wrap items-center gap-3 sm:gap-4 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("zenodeck:open-whats-new"));
                }
              }}
              className="flex items-center gap-1 text-primary hover:underline transition-colors cursor-pointer"
            >
              <span>v3.15.0 · What's New</span>
            </button>
            <span className="text-border">·</span>
            <button
              type="button"
              onClick={() => setDownloadModalOpen(true)}
              className="flex items-center gap-1 text-primary hover:underline transition-colors cursor-pointer"
            >
              <Smartphone className="size-3" />
              <span>Get App (APK/PWA)</span>
            </button>
            <span className="text-border">·</span>
            <a
              href="/zenodeck.apk"
              download="zenodeck.apk"
              className="flex items-center gap-1 text-emerald-400 hover:underline transition-colors"
            >
              <Download className="size-3" />
              <span>APK (11.98MB)</span>
            </a>
            <span className="text-border">·</span>
            <Link
              href="/privacy"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <span className="text-border">·</span>
            <Link
              href="/terms"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
            <span className="text-border">·</span>
            <Link
              href="/thank-you"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Status
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
