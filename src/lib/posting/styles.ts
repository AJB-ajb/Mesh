import {
  BookOpen,
  Code,
  User,
  Briefcase,
  Users,
  type LucideIcon,
} from "lucide-react";

export const categoryIcons: Record<string, LucideIcon> = {
  study: BookOpen,
  hackathon: Code,
  personal: User,
  professional: Briefcase,
  social: Users,
};

export const categoryStyles: Record<string, string> = {
  study: "bg-cat-study/10 text-cat-study border-cat-study/20",
  hackathon: "bg-cat-hackathon/10 text-cat-hackathon border-cat-hackathon/20",
  personal: "bg-cat-personal/10 text-cat-personal border-cat-personal/20",
  professional:
    "bg-cat-professional/10 text-cat-professional border-cat-professional/20",
  social: "bg-cat-social/10 text-cat-social border-cat-social/20",
};

export const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  applied: "bg-info/10 text-info",
  accepted: "bg-success/10 text-success",
  declined: "bg-muted text-muted-foreground",
};

export const statusLabels: Record<string, string> = {
  pending: "Pending",
  applied: "Requested",
  accepted: "Accepted",
  declined: "Declined",
};

export function getStatusColor(status: string) {
  switch (status) {
    case "open":
      return "bg-success/10 text-success";
    case "filled":
      return "bg-info/10 text-info";
    case "closed":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}
