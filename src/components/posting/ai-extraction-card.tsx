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
          AI Posting Extraction
        </CardTitle>
        <CardDescription>
          Paste your posting description from Slack, Discord, a GitHub README,
          or use the mic to describe it. Our AI will automatically extract
          posting details.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          rows={12}
          value={aiText}
          onChange={(e) => onAiTextChange(e.target.value)}
          placeholder={`Paste your posting text here, or use the mic to describe it...

Example:
Hey everyone! Looking for 2-3 devs to join my hackathon project this weekend \u{1F680}

Building an AI-powered recipe generator that suggests meals based on what's in your fridge.

Tech stack: React, TypeScript, OpenAI API, Supabase
Need: Frontend dev + someone with AI/ML experience
Commitment: ~10 hrs over the weekend

DM if interested!`}
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
                Extracting...
              </>
            ) : extractionSuccess ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Extracted!
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Extract Posting Details
              </>
            )}
          </Button>
          <Button type="button" variant="outline" onClick={onSwitchToForm}>
            Switch to Form
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          After extraction, youll be able to review and edit the extracted
          information before creating your posting.
        </p>
      </CardContent>
    </Card>
  );
}
