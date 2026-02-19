"use client";

import { SkillPicker } from "@/components/skill/skill-picker";
import { labels } from "@/lib/labels";
import type { PostingFormState } from "@/lib/types/posting";
import type { SelectedPostingSkill } from "@/lib/types/skill";

type PostingFormSkillsProps = {
  selectedSkills: PostingFormState["selectedSkills"];
  onAdd: (skill: SelectedPostingSkill) => void;
  onRemove: (skillId: string) => void;
  onUpdateLevel: (skillId: string, levelMin: number | null) => void;
};

export function PostingFormSkills({
  selectedSkills,
  onAdd,
  onRemove,
  onUpdateLevel,
}: PostingFormSkillsProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {labels.postingForm.skillsLabel}
      </label>
      <p className="text-xs text-muted-foreground">
        {labels.postingForm.skillsHelp}
      </p>
      <SkillPicker
        mode="posting"
        selectedSkills={selectedSkills}
        onAdd={onAdd}
        onRemove={onRemove}
        onUpdateLevel={onUpdateLevel}
        placeholder={labels.postingForm.skillsPlaceholder}
      />
    </div>
  );
}
