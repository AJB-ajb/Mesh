"use client";

type SystemMessageProps = {
  content: string;
};

export function SystemMessage({ content }: SystemMessageProps) {
  return (
    <div className="flex justify-center py-1">
      <p className="text-xs text-muted-foreground bg-muted/50 rounded-full px-3 py-1">
        {content}
      </p>
    </div>
  );
}
