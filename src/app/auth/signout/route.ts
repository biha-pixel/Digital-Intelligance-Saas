import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { ACTIVE_ORG_COOKIE } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // 1. Check if user is authenticated and sign out from Supabase Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase.auth.signOut();
  }

  // 2. Clear tenant active organization session cookie
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_ORG_COOKIE);

  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/login`, {
    status: 303,
  });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase.auth.signOut();
  }

  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_ORG_COOKIE);

  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/login`, {
    status: 303,
  });
}
