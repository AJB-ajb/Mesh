"use client";

import { Input } from "@/components/ui/input";
import { MeshEditor } from "@/components/editor/mesh-editor";
import { SpeechInput } from "@/components/ai-elements/speech-input";
import { transcribeAudio } from "@/lib/transcribe";
import { labels } from "@/lib/labels";
import type { PostingFormState } from "@/lib/types/posting";
import { useCallback, useRef } from "react";
import type { Editor } from "@tiptap/core";

type PostingFormBasicProps = {
  form: PostingFormState;
  onChange: (field: keyof PostingFormState, value: string) => void;
};

export function PostingFormBasic({ form, onChange }: PostingFormBasicProps) {
  const editorRef = useRef<Editor | null>(null);

  const handleEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor;
  }, []);

  return (
    <>
      {/* Title */}
      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          {labels.postingForm.titleLabel}
        </label>
        <Input
          id="title"
          value={form.title}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder={labels.postingForm.titlePlaceholder}
          className="text-lg"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          {labels.postingForm.descriptionLabel}{" "}
          <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <MeshEditor
            content={form.description}
            placeholder={labels.postingForm.descriptionPlaceholder}
            onChange={(md) => onChange("description", md)}
            className="min-h-[150px] pr-9"
            onEditorReady={handleEditorReady}
          />
          <SpeechInput
            className="absolute right-1.5 top-1.5 h-7 w-7 shrink-0 p-0"
            size="icon"
            variant="ghost"
            type="button"
            onAudioRecorded={transcribeAudio}
            onTranscriptionChange={(text) => {
              const editor = editorRef.current;
              if (editor) {
                editor.chain().focus().insertContent(text).run();
              }
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {labels.extraction.formHint}
        </p>
      </div>
    </>
  );
}
