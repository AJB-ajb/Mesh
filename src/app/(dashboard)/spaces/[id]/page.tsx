import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { cacheKeys } from "@/lib/swr/keys";
import { SWRFallback } from "@/lib/swr/fallback";
import { SpacePageClient } from "./space-page-client";
import type { SpaceDetail } from "@/lib/hooks/use-space";

/**
 * Server component wrapper that prefetches space details so the client
 * renders instantly. SWR revalidates in the background for realtime updates.
 */
export default async function SpacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Suspense>
        <SpacePageClient params={params} />
      </Suspense>
    );
  }

  const [spaceResult, membersResult] = await Promise.all([
    supabase.from("spaces").select("*").eq("id", id).single(),
    supabase
      .from("space_members")
      .select("*, profiles:user_id(full_name, headline, user_id)")
      .eq("space_id", id)
      .order("joined_at", { ascending: true }),
  ]);

  if (spaceResult.error || !spaceResult.data) {
    // Let the client component handle the error/not-found state
    return (
      <Suspense>
        <SpacePageClient params={params} />
      </Suspense>
    );
  }

  const members = membersResult.data ?? [];
  const currentMember = members.find((m) => m.user_id === user.id) ?? null;

  const fallbackData: SpaceDetail = {
    ...spaceResult.data,
    members,
    currentMember,
  };

  return (
    <SWRFallback fallback={{ [cacheKeys.space(id)]: fallbackData }}>
      <SpacePageClient params={params} />
    </SWRFallback>
  );
}
