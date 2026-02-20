"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSkillSearch } from "@/lib/hooks/use-skill-search";
import type { SkillNode } from "@/lib/types/skill";
import type {
  SelectedProfileSkill,
  SelectedPostingSkill,
} from "@/lib/types/skill";

type SkillPickerMode = "profile" | "posting";

type OnAddProfile = (skill: SelectedProfileSkill) => void;
type OnAddPosting = (skill: SelectedPostingSkill) => void;

export function useSkillPickerState(
  mode: SkillPickerMode,
  selectedSkills: SelectedProfileSkill[] | SelectedPostingSkill[],
  onAdd: OnAddProfile | OnAddPosting,
) {
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
        (onAdd as OnAddProfile)({
          skillId: node.id,
          name: node.name,
          path: node.path,
          level: 5,
        });
      } else {
        (onAdd as OnAddPosting)({
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

  // Select a leaf node from browse mode (needs to fetch path)
  const handleBrowseSelect = useCallback(
    async (nodeId: string, nodeName: string) => {
      if (selectedIds.has(nodeId)) return;

      const path = [...browsePath];

      if (mode === "profile") {
        (onAdd as OnAddProfile)({
          skillId: nodeId,
          name: nodeName,
          path,
          level: 5,
        });
      } else {
        (onAdd as OnAddPosting)({
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
        const effectiveIndex =
          selectedIndex === -1 && dropdownItems.length > 0 ? 0 : selectedIndex;
        if (effectiveIndex >= 0 && effectiveIndex < dropdownItems.length) {
          const item = dropdownItems[effectiveIndex];
          if (showSearchResults) {
            handleSelectSkill(item as SkillNode);
          } else {
            const browseItem = item as (typeof filteredBrowseNodes)[number];
            if (browseItem.isLeaf) {
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

  return {
    // Refs
    wrapperRef,
    inputRef,
    // State
    inputValue,
    showDropdown,
    selectedIndex,
    isLoading,
    isNormalizing,
    error,
    // Derived
    showSearchResults,
    showBrowse,
    filteredResults,
    filteredBrowseNodes,
    browsePath,
    dropdownItems,
    hasAddCustom,
    totalItems,
    // Handlers
    handleInputChange,
    handleSelectSkill,
    handleBrowseInto,
    handleBrowseBack,
    handleBrowseSelect,
    handleAddCustom,
    handleKeyDown,
    handleFocus,
  };
}
