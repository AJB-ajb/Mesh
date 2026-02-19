"use client";

import { SkillPicker } from "@/components/skill/skill-picker";
import { labels } from "@/lib/labels";
import type { ProfileFormState } from "@/lib/types/profile";
import type { SelectedProfileSkill } from "@/lib/types/skill";

type ProfileFormSkillsProps = {
  selectedSkills: ProfileFormState["selectedSkills"];
  onAdd: (skill: SelectedProfileSkill) => void;
  onRemove: (skillId: string) => void;
  onUpdateLevel: (skillId: string, level: number) => void;
};

export function ProfileFormSkills({
  selectedSkills,
  onAdd,
  onRemove,
  onUpdateLevel,
}: ProfileFormSkillsProps) {
  return (
    <SkillPicker
      mode="profile"
      selectedSkills={selectedSkills}
      onAdd={onAdd}
      onRemove={onRemove}
      onUpdateLevel={onUpdateLevel}
      placeholder={labels.profileForm.skillsPlaceholder}
    />
  );
}
