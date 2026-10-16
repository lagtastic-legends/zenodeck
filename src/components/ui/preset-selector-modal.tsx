"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ZenoModal } from "./zeno-modal";
import {
  Sparkles,
  Zap,
  Sliders,
  Pin,
  PinOff,
  Trash2,
  Plus,
  Check,
  Search,
  Cpu,
  Layers,
  Share2,
  FileCheck,
} from "lucide-react";
import { useHaptics } from "@/hooks/use-haptics";

export type PresetCategory = "all" | "recommended" | "social" | "studio" | "custom";

export type ExecutionTier =
  | "Tier 1: FastCopy"
  | "Tier 2: Media3 HW"
  | "Tier 3: WebCodecs"
  | "Tier 4: Wasm MT";

export interface PresetItem {
  id: string;
  name: string;
  description: string;
  category: "recommended" | "social" | "studio" | "custom";
  engineTier: ExecutionTier;
  chips: string[];
  params: Record<string, any>;
  isPinned?: boolean;
  isCustom?: boolean;
}

interface PresetSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  toolId: string;
  toolTitle: string;
  builtinPresets: PresetItem[];
  activePresetId?: string;
  onSelectPreset: (preset: PresetItem) => void;
  currentSettings?: Record<string, any>;
}

const TIER_STYLES: Record<ExecutionTier, { bg: string; text: string; border: string }> = {
  "Tier 1: FastCopy": {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  "Tier 2: Media3 HW": {
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
  },
  "Tier 3: WebCodecs": {
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    border: "border-violet-500/30",
  },
  "Tier 4: Wasm MT": {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
};

export function PresetSelectorModal({
  isOpen,
  onClose,
  toolId,
  toolTitle,
  builtinPresets,
  activePresetId,
  onSelectPreset,
  currentSettings,
}: PresetSelectorModalProps) {
  const haptics = useHaptics();
  const [activeCategory, setActiveCategory] = useState<PresetCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [customPresets, setCustomPresets] = useState<PresetItem[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDesc, setCustomDesc] = useState("");

  const storageKeyCustom = `zeno_custom_presets_${toolId}`;
  const storageKeyPinned = `zeno_pinned_presets_${toolId}`;

  // Load custom presets & pinned IDs from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const rawCustom = localStorage.getItem(storageKeyCustom);
      if (rawCustom) {
        setCustomPresets(JSON.parse(rawCustom));
      }
      const rawPinned = localStorage.getItem(storageKeyPinned);
      if (rawPinned) {
        setPinnedIds(JSON.parse(rawPinned));
      }
    } catch (e) {
      console.warn("Failed to load custom presets:", e);
    }
  }, [storageKeyCustom, storageKeyPinned]);

  const saveCustomPresetsToDisk = (items: PresetItem[]) => {
    setCustomPresets(items);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKeyCustom, JSON.stringify(items));
      } catch (e) {
        console.warn("Failed to persist custom presets:", e);
      }
    }
  };

  const savePinnedIdsToDisk = (ids: string[]) => {
    setPinnedIds(ids);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKeyPinned, JSON.stringify(ids));
      } catch (e) {
        console.warn("Failed to persist pinned presets:", e);
      }
    }
  };

  const handleTogglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.impact("light");
    const next = pinnedIds.includes(id)
      ? pinnedIds.filter((p) => p !== id)
      : [...pinnedIds, id];
    savePinnedIdsToDisk(next);
  };

  const handleDeleteCustom = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.notification("warning");
    const next = customPresets.filter((p) => p.id !== id);
    saveCustomPresetsToDisk(next);
    if (pinnedIds.includes(id)) {
      savePinnedIdsToDisk(pinnedIds.filter((p) => p !== id));
    }
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    haptics.notification("success");
    const newPreset: PresetItem = {
      id: `custom_${Date.now()}`,
      name: customName.trim(),
      description: customDesc.trim() || "User defined custom studio profile",
      category: "custom",
      engineTier: "Tier 1: FastCopy",
      chips: currentSettings
        ? Object.entries(currentSettings)
            .filter(([_, v]) => typeof v === "string" || typeof v === "number")
            .slice(0, 4)
            .map(([k, v]) => `${k}: ${v}`)
        : ["Custom Preset"],
      params: currentSettings || {},
      isCustom: true,
    };

    saveCustomPresetsToDisk([newPreset, ...customPresets]);
    setCustomName("");
    setCustomDesc("");
    setIsCreatingCustom(false);
    setActiveCategory("custom");
  };

  // Combine and sort presets
  const allPresets = useMemo(() => {
    const list = [...customPresets, ...builtinPresets].map((p) => ({
      ...p,
      isPinned: pinnedIds.includes(p.id),
    }));

    return list.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
  }, [customPresets, builtinPresets, pinnedIds]);

  const filteredPresets = useMemo(() => {
    return allPresets.filter((item) => {
      const matchCat =
        activeCategory === "all"
          ? true
          : activeCategory === "custom"
          ? item.isCustom
          : item.category === activeCategory;

      const matchSearch =
        searchQuery.trim() === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.chips.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchCat && matchSearch;
    });
  }, [allPresets, activeCategory, searchQuery]);

  return (
    <ZenoModal
      isOpen={isOpen}
      onClose={onClose}
      title={`${toolTitle} Presets`}
      subtitle="Hardware-grade profiles & custom workflows"
      icon={<Zap className="size-5" />}
      maxWidthClassName="sm:max-w-xl"
      overlayId={`preset-modal-${toolId}`}
      footer={
        <div className="flex items-center justify-between gap-3">
          {currentSettings && (
            <button
              type="button"
              onClick={() => {
                haptics.impact("light");
                setIsCreatingCustom((prev) => !prev);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 font-mono text-xs text-primary hover:bg-primary/20 transition-all cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>{isCreatingCustom ? "Cancel New Preset" : "Save Current Settings as Preset"}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-xl border border-border/80 bg-secondary/60 px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Custom Preset Creation Form */}
        {isCreatingCustom && (
          <form
            onSubmit={handleSaveCustom}
            className="p-4 rounded-xl border border-primary/40 bg-primary/5 space-y-3"
          >
            <div className="flex items-center gap-2 font-display text-xs font-bold text-primary">
              <Sparkles className="size-3.5" />
              <span>Create Custom Preset from Active Parameters</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Preset Name (e.g. My Ultra 4K MP3)"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                required
                className="w-full rounded-lg border border-border/70 bg-background/80 px-3 py-1.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <input
                type="text"
                placeholder="Short Description (Optional)"
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
                className="w-full rounded-lg border border-border/70 bg-background/80 px-3 py-1.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreatingCustom(false)}
                className="rounded-lg px-3 py-1 font-mono text-xs text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground hover:brightness-110 transition-all cursor-pointer"
              >
                <Check className="size-3.5" />
                <span>Save Preset</span>
              </button>
            </div>
          </form>
        )}

        {/* Search & Category Filter Strip */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter presets by name, tier, or parameters…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border/70 bg-secondary/40 pl-9 pr-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none transition-colors"
            />
          </div>

          {/* Categories Pill Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: "all", label: "All Presets" },
              { id: "recommended", label: "Recommended" },
              { id: "social", label: "Social / Messaging" },
              { id: "studio", label: "Studio Master" },
              { id: "custom", label: `My Custom (${customPresets.length})` },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  haptics.impact("light");
                  setActiveCategory(cat.id as PresetCategory);
                }}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-[11px] font-semibold transition-all cursor-pointer ${
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "border border-border/60 bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Preset Cards Grid */}
        <div className="grid grid-cols-1 gap-2.5">
          {filteredPresets.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-border/60 bg-secondary/20">
              <Sliders className="size-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="font-mono text-xs text-muted-foreground">
                No presets found matching your filter criteria.
              </p>
            </div>
          ) : (
            filteredPresets.map((preset) => {
              const isSelected = activePresetId === preset.id;
              const tierStyle = TIER_STYLES[preset.engineTier] || TIER_STYLES["Tier 1: FastCopy"];

              return (
                <div
                  key={preset.id}
                  onClick={() => {
                    haptics.impact("medium");
                    onSelectPreset(preset);
                    onClose();
                  }}
                  className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(139,92,246,0.15)] ring-1 ring-primary"
                      : "border-border/70 bg-card/60 hover:bg-secondary/50 hover:border-border"
                  }`}
                >
                  <div className="min-w-0 space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {preset.name}
                      </span>

                      {/* Engine Tier Badge */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider border ${tierStyle.bg} ${tierStyle.text} ${tierStyle.border}`}
                      >
                        <Cpu className="size-2.5" />
                        {preset.engineTier}
                      </span>

                      {preset.isCustom && (
                        <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-400 uppercase">
                          Custom
                        </span>
                      )}
                    </div>

                    <p className="font-mono text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {preset.description}
                    </p>

                    {/* Parameter Chips */}
                    {preset.chips.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {preset.chips.map((chip, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center rounded-md border border-border/50 bg-secondary/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions & Pin Trigger */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleTogglePin(preset.id, e)}
                      title={preset.isPinned ? "Unpin preset" : "Pin preset to top"}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                        preset.isPinned
                          ? "border-amber-500/50 bg-amber-500/15 text-amber-400"
                          : "border-transparent text-muted-foreground/40 hover:text-muted-foreground hover:border-border/60"
                      }`}
                    >
                      {preset.isPinned ? <Pin className="size-3.5 fill-current" /> : <PinOff className="size-3.5" />}
                    </button>

                    {preset.isCustom && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCustom(preset.id, e)}
                        title="Delete custom preset"
                        className="p-1.5 rounded-lg border border-transparent text-muted-foreground/40 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 transition-all cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}

                    <div
                      className={`flex size-7 items-center justify-center rounded-lg border transition-all ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground shadow-xs"
                          : "border-border/70 bg-secondary/30 text-muted-foreground group-hover:border-primary/50 group-hover:text-primary"
                      }`}
                    >
                      <Check className={`size-3.5 ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-60"}`} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </ZenoModal>
  );
}
