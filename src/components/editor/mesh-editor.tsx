"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

/** Helper to extract markdown from editor storage */
function getMarkdown(editor: import("@tiptap/core").Editor): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mdStorage = (editor.storage as any).markdown as
    | MarkdownStorage
    | undefined;
  return mdStorage?.getMarkdown?.() ?? "";
}

export interface MeshEditorProps {
  content?: string;
  placeholder?: string;
  onChange?: (markdown: string) => void;
  onSubmit?: () => void;
  className?: string;
  autoFocus?: boolean;
  /** Extra Tiptap extensions (e.g. SlashCommand) */
  extensions?: import("@tiptap/core").AnyExtension[];
  /** Expose the editor instance to parent */
  onEditorReady?: (editor: import("@tiptap/core").Editor) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function MeshEditor({
  content = "",
  placeholder,
  onChange,
  onSubmit,
  className,
  autoFocus = false,
  extensions: extraExtensions = [],
  onEditorReady,
  onFocus,
  onBlur,
}: MeshEditorProps) {
  const onChangeRef = useRef(onChange);
  const onSubmitRef = useRef(onSubmit);
  const onFocusRef = useRef(onFocus);
  const onBlurRef = useRef(onBlur);

  // Keep callback refs in sync via effects (React 19 disallows ref writes during render)
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);
  useEffect(() => {
    onFocusRef.current = onFocus;
  }, [onFocus]);
  useEffect(() => {
    onBlurRef.current = onBlur;
  }, [onBlur]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // Disable features we don't need
        italic: false,
        strike: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        // Keep these enabled
        bold: {},
        heading: { levels: [2, 3] },
        bulletList: {},
        orderedList: {},
        listItem: {},
        code: {},
        hardBreak: {},
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline" },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? "",
      }),
      Markdown.configure({
        html: false,
        transformCopiedText: true,
        transformPastedText: true,
      }),
      ...extraExtensions,
    ],
    content,
    autofocus: autoFocus ? "end" : false,
    editorProps: {
      attributes: {
        class: cn(
          "min-h-[80px] w-full rounded-lg border border-input bg-background px-4 py-3",
          "text-base leading-relaxed",
          "ring-offset-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "placeholder:text-muted-foreground",
          "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2",
          "[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1",
          "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6",
          "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-sm",
          "[&_a]:text-primary [&_a]:underline",
          "[&_p]:my-1",
          className ?? "",
        ),
      },
      handleKeyDown: (_view, event) => {
        // Cmd/Ctrl+Enter to submit
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          onSubmitRef.current?.();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      const md = getMarkdown(ed);
      onChangeRef.current?.(md);
    },
    onFocus: () => onFocusRef.current?.(),
    onBlur: () => onBlurRef.current?.(),
  });

  // Expose editor to parent
  useEffect(() => {
    if (editor) {
      onEditorReady?.(editor);
    }
  }, [editor, onEditorReady]);

  // Sync external content changes (e.g. from template overlay, text tools)
  const lastExternalContent = useRef(content);
  useEffect(() => {
    if (!editor) return;
    if (content !== lastExternalContent.current) {
      lastExternalContent.current = content;
      const currentMd = getMarkdown(editor);
      if (content !== currentMd) {
        editor.commands.setContent(content);
      }
    }
  }, [editor, content]);

  if (!editor) return null;

  return <EditorContent editor={editor} />;
}
