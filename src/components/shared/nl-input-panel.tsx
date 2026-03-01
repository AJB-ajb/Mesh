"use client";

import { Sparkles, Loader2, CheckCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { labels } from "@/lib/labels";

type NlInputPanelProps = {
  nlText: string;
  onNlTextChange: (text: string) => void;
  isExtracting: boolean;
  extractionSuccess: boolean;
  onExtract: () => void;
  placeholder?: string;
  enableMic?: boolean;
  variant?: "posting" | "profile";
  /** When true, shows "Update Fields" instead of "Extract" */
  isUpdate?: boolean;
};

export function NlInputPanel({
  nlText,
  onNlTextChange,
  isExtracting,
  extractionSuccess,
  onExtract,
  placeholder,
  enableMic = true,
  variant = "posting",
  isUpdate = false,
}: NlInputPanelProps) {
  const isProfile = variant === "profile";
  const title = isProfile
    ? labels.nlInput.profileTitle
    : labels.nlInput.postingTitle;
  const description = isProfile
    ? labels.nlInput.profileDescription
    : labels.nlInput.postingDescription;

  const defaultPlaceholder = isProfile
    ? labels.extraction.profilePlaceholder
    : labels.extraction.postingPlaceholder;

  const buttonLabel = isUpdate
    ? labels.nlInput.updateButton
    : labels.nlInput.extractButton;
  const buttonLoadingLabel = isUpdate
    ? labels.nlInput.updatingButton
    : labels.nlInput.extractingButton;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-5 w-5 text-primary" />
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <Textarea
        rows={6}
        value={nlText}
        onChange={(e) => onNlTextChange(e.target.value)}
        placeholder={placeholder ?? defaultPlaceholder}
        enableMic={enableMic}
        onTranscriptionChange={(text) =>
          onNlTextChange(nlText ? nlText + " " + text : text)
        }
      />

      <div className="flex items-center gap-3">
        <Button
          type="button"
          onClick={onExtract}
          disabled={isExtracting || !nlText.trim()}
        >
          {isExtracting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {buttonLoadingLabel}
            </>
          ) : extractionSuccess ? (
            <>
              <CheckCircle className="h-4 w-4" />
              {labels.nlInput.extractedButton}
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {buttonLabel}
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
