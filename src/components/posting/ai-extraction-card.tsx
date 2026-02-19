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
};

export function AiExtractionCard({
  aiText,
  onAiTextChange,
  isExtracting,
  extractionSuccess,
  onExtract,
  onSwitchToForm,
}: AiExtractionCardProps) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {labels.extraction.postingCardTitle}
        </CardTitle>
        <CardDescription>
          {labels.extraction.postingDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          rows={12}
          value={aiText}
          onChange={(e) => onAiTextChange(e.target.value)}
          placeholder={labels.extraction.postingPlaceholder}
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
                {labels.extraction.extractPostingButton}
              </>
            )}
          </Button>
          <Button type="button" variant="outline" onClick={onSwitchToForm}>
            {labels.extraction.switchToFormButton}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {labels.extraction.postingHelpText}
        </p>
      </CardContent>
    </Card>
  );
}
