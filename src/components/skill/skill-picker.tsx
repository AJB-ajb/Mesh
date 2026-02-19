"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Search,
  Loader2,
  X,
  ChevronRight,
  Plus,
  FolderTree,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { labels } from "@/lib/labels";
import { useSkillSearch } from "@/lib/hooks/use-skill-search";
import type { SkillNode } from "@/lib/types/skill";
import type {
  SelectedProfileSkill,
  SelectedPostingSkill,
} from "@/lib/types/skill";

// ---------------------------------------------------------------------------
// Skill level reference labels (shared with profile form)
// ---------------------------------------------------------------------------

function skillLevelLabel(level: number): string {
  if (level <= 2) return labels.skill.levelLabels.beginner;
  if (level <= 4) return labels.skill.levelLabels.canFollowTutorials;
  if (level <= 6) return labels.skill.levelLabels.intermediate;
  if (level <= 8) return labels.skill.levelLabels.advanced;
  return labels.skill.levelLabels.expert;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type SkillPickerProfileProps = {
  mode: "profile";
  selectedSkills: SelectedProfileSkill[];
  onAdd: (skill: SelectedProfileSkill) => void;
  onRemove: (skillId: string) => void;
  onUpdateLevel: (skillId: string, level: number) => void;
  placeholder?: string;
  disabled?: boolean;
};

type SkillPickerPostingProps = {
  mode: "posting";
  selectedSkills: SelectedPostingSkill[];
  onAdd: (skill: SelectedPostingSkill) => void;
  onRemove: (skillId: string) => void;
  onUpdateLevel: (skillId: string, levelMin: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
};

type SkillPickerProps = SkillPickerProfileProps | SkillPickerPostingProps;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SkillPicker(props: SkillPickerProps) {
  const {
    mode,
    selectedSkills,
    onAdd,
    onRemove,
    onUpdateLevel,
    placeholder = "Search skills...",
    disabled = false,
  } = props;

  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isBrowseMode, setIsBrowseMode] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    results,
    browseNodes,
    browsePath,
    isSearching,
    isBrowsing,
    isNormalizing,
    error,
    search,
    browseChildren,
    normalize,
    clearResults,
  } = useSkillSearch();

  const selectedIds = useMemo(
    () => new Set(selectedSkills.map((s) => s.skillId)),
    [selectedSkills],
  );

  // Filter out already-selected skills from search results
  const filteredResults = results.filter((r) => !selectedIds.has(r.id));
  const filteredBrowseNodes = browseNodes.filter(
    (n) => !selectedIds.has(n.id) || !n.isLeaf,
  );

  // Determine what to show in dropdown
  const isLoading = isSearching || isBrowsing || isNormalizing;
  const showSearchResults = !isBrowseMode && inputValue.trim().length > 0;
  const showBrowse = isBrowseMode || (!inputValue.trim() && showDropdown);

  // Compute dropdown items for keyboard navigation
  const dropdownItems = showSearchResults
    ? filteredResults
    : filteredBrowseNodes;
  const hasAddCustom =
    showSearchResults &&
    inputValue.trim().length > 0 &&
    !results.some(
      (r) => r.name.toLowerCase() === inputValue.trim().toLowerCase(),
    );
  const totalItems = dropdownItems.length + (hasAddCustom ? 1 : 0);

  // Input change handler
  const handleInputChange = (value: string) => {
    setInputValue(value);
    setSelectedIndex(-1);
    if (value.trim()) {
      setIsBrowseMode(false);
      search(value);
      setShowDropdown(true);
    } else {
      clearResults();
      if (showDropdown) {
        setIsBrowseMode(true);
        browseChildren(null);
      }
    }
  };

  // Select a skill from search results
  const handleSelectSkill = useCallback(
    (node: SkillNode) => {
      if (selectedIds.has(node.id)) return;

      if (mode === "profile") {
        (onAdd as SkillPickerProfileProps["onAdd"])({
          skillId: node.id,
          name: node.name,
          path: node.path,
          level: 5,
        });
      } else {
        (onAdd as SkillPickerPostingProps["onAdd"])({
          skillId: node.id,
          name: node.name,
          path: node.path,
          levelMin: null,
        });
      }

      setInputValue("");
      clearResults();
      setSelectedIndex(-1);
      setShowDropdown(false);
      inputRef.current?.focus();
    },
    [mode, onAdd, selectedIds, clearResults],
  );

  // Browse into a category
  const handleBrowseInto = useCallback(
    (nodeId: string) => {
      setSelectedIndex(-1);
      browseChildren(nodeId);
    },
    [browseChildren],
  );

  // Navigate back in browse tree
  const handleBrowseBack = useCallback(() => {
    // Go up one level — we need to find the grandparent
    // For now, go to root if at depth 1, otherwise we'd need parent tracking
    setSelectedIndex(-1);
    browseChildren(null);
  }, [browseChildren]);

  // Add custom skill via normalize API
  const handleAddCustom = useCallback(async () => {
    const skill = inputValue.trim();
    if (!skill) return;

    const result = await normalize(skill);
    if (result?.node) {
      handleSelectSkill(result.node);
    }
  }, [inputValue, normalize, handleSelectSkill]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || totalItems === 0) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setShowDropdown(true);
        if (!isBrowseMode && !inputValue.trim()) {
          setIsBrowseMode(true);
          browseChildren(null);
        }
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter": {
        e.preventDefault();
        // When no arrow navigation has occurred, auto-select the first item
        const effectiveIndex =
          selectedIndex === -1 && dropdownItems.length > 0 ? 0 : selectedIndex;
        if (effectiveIndex >= 0 && effectiveIndex < dropdownItems.length) {
          const item = dropdownItems[effectiveIndex];
          if (showSearchResults) {
            handleSelectSkill(item as SkillNode);
          } else {
            // Browse mode
            const browseItem = item as (typeof filteredBrowseNodes)[number];
            if (browseItem.isLeaf) {
              // Need to fetch full node info to select
              handleBrowseSelect(browseItem.id, browseItem.name);
            } else {
              handleBrowseInto(browseItem.id);
            }
          }
        } else if (
          hasAddCustom &&
          (selectedIndex === dropdownItems.length ||
            (selectedIndex === -1 && dropdownItems.length === 0))
        ) {
          handleAddCustom();
        }
        break;
      }
      case "Escape":
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Select a leaf node from browse mode (needs to fetch path)
  const handleBrowseSelect = useCallback(
    async (nodeId: string, nodeName: string) => {
      if (selectedIds.has(nodeId)) return;

      // We have the browse path + the node name
      const path = [...browsePath];

      if (mode === "profile") {
        (onAdd as SkillPickerProfileProps["onAdd"])({
          skillId: nodeId,
          name: nodeName,
          path,
          level: 5,
        });
      } else {
        (onAdd as SkillPickerPostingProps["onAdd"])({
          skillId: nodeId,
          name: nodeName,
          path,
          levelMin: null,
        });
      }

      setInputValue("");
      setSelectedIndex(-1);
      inputRef.current?.focus();
    },
    [mode, onAdd, selectedIds, browsePath],
  );

  // Focus handler — show browse mode when empty
  const handleFocus = () => {
    setShowDropdown(true);
    if (!inputValue.trim()) {
      setIsBrowseMode(true);
      browseChildren(null);
    }
  };

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div ref={wrapperRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            placeholder={placeholder}
            disabled={disabled}
            className="pl-9 pr-9"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-input bg-popover shadow-lg">
            {/* Browse mode breadcrumb */}
            {showBrowse && browsePath.length > 0 && (
              <div className="flex items-center gap-1 border-b px-3 py-2 text-xs text-muted-foreground">
                <button
                  type="button"
                  onClick={handleBrowseBack}
                  className="hover:text-foreground"
                >
                  {labels.skill.allCategories}
                </button>
                {browsePath.map((segment, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <ChevronRight className="h-3 w-3" />
                    <span
                      className={
                        i === browsePath.length - 1
                          ? "font-medium text-foreground"
                          : ""
                      }
                    >
                      {segment}
                    </span>
                  </span>
                ))}
              </div>
            )}

            <div className="max-h-60 overflow-y-auto p-1">
              {/* Search results */}
              {showSearchResults &&
                filteredResults.map((result, index) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => handleSelectSkill(result)}
                    className={`flex w-full items-start gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors ${
                      index === selectedIndex
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <div className="flex-1 overflow-hidden">
                      <div className="truncate font-medium">{result.name}</div>
                      {result.path.length > 0 && (
                        <div className="truncate text-xs text-muted-foreground">
                          {result.path.join(" > ")}
                        </div>
                      )}
                    </div>
                  </button>
                ))}

              {/* Browse nodes */}
              {showBrowse &&
                filteredBrowseNodes.map((node, index) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => {
                      if (node.isLeaf) {
                        handleBrowseSelect(node.id, node.name);
                      } else {
                        handleBrowseInto(node.id);
                      }
                    }}
                    className={`flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors ${
                      index === selectedIndex
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    {!node.isLeaf && (
                      <FolderTree className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    )}
                    <span className="flex-1 truncate">{node.name}</span>
                    {!node.isLeaf && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        {node.childCount}
                        <ChevronRight className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                ))}

              {/* Add custom skill option */}
              {hasAddCustom && (
                <button
                  type="button"
                  onClick={handleAddCustom}
                  className={`flex w-full items-center gap-2 rounded-sm border-t px-3 py-2 text-left text-sm transition-colors ${
                    selectedIndex === dropdownItems.length
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Plus className="h-4 w-4 flex-shrink-0" />
                  <span>
                    {labels.skill.addCustomPrefix}
                    {inputValue.trim()}
                    {labels.skill.addCustomSuffix}
                  </span>
                  {isNormalizing && (
                    <Loader2 className="ml-auto h-4 w-4 animate-spin" />
                  )}
                </button>
              )}

              {/* Empty state */}
              {!isLoading && dropdownItems.length === 0 && !hasAddCustom && (
                <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                  {showSearchResults
                    ? labels.skill.noSkillsFound
                    : labels.skill.noCategoriesAvailable}
                </div>
              )}

              {/* Loading state */}
              {isLoading && dropdownItems.length === 0 && (
                <div className="flex items-center justify-center px-3 py-4 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isNormalizing
                    ? labels.skill.addingSkill
                    : labels.skill.searching}
                </div>
              )}
            </div>

            {/* Keyboard hints */}
            {totalItems > 0 && (
              <div className="border-t px-3 py-1.5 text-[10px] text-muted-foreground">
                <kbd className="rounded border px-1">↑↓</kbd>{" "}
                {labels.skill.kbdNavigate}{" "}
                <kbd className="rounded border px-1">↵</kbd>{" "}
                {labels.skill.kbdSelect}{" "}
                <kbd className="rounded border px-1">esc</kbd>{" "}
                {labels.skill.kbdClose}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected skills as badge pills with level sliders */}
      {selectedSkills.length > 0 && (
        <div className="space-y-3">
          {selectedSkills.map((skill) => (
            <div
              key={skill.skillId}
              className="rounded-lg border p-3 space-y-2"
            >
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{skill.name}</span>
                  {skill.path.length > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {skill.path.join(" > ")}
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={() => onRemove(skill.skillId)}
                  aria-label={`Remove ${skill.name}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              {/* Level slider */}
              {mode === "profile" ? (
                <div className="flex items-center gap-4">
                  <Slider
                    min={0}
                    max={10}
                    step={1}
                    value={[(skill as SelectedProfileSkill).level]}
                    onValueChange={([val]) => onUpdateLevel(skill.skillId, val)}
                    className="flex-1"
                  />
                  <span className="w-20 text-right text-sm font-medium tabular-nums">
                    {(skill as SelectedProfileSkill).level}/10
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Slider
                    min={0}
                    max={10}
                    step={1}
                    value={[(skill as SelectedPostingSkill).levelMin ?? 0]}
                    onValueChange={([val]) =>
                      onUpdateLevel(skill.skillId, val === 0 ? null : val)
                    }
                    className="flex-1"
                  />
                  <span className="w-28 text-right text-sm font-medium tabular-nums">
                    {(skill as SelectedPostingSkill).levelMin != null
                      ? `Min: ${(skill as SelectedPostingSkill).levelMin}/10`
                      : labels.skill.anyLevel}
                  </span>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {mode === "profile"
                  ? skillLevelLabel((skill as SelectedProfileSkill).level)
                  : (skill as SelectedPostingSkill).levelMin != null
                    ? labels.skill.requiresAtLeast(
                        skillLevelLabel(
                          (skill as SelectedPostingSkill).levelMin!,
                        ),
                      )
                    : labels.skill.anyLevelWelcome}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
