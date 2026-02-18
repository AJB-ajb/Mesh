"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { SpeechInput } from "@/components/ai-elements/speech-input";
import { transcribeAudio } from "@/lib/transcribe";

type TextareaProps = React.ComponentProps<"textarea"> & {
  enableMic?: boolean;
  onTranscriptionChange?: (text: string) => void;
  onAudioRecorded?: (audioBlob: Blob) => Promise<string>;
  lang?: string;
};

function Textarea({
  className,
  enableMic,
  onTranscriptionChange,
  onAudioRecorded,
  lang,
  ...props
}: TextareaProps) {
  const textareaEl = (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        enableMic && "pr-9",
        className,
      )}
      {...props}
    />
  );

  if (!enableMic) return textareaEl;

  return (
    <div className="relative w-full">
      {textareaEl}
      <SpeechInput
        className="absolute right-1.5 top-1.5 h-7 w-7 shrink-0 p-0"
        size="icon"
        variant="ghost"
        type="button"
        onAudioRecorded={onAudioRecorded ?? transcribeAudio}
        onTranscriptionChange={onTranscriptionChange}
        lang={lang}
      />
    </div>
  );
}

export { Textarea };
