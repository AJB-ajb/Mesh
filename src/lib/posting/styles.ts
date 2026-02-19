export const categoryStyles: Record<string, string> = {
  study: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
  hackathon:
    "bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-400",
  personal:
    "bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400",
  professional:
    "bg-orange-500/10 text-orange-700 border-orange-500/20 dark:text-orange-400",
  social: "bg-pink-500/10 text-pink-700 border-pink-500/20 dark:text-pink-400",
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
