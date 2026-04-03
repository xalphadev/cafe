import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/menu",
  "/admin/login",
];

const CUSTOMER_PATHS = ["/checkout", "/orders", "/profile", "/cart", "/home"];
const ADMIN_PATHS = ["/admin"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPath = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isCustomerProtectedPath = CUSTOMER_PATHS.some((p) => pathname.startsWith(p));

  if (!isAdminPath && !isCustomerProtectedPath) {
    return NextResponse.next();
  }

  const token = request.cookies.get("auth-token")?.value;

  if (!token) {
    if (isAdminPath) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const payload = await verifyToken(token);

  if (!payload) {
    const response = isAdminPath
      ? NextResponse.redirect(new URL("/admin/login", request.url))
      : NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("auth-token");
    return response;
  }

  if (isAdminPath && payload.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isCustomerProtectedPath && payload.role !== "CUSTOMER") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/(admin)/:path*",
    "/admin/:path*",
    "/checkout/:path*",
    "/orders/:path*",
    "/profile/:path*",
    "/cart",
    "/home",
  ],
};
