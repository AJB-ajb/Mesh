import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type NotificationPayload = {
  userId: string;
  type: string;
  title: string;
  body: string;
  relatedUserId?: string;
  relatedPostingId?: string;
  relatedApplicationId?: string;
};

/**
 * Fire-and-forget notification insert.
 *
 * Inserts a single notification row and logs any error to the console.
 * Callers do not need to await this — it returns void intentionally.
 *
 * Pass a `supabase` client when calling from a server context (e.g., API
 * routes using withAuth). When omitted a browser client is created
 * automatically, which is correct for client-side hooks.
 */
export function sendNotification(
  payload: NotificationPayload,
  supabase?: SupabaseClient,
): void {
  const client = supabase ?? createClient();

  client
    .from("notifications")
    .insert({
      user_id: payload.userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      ...(payload.relatedUserId && { related_user_id: payload.relatedUserId }),
      ...(payload.relatedPostingId && {
        related_posting_id: payload.relatedPostingId,
      }),
      ...(payload.relatedApplicationId && {
        related_application_id: payload.relatedApplicationId,
      }),
    })
    .then(({ error }) => {
      if (error)
        console.error(
          `[sendNotification] Error creating ${payload.type}:`,
          error,
        );
    });
}

/**
 * Fire-and-forget bulk notification insert.
 *
 * Inserts multiple notification rows in a single request and logs any error.
 * Callers do not need to await this — it returns void intentionally.
 *
 * Pass a `supabase` client when calling from a server context. When omitted
 * a browser client is created automatically.
 */
export function sendNotifications(
  payloads: NotificationPayload[],
  supabase?: SupabaseClient,
): void {
  if (payloads.length === 0) return;

  const client = supabase ?? createClient();

  const rows = payloads.map((payload) => ({
    user_id: payload.userId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    ...(payload.relatedUserId && { related_user_id: payload.relatedUserId }),
    ...(payload.relatedPostingId && {
      related_posting_id: payload.relatedPostingId,
    }),
    ...(payload.relatedApplicationId && {
      related_application_id: payload.relatedApplicationId,
    }),
  }));

  client
    .from("notifications")
    .insert(rows)
    .then(({ error }) => {
      if (error)
        console.error(
          `[sendNotification] Error creating ${payloads[0]?.type} notifications:`,
          error,
        );
    });
}
