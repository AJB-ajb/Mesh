import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const groupVariants = cva("flex", {
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
      baseline: "items-baseline",
      stretch: "items-stretch",
    },
    justify: {
      start: "justify-start",
      center: "justify-center",
      end: "justify-end",
      between: "justify-between",
    },
    wrap: {
      true: "flex-wrap",
      false: "",
    },
  },
  defaultVariants: {
    gap: "sm",
    align: "center",
    justify: "start",
    wrap: false,
  },
});

type GroupElement =
  | "div"
  | "section"
  | "nav"
  | "ul"
  | "ol"
  | "header"
  | "footer";

function Group({
  className,
  gap = "sm",
  align = "center",
  justify = "start",
  wrap = false,
  as: Comp = "div",
  ...props
}: React.HTMLAttributes<HTMLElement> &
  VariantProps<typeof groupVariants> & {
    as?: GroupElement;
  }) {
  return (
    <Comp
      data-slot="group"
      className={cn(groupVariants({ gap, align, justify, wrap, className }))}
      {...props}
    />
  );
}

export { Group, groupVariants };
