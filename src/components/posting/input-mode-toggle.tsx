"use client";

import { FileText, Sparkles } from "lucide-react";

export type InputMode = "form" | "ai";

type InputModeToggleProps = {
  inputMode: InputMode;
  onModeChange: (mode: InputMode) => void;
};

export function InputModeToggle({
  inputMode,
  onModeChange,
}: InputModeToggleProps) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 p-1">
      <button
        type="button"
        onClick={() => onModeChange("form")}
        className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
          inputMode === "form"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <FileText className="h-4 w-4" />
        Fill Form
      </button>
      <button
        type="button"
        onClick={() => onModeChange("ai")}
        className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
          inputMode === "ai"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Sparkles className="h-4 w-4" />
        AI Extract
      </button>
    </div>
  );
}
