import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const stackVariants = cva("flex flex-col", {
  variants: {
    gap: {
      none: "",
      xs: "gap-1",
      sm: "gap-2",
      md: "gap-3",
      lg: "gap-4",
      xl: "gap-6 sm:gap-7 md:gap-8",
    },
    align: {
      start: "items-start",
      center: "items-center",
      end: "items-end",
      stretch: "items-stretch",
    },
  },
  defaultVariants: { gap: "md", align: "stretch" },
});

type StackElement =
  | "div"
  | "section"
  | "article"
  | "nav"
  | "aside"
  | "main"
  | "header"
  | "footer"
  | "ul"
  | "ol"
  | "fieldset";

function Stack({
  className,
  gap = "md",
  align = "stretch",
  as: Comp = "div",
  ...props
}: React.HTMLAttributes<HTMLElement> &
  VariantProps<typeof stackVariants> & {
    as?: StackElement;
  }) {
  return (
    <Comp
      data-slot="stack"
      className={cn(stackVariants({ gap, align, className }))}
      {...props}
    />
  );
}

export { Stack, stackVariants };
