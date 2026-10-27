import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import createMiddleware from "next-intl/middleware";
import { isLocale } from "@/i18n/config";
import { routing } from "@/i18n/routing";

const handleI18n = createMiddleware(routing);
const secret =
  process.env.NEXT_JWT_ACCESS_SECRET ?? process.env.NEXT_JWT_SECRET;
if (!secret)
  throw new Error("Set NEXT_JWT_ACCESS_SECRET to the backend access secret");
const secretKey = new TextEncoder().encode(secret);
const roleBasedRoutes = {
  ADMIN: ["/dashboard"],
  LECTURER: ["/lecturer"],
  STUDENT: ["/home", "/profile", "/result", "/exam"],
};

/** Performs optimistic navigation checks; backend enforces live session validity. */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const [, segment, ...rest] = pathname.split("/");
  if (!isLocale(segment)) return handleI18n(request);
  const localPath = "/" + rest.join("/");
  // Public recovery/confirmation shells render no private data.
  if (
    localPath === "/auth/session-recovery" ||
    localPath === "/auth/session-transfer"
  )
    return handleI18n(request);
  const protectedPath = Object.values(roleBasedRoutes)
    .flat()
    .some((path) => localPath === path || localPath.startsWith(path + "/"));
  let payload = null;
  try {
    const token = request.cookies.get("access_token")?.value;
    if (token) {
      const verified = (
        await jwtVerify(token, secretKey, { algorithms: ["HS256"] })
      ).payload;
      if (
        typeof verified.sid === "string" &&
        verified.token_use === "access" &&
        typeof verified.role === "string" &&
        Object.prototype.hasOwnProperty.call(roleBasedRoutes, verified.role)
      )
        payload = verified;
    }
  } catch {
    /* Browser recovery distinguishes expiry from transient backend failures. */
  }
  if (!payload && protectedPath) {
    const recovery = new URL(
      "/" + segment + "/auth/session-recovery",
      request.url,
    );
    recovery.searchParams.set("returnTo", pathname + request.nextUrl.search);
    return NextResponse.redirect(recovery);
  }
  const role = payload?.role as keyof typeof roleBasedRoutes | undefined;
  const home =
    role === "ADMIN"
      ? "/dashboard"
      : role === "LECTURER"
        ? "/lecturer"
        : "/home";
  if (
    payload &&
    ["/", "/login", "/signup"].includes(localPath) &&
    request.nextUrl.searchParams.get("reauth") !== "1"
  ) {
    return NextResponse.redirect(new URL("/" + segment + home, request.url));
  }
  if (
    payload &&
    protectedPath &&
    (!role ||
      !(roleBasedRoutes[role] ?? []).some(
        (path) => localPath === path || localPath.startsWith(path + "/"),
      ))
  ) {
    return NextResponse.redirect(new URL("/" + segment + home, request.url));
  }
  return handleI18n(request);
}
export const config = { matcher: ["/((?!api|_next|.*\\..*).*)"] };
