import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/supabase/admin";
import { sendDailyDigest } from "@/lib/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Called by Vercel Cron every day at 08:00 UTC
// vercel.json: { "crons": [{ "path": "/api/notifications/daily", "schedule": "0 8 * * *" }] }
export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdmin();
  const today = new Date().toISOString();
  const in7 = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

  // Fetch all users with email notifications enabled
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, name, email, notifications_email")
    .eq("notifications_email", true)
    .not("email", "is", null);

  if (error || !profiles?.length) {
    return NextResponse.json({ sent: 0, error: error?.message });
  }

  let sent = 0;
  const errors: string[] = [];

  await Promise.all(profiles.map(async (profile) => {
    try {
      const userId = profile.id;

      const [dueRes, examRes, subjectRes] = await Promise.all([
        // Due concepts per subject
        admin
          .from("student_knowledge")
          .select("subject_concepts!inner(name, subject_id, subjects!inner(id, name))")
          .eq("user_id", userId)
          .lte("next_review", today),
        // Upcoming exams
        admin
          .from("calendar_events")
          .select("title, event_date, subject_id, subjects!inner(name)")
          .eq("event_type", "exam")
          .gte("event_date", today.slice(0, 10))
          .lte("event_date", in7)
          .order("event_date")
          .limit(3),
        // Subjects list
        admin
          .from("subjects")
          .select("id, name")
          .eq("user_id", userId),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dueRows = (dueRes.data ?? []) as any[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const examRows = (examRes.data ?? []) as any[];

      // Group due by subject
      const dueBySubject = new Map<string, { name: string; count: number }>();
      for (const row of dueRows) {
        const sid = row.subject_concepts?.subjects?.id;
        const sname = row.subject_concepts?.subjects?.name ?? "";
        if (!sid) continue;
        const existing = dueBySubject.get(sid);
        if (existing) existing.count++;
        else dueBySubject.set(sid, { name: sname, count: 1 });
      }

      const subjects = Array.from(dueBySubject.values()).map(s => ({
        name: s.name,
        dueCount: s.count,
      }));

      const dueCount = dueRows.length;
      const totalMinutesEst = Math.max(5, Math.round(dueCount * 1.5));

      const upcomingExams = examRows.map(e => {
        const days = Math.round((new Date(e.event_date).getTime() - Date.now()) / 86_400_000);
        return {
          title: e.title,
          subjectName: (e.subjects as { name: string })?.name ?? "",
          daysUntil: Math.max(0, days),
        };
      });

      // Only send if there's something to report
      if (dueCount === 0 && upcomingExams.length === 0) return;

      await sendDailyDigest({
        name: profile.name ?? "Estudiante",
        email: profile.email,
        dueCount,
        subjects,
        upcomingExams,
        totalMinutesEst,
      });

      sent++;
    } catch (e) {
      errors.push(`${profile.email}: ${e}`);
    }
  }));

  return NextResponse.json({ sent, total: profiles.length, errors });
}
