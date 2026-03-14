import * as React from "react";
import { type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Stack, type stackVariants } from "@/components/ui/stack";

const sizeClasses = {
  sm: "max-w-2xl",
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-7xl",
  full: "max-w-full",
};

type PageContentSize = keyof typeof sizeClasses;

function PageContent({
  size = "full",
  gap = "xl",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof stackVariants> & {
    size?: PageContentSize;
  }) {
  return (
    <Stack
      gap={gap}
      className={cn("mx-auto w-full", sizeClasses[size], className)}
      {...props}
    >
      {children}
    </Stack>
  );
}

export { PageContent };
