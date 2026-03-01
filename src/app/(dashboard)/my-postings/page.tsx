import { redirect } from "next/navigation";

export default function MyPostingsPage() {
  redirect("/posts?filter=created");
}
