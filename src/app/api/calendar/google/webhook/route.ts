/**
 * POST /api/calendar/google/webhook
 *
 * Stub: returns 410 Gone. Google Calendar push notifications are not used
 * (our freebusy scope doesn't support events.watch). This stub ensures any
 * previously-registered webhook channels stop retrying.
 */

import { NextResponse } from "next/server";

export async function POST() {
  return new NextResponse(null, { status: 410 });
}
