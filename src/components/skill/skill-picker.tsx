"use client";

import { Search, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { labels } from "@/lib/labels";
import type {
  SelectedProfileSkill,
  SelectedPostingSkill,
} from "@/lib/types/skill";
import { useSkillPickerState } from "@/lib/hooks/use-skill-picker-state";
import { SkillPickerDropdown } from "./skill-picker-dropdown";

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

  const {
    // Refs
    wrapperRef,
    inputRef,
    // State
    inputValue,
    showDropdown,
    selectedIndex,
    isLoading,
    isNormalizing,
    error: searchError,
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
  } = useSkillPickerState(mode, selectedSkills, onAdd);

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

        {searchError && (
          <p className="mt-1 text-xs text-destructive">{searchError}</p>
        )}

        {/* Dropdown */}
        {showDropdown && (
          <SkillPickerDropdown
            showSearchResults={showSearchResults}
            showBrowse={showBrowse}
            filteredResults={filteredResults}
            filteredBrowseNodes={filteredBrowseNodes}
            browsePath={browsePath}
            selectedIndex={selectedIndex}
            isLoading={isLoading}
            isNormalizing={isNormalizing}
            hasAddCustom={hasAddCustom}
            inputValue={inputValue}
            dropdownItems={dropdownItems}
            totalItems={totalItems}
            onSelectSkill={handleSelectSkill}
            onBrowseInto={handleBrowseInto}
            onBrowseBack={handleBrowseBack}
            onBrowseSelect={handleBrowseSelect}
            onAddCustom={handleAddCustom}
          />
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
