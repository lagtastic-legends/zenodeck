"use client";

/**
 * OMNI TOOL — Phase 7: complete suite.
 * AuthProvider (Google Sign-In + security gate) wraps the engine and vault
 * providers; the single-canvas SPA renders inside AppShell.
 */

import { AppShell } from "@/components/shell/app-shell";
import { AuthProvider } from "@/lib/auth/auth-context";
import { FFmpegEngineProvider } from "@/lib/ffmpeg/ffmpeg-context";
import { VaultProvider } from "@/lib/vault/vault-context";
import { SensoryProvider } from "@/components/sensory/SensoryProvider";

export default function Home() {
  return (
    <AuthProvider>
      <FFmpegEngineProvider>
        <VaultProvider>
          <SensoryProvider>
            <AppShell />
          </SensoryProvider>
        </VaultProvider>
      </FFmpegEngineProvider>
    </AuthProvider>
  );
}
