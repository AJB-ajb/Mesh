"use client";

import { Sparkles, Loader2, CheckCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { labels } from "@/lib/labels";

type AiExtractionCardProps = {
  aiText: string;
  onAiTextChange: (text: string) => void;
  isExtracting: boolean;
  extractionSuccess: boolean;
  onExtract: () => void;
  onSwitchToForm: () => void;
  variant?: "posting" | "profile";
};

export function AiExtractionCard({
  aiText,
  onAiTextChange,
  isExtracting,
  extractionSuccess,
  onExtract,
  onSwitchToForm,
  variant = "posting",
}: AiExtractionCardProps) {
  const isProfile = variant === "profile";
  const cardTitle = isProfile
    ? labels.extraction.profileCardTitle
    : labels.extraction.postingCardTitle;
  const cardDescription = isProfile
    ? labels.extraction.profileDescription
    : labels.extraction.postingDescription;
  const placeholder = isProfile
    ? labels.extraction.profilePlaceholder
    : labels.extraction.postingPlaceholder;
  const extractButton = isProfile
    ? labels.extraction.extractProfileButton
    : labels.extraction.extractPostingButton;
  const helpText = isProfile
    ? labels.extraction.profileHelpText
    : labels.extraction.postingHelpText;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {cardTitle}
        </CardTitle>
        <CardDescription>{cardDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          rows={12}
          value={aiText}
          onChange={(e) => onAiTextChange(e.target.value)}
          placeholder={placeholder}
          enableMic
          onTranscriptionChange={(text) =>
            onAiTextChange(aiText ? aiText + " " + text : text)
          }
        />
        <div className="flex gap-3">
          <Button
            type="button"
            onClick={onExtract}
            disabled={isExtracting || !aiText.trim()}
            className="flex-1"
          >
            {isExtracting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {labels.extraction.extractingButton}
              </>
            ) : extractionSuccess ? (
              <>
                <CheckCircle className="h-4 w-4" />
                {labels.extraction.extractedButton}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {extractButton}
              </>
            )}
          </Button>
          <Button type="button" variant="outline" onClick={onSwitchToForm}>
            {labels.extraction.switchToFormButton}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{helpText}</p>
      </CardContent>
    </Card>
  );
}
