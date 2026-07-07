import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/supabase/admin";

// Cache for 1 hour — avoids hitting the DB on every page load
let cache: { userCount: number; fetchedAt: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000;

export const dynamic = "force-dynamic";

export async function GET() {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
    return NextResponse.json({ userCount: cache.userCount });
  }

  const db = getAdmin();
  const { count } = await db.from("profiles").select("id", { count: "exact", head: true });

  const userCount = count ?? 0;
  cache = { userCount, fetchedAt: Date.now() };

  return NextResponse.json({ userCount });
}
