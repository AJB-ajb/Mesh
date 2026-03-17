import { createClient } from "@/lib/supabase/server";
import { cacheKeys } from "@/lib/swr/keys";
import { SWRFallback } from "@/lib/swr/fallback";
import { SpacesPageClient } from "./spaces-page-client";
import { deriveSpaceType } from "@/lib/supabase/types";
import type { SpaceListItem } from "@/lib/supabase/types";

/**
 * Server component wrapper that prefetches the space list so the client
 * component renders instantly with data instead of a loading spinner.
 * SWR revalidates in the background to pick up enrichment (last message,
 * member count) and realtime updates.
 */
export default async function SpacesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Middleware handles redirect; render empty fallback as safety net
    return <SpacesPageClient />;
  }

  const { data: spaces } = await supabase
    .from("spaces")
    .select(
      `
      *,
      space_members!inner(user_id, unread_count, pinned, muted, role)
    `,
    )
    .eq("space_members.user_id", user.id)
    .order("updated_at", { ascending: false });

  const enriched = (spaces ?? []).map((space) => ({
    ...space,
    type: deriveSpaceType(space),
    last_message: null,
    member_count: 0,
  })) as SpaceListItem[];

  const fallbackData = { spaces: enriched, userId: user.id };

  return (
    <SWRFallback fallback={{ [cacheKeys.spaces()]: fallbackData }}>
      <SpacesPageClient />
    </SWRFallback>
  );
}
