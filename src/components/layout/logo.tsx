import Link from "next/link";
import { cn } from "@/lib/utils";
import { getEnvironmentName } from "@/lib/environment";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  href?: string;
}

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

const textSizeClasses = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-xl",
};

export function Logo({
  className,
  size = "md",
  showText = true,
  href = "/",
}: LogoProps) {
  const env = getEnvironmentName();
  const displayName = env === "Production" ? "Mesh" : `Mesh - ${env}`;

  return (
    <Link
      href={href}
      className={cn("flex items-center gap-2 font-semibold", className)}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-primary text-primary-foreground",
          sizeClasses[size],
        )}
      >
        <span
          className={cn("font-bold", size === "sm" ? "text-xs" : "text-sm")}
        >
          M
        </span>
      </div>
      {showText && (
        <span className={cn("font-semibold", textSizeClasses[size])}>
          {displayName}
        </span>
      )}
    </Link>
  );
}
