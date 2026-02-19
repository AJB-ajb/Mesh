import { redirect } from "next/navigation";

/**
 * /inbox redirects to /connections (merged in v0.3 Navigation Redesign).
 */
export default function InboxPage() {
  redirect("/connections");
}
