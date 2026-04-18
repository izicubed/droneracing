import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function middleware(request: NextRequest) {
  const adminToken = request.cookies.get("admin_token")?.value;
  const loginUrl = new URL("/admin/login", request.url);

  // No cookie at all — redirect immediately
  if (!adminToken) {
    return NextResponse.redirect(loginUrl);
  }

  // Validate token against backend session endpoint
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/session`, {
      method: "GET",
      headers: {
        Cookie: `admin_token=${adminToken}`,
      },
      // Never cache auth checks
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.redirect(loginUrl);
    }
  } catch {
    // Backend unreachable — redirect to login rather than showing broken page
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/leads", "/admin/leads/:path*"],
};
