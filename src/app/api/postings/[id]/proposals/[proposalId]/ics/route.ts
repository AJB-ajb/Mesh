import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/errors";

/** GET: Download .ics file for a confirmed proposal */
export const GET = withAuth(async (_req, { user, supabase, params }) => {
  const postingId = params.id;
  const proposalId = params.proposalId;

  // Verify team membership
  const { data: isMember } = await supabase.rpc("is_posting_team_member", {
    p_posting_id: postingId,
    p_user_id: user.id,
  });

  if (!isMember) {
    return apiError("FORBIDDEN", "Not a team member", 403);
  }

  // Fetch proposal with posting title
  const { data: proposal } = await supabase
    .from("meeting_proposals")
    .select("*, postings(title)")
    .eq("id", proposalId)
    .eq("posting_id", postingId)
    .single();

  if (!proposal) {
    return apiError("NOT_FOUND", "Proposal not found", 404);
  }

  const postingTitle =
    (proposal.postings as { title: string } | null)?.title ?? "Meeting";
  const summary = proposal.title
    ? `${proposal.title} — ${postingTitle}`
    : postingTitle;

  const start = new Date(proposal.start_time);
  const end = new Date(proposal.end_time);

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mesh//Team Scheduling//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${proposal.id}@mesh-it.vercel.app`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${escapeIcs(summary)}`,
    `DESCRIPTION:${escapeIcs(`Team meeting for ${postingTitle}`)}`,
    `STATUS:${proposal.status === "confirmed" ? "CONFIRMED" : "TENTATIVE"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="meeting-${proposalId.slice(0, 8)}.ics"`,
    },
  });
});

function formatIcsDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}
