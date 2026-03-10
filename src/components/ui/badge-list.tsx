import { Badge } from "@/components/ui/badge";

interface BadgeListProps {
  items: string[];
  max?: number;
  variant?: "default" | "secondary" | "outline";
  className?: string;
}

export function BadgeList({
  items,
  max = 5,
  variant = "secondary",
  className,
}: BadgeListProps) {
  return (
    <div className={className ?? "flex flex-wrap gap-1.5 sm:gap-2"}>
      {items.slice(0, max).map((item) => (
        <Badge key={item} variant={variant} className="text-xs">
          {item}
        </Badge>
      ))}
      {items.length > max && (
        <Badge variant="outline" className="text-xs">
          +{items.length - max}
        </Badge>
      )}
    </div>
  );
}
