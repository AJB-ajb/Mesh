"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { labels } from "@/lib/labels";
import type { SelectedPostingSkill } from "@/lib/types/skill";

import {
  type PostingFormState,
  defaultPostingFormState,
} from "@/lib/types/posting";
export type { PostingFormState };
export { defaultPostingFormState as defaultFormState };

import type {
  AvailabilityMode,
  RecurringWindow,
} from "@/lib/types/availability";
import { PostingFormBasic } from "./posting-form-basic";
import { PostingFormSkills } from "./posting-form-skills";
import { PostingFormMeta } from "./posting-form-meta";
import { PostingFormTeam } from "./posting-form-team";
import { PostingFormLocation } from "./posting-form-location";
import { PostingFormAvailability } from "./posting-form-availability";

type PostingFormCardProps = {
  form: PostingFormState;
  setForm: React.Dispatch<React.SetStateAction<PostingFormState>>;
  onChange: (field: keyof PostingFormState, value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  isSaving: boolean;
  isExtracting: boolean;
};

export function PostingFormCard({
  form,
  setForm,
  onChange,
  onSubmit,
  isSaving,
  isExtracting,
}: PostingFormCardProps) {
  const handleAddSkill = (skill: SelectedPostingSkill) => {
    setForm((prev) => ({
      ...prev,
      selectedSkills: [...prev.selectedSkills, skill],
    }));
  };

  const handleRemoveSkill = (skillId: string) => {
    setForm((prev) => ({
      ...prev,
      selectedSkills: prev.selectedSkills.filter((s) => s.skillId !== skillId),
    }));
  };

  const handleUpdateSkillLevel = (skillId: string, levelMin: number | null) => {
    setForm((prev) => ({
      ...prev,
      selectedSkills: prev.selectedSkills.map((s) =>
        s.skillId === skillId ? { ...s, levelMin } : s,
      ),
    }));
  };

  const handleAvailabilityModeChange = (mode: AvailabilityMode) => {
    setForm((prev) => ({ ...prev, availabilityMode: mode }));
  };

  const handleRecurringWindowsChange = (windows: RecurringWindow[]) => {
    setForm((prev) => ({ ...prev, availabilityWindows: windows }));
  };

  return (
    <form onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{labels.postingForm.cardTitle}</CardTitle>
          <CardDescription>
            {labels.postingForm.cardDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <PostingFormBasic form={form} onChange={onChange} />

          <PostingFormSkills
            selectedSkills={form.selectedSkills}
            onAdd={handleAddSkill}
            onRemove={handleRemoveSkill}
            onUpdateLevel={handleUpdateSkillLevel}
          />

          <PostingFormMeta form={form} onChange={onChange} />

          <PostingFormTeam form={form} onChange={onChange} />

          <PostingFormLocation form={form} onChange={onChange} />

          <PostingFormAvailability
            availabilityMode={form.availabilityMode}
            onModeChange={handleAvailabilityModeChange}
            recurringWindows={form.availabilityWindows}
            onRecurringWindowsChange={handleRecurringWindowsChange}
            specificWindows={form.specificWindows}
            onSpecificWindowsChange={() => {}}
          />

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              className="flex-1"
              disabled={isSaving || isExtracting}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {labels.postingForm.creatingButton}
                </>
              ) : (
                labels.postingForm.createButton
              )}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/my-postings">{labels.postingForm.cancelButton}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
