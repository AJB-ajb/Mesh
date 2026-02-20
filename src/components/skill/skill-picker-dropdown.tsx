"use client";

import { Loader2, ChevronRight, Plus, FolderTree } from "lucide-react";
import { labels } from "@/lib/labels";
import type { SkillNode } from "@/lib/types/skill";

type BrowseNode = {
  id: string;
  name: string;
  isLeaf: boolean;
  childCount?: number;
};

type SkillPickerDropdownProps = {
  showSearchResults: boolean;
  showBrowse: boolean;
  filteredResults: SkillNode[];
  filteredBrowseNodes: BrowseNode[];
  browsePath: string[];
  selectedIndex: number;
  isLoading: boolean;
  isNormalizing: boolean;
  hasAddCustom: boolean;
  inputValue: string;
  dropdownItems: (SkillNode | BrowseNode)[];
  totalItems: number;
  onSelectSkill: (node: SkillNode) => void;
  onBrowseInto: (nodeId: string) => void;
  onBrowseBack: () => void;
  onBrowseSelect: (nodeId: string, nodeName: string) => void;
  onAddCustom: () => void;
};

export function SkillPickerDropdown({
  showSearchResults,
  showBrowse,
  filteredResults,
  filteredBrowseNodes,
  browsePath,
  selectedIndex,
  isLoading,
  isNormalizing,
  hasAddCustom,
  inputValue,
  dropdownItems,
  totalItems,
  onSelectSkill,
  onBrowseInto,
  onBrowseBack,
  onBrowseSelect,
  onAddCustom,
}: SkillPickerDropdownProps) {
  return (
    <div className="absolute z-50 mt-1 w-full rounded-md border border-input bg-popover shadow-lg">
      {/* Browse mode breadcrumb */}
      {showBrowse && browsePath.length > 0 && (
        <div className="flex items-center gap-1 border-b px-3 py-2 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={onBrowseBack}
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
              onClick={() => onSelectSkill(result)}
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
                  onBrowseSelect(node.id, node.name);
                } else {
                  onBrowseInto(node.id);
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
            onClick={onAddCustom}
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
            {isNormalizing ? labels.skill.addingSkill : labels.skill.searching}
          </div>
        )}
      </div>

      {/* Keyboard hints */}
      {totalItems > 0 && (
        <div className="border-t px-3 py-1.5 text-[10px] text-muted-foreground">
          <kbd className="rounded border px-1">↑↓</kbd>{" "}
          {labels.skill.kbdNavigate}{" "}
          <kbd className="rounded border px-1">↵</kbd> {labels.skill.kbdSelect}{" "}
          <kbd className="rounded border px-1">esc</kbd> {labels.skill.kbdClose}
        </div>
      )}
    </div>
  );
}
