"use client";

import { useState, useCallback } from "react";
import { ListTodo } from "lucide-react";

import { labels } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { TaskClaimData } from "@/lib/supabase/types";

interface CreateTaskClaimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TaskClaimData) => void;
  suggestedDescription?: string;
}

export function CreateTaskClaimDialog({
  open,
  onOpenChange,
  onSubmit,
  suggestedDescription,
}: CreateTaskClaimDialogProps) {
  const [description, setDescription] = useState(suggestedDescription ?? "");

  const canSubmit = description.trim().length > 0;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    const taskData: TaskClaimData = {
      description: description.trim(),
      options: [{ label: "Claim", votes: [] }],
      claimed_by: null,
    };
    onSubmit(taskData);
    setDescription("");
    onOpenChange(false);
  }, [canSubmit, description, onSubmit, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListTodo className="size-4" />
            {labels.cards.createTaskClaim}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label
              htmlFor="task-description"
              className="text-sm font-medium mb-1.5 block"
            >
              {labels.cards.taskDescription}
            </label>
            <Input
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={labels.cards.taskDescriptionPlaceholder}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {labels.cards.cancel}
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {labels.cards.createTaskClaimSubmit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
