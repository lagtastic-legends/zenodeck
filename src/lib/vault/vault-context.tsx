"use client";

/**
 * VaultProvider — app-wide vault state: items, totals, save/remove/clear.
 * OutputCard consumes `saveToVault` so EVERY tool gains vault persistence
 * without per-tool wiring.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useToast } from "@/hooks/use-toast";
import {
  newVaultId,
  vaultClear,
  vaultDelete,
  vaultEstimate,
  vaultKindForMime,
  vaultList,
  vaultPut,
  vaultRequestPersistence,
  type StorageEstimateInfo,
  type VaultItem,
} from "@/lib/vault/vault-db";

export interface SaveToVaultInput {
  name: string;
  blob: Blob;
  mime: string;
  size?: number;
}

interface VaultContextValue {
  items: VaultItem[];
  ready: boolean;
  totalBytes: number;
  estimate: StorageEstimateInfo | null;
  save: (input: SaveToVaultInput) => Promise<VaultItem | null>;
  remove: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [ready, setReady] = useState(false);
  const [estimate, setEstimate] = useState<StorageEstimateInfo | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [list, est] = await Promise.all([vaultList(), vaultEstimate()]);
      setItems(list);
      setEstimate(est);
    } catch {
      /* vault unavailable (private mode?) — keep empty state */
      setItems([]);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const [list, est] = await Promise.all([vaultList(), vaultEstimate()]);
        if (active) {
          setItems(list);
          setEstimate(est);
        }
      } catch {
        if (active) setItems([]);
      } finally {
        if (active) setReady(true);
      }
      void vaultRequestPersistence();
    };
    void init();
    return () => {
      active = false;
    };
  }, []);

  const save = useCallback(
    async (input: SaveToVaultInput): Promise<VaultItem | null> => {
      const item: VaultItem = {
        id: newVaultId(),
        name: input.name,
        mime: input.mime,
        size: input.size ?? input.blob.size,
        kind: vaultKindForMime(input.mime),
        createdAt: Date.now(),
        blob: input.blob,
      };
      try {
        await vaultPut(item);
        setItems((prev) => [item, ...prev]);
        setEstimate((prev) =>
          prev
            ? {
                usage: prev.usage + item.size,
                quota: prev.quota,
                percent: prev.quota > 0 ? (prev.usage + item.size) / prev.quota : 0,
              }
            : prev,
        );
        return item;
      } catch {
        toast({
          title: "Vault save failed",
          description: "Storage may be full or blocked in this browser mode.",
          variant: "destructive",
        });
        return null;
      }
    },
    [toast],
  );

  const remove = useCallback(async (id: string) => {
    await vaultDelete(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    const est = await vaultEstimate().catch(() => null);
    if (est) setEstimate(est);
  }, []);

  const clearAll = useCallback(async () => {
    await vaultClear();
    setItems([]);
    const est = await vaultEstimate().catch(() => null);
    if (est) setEstimate(est);
  }, []);

  const totalBytes = useMemo(
    () => items.reduce((acc, i) => acc + i.size, 0),
    [items],
  );

  const value = useMemo<VaultContextValue>(
    () => ({ items, ready, totalBytes, estimate, save, remove, clearAll, refresh }),
    [items, ready, totalBytes, estimate, save, remove, clearAll, refresh],
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used inside <VaultProvider>.");
  return ctx;
}
