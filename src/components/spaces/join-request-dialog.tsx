"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { labels } from "@/lib/labels";
import { useSpaceJoinRequest } from "@/lib/hooks/use-space-join-request";

interface JoinRequestDialogProps {
  postingId: string;
  postingTitle: string;
  autoAccept: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinRequestDialog({
  postingId,
  postingTitle,
  autoAccept,
  open,
  onOpenChange,
}: JoinRequestDialogProps) {
  const { submit, isSubmitting } = useSpaceJoinRequest(postingId);
  const [message, setMessage] = useState("");

  async function handleSubmit() {
    const success = await submit();
    if (success) {
      setMessage("");
      onOpenChange(false);
    }
  }

  // Truncate title for display
  const displayTitle =
    postingTitle.length > 80 ? postingTitle.slice(0, 77) + "..." : postingTitle;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {autoAccept
              ? labels.spaces.posting.joinConfirm
              : labels.spaces.posting.requestToJoin}
          </DialogTitle>
          <DialogDescription className="line-clamp-2">
            {displayTitle}
          </DialogDescription>
        </DialogHeader>

        {/* Show message textarea only for non-auto-accept postings */}
        {!autoAccept && (
          <div className="space-y-2">
            <Textarea
              placeholder={labels.spaces.posting.messagePlaceholder}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              disabled={isSubmitting}
            />
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {labels.spaces.posting.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin mr-2" />}
            {autoAccept
              ? labels.spaces.posting.join
              : labels.spaces.posting.submitRequest}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
