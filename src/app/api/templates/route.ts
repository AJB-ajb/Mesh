import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import type { AuthContext } from "@/lib/api/with-auth";

export const GET = withAuth(
  async (_req: Request, { supabase }: AuthContext) => {
    const { data, error } = await supabase
      .from("templates")
      .select("id, title, description, content, category, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: { code: "INTERNAL", message: error.message } },
        { status: 500 },
      );
    }

    return NextResponse.json({ templates: data });
  },
);
