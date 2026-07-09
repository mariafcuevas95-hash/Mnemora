import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = [
  "/dashboard", "/materias", "/tutor", "/calendario", "/flashcards",
  "/onboarding", "/progreso", "/settings",
  "/examen", "/quiz", "/mapas", "/roadmap", "/replanner",
  "/analytics", "/referidos", "/biblioteca", "/admin", "/instalar",
];
const AUTH_PAGES = ["/login", "/registro"];
const PUBLIC_PAGES = ["/bienvenido"];

function sanitizeEnv(v: string | undefined): string {
  if (!v) return "";
  // eslint-disable-next-line no-control-regex
  return v.replace(/[^\x00-\xFF]/g, "").trim();
}

export async function middleware(request: NextRequest) {
  const supabaseUrl  = sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnon = sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  // Sin credenciales — en producción fallar cerrado, en dev dejar pasar
  if (!supabaseUrl || !supabaseAnon) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnon,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  const isProtected = PROTECTED.some(p => pathname.startsWith(p));
  const isAuthPage = AUTH_PAGES.some(p => pathname.startsWith(p));
  const isPublic = PUBLIC_PAGES.some(p => pathname.startsWith(p));
  if (isPublic) return supabaseResponse;

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
