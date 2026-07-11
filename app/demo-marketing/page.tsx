import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DemoClient from "./DemoClient";

// Server component — auth guard runs before any client code is sent.
export default async function DemoMarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ tour?: string; scene?: string }>;
}) {
  // 1. Feature flag — must be explicitly enabled in env
  if (process.env.DEMO_MODE_ENABLED !== "true") {
    notFound();
  }

  // 2. Must be authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/demo-marketing");
  }

  // 3. Must be in admin email allowlist
  const allowlist = (process.env.DEMO_ADMIN_EMAILS ?? "")
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  if (allowlist.length > 0 && !allowlist.includes(user.email?.toLowerCase() ?? "")) {
    notFound();
  }

  const params = await searchParams;
  const initialTour  = params.tour ?? "completa";
  const initialScene = parseInt(params.scene ?? "0", 10) || 0;

  return <DemoClient initialTour={initialTour} initialScene={initialScene} />;
}
