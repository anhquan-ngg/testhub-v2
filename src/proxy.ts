import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, JWTPayload } from "jose";
import createMiddleware from "next-intl/middleware";
import { isLocale } from "@/i18n/config";
import { routing } from "@/i18n/routing";

const handleI18n = createMiddleware(routing);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const ACCESS_COOKIE_KEY = "access_token";
const REFRESH_COOKIE_KEY = "refresh_token";

const accessTokenSecret =
  process.env.NEXT_JWT_ACCESS_SECRET ?? process.env.NEXT_JWT_SECRET;

if (!accessTokenSecret) {
  throw new Error(
    "JWT_ACCESS_SECRET is not defined. Set the same secret used by the backend JWT access token.",
  );
}

const secretKey = new TextEncoder().encode(accessTokenSecret);

const roleBasedRoutes = {
  ADMIN: ["/dashboard"],
  LECTURER: ["/lecturer"],
  STUDENT: ["/home", "/profile", "/result", "/exam"],
};

function splitSetCookieHeader(header: string): string[] {
  const cookies: string[] = [];
  let start = 0;

  for (let i = 0; i < header.length; i += 1) {
    if (header[i] !== ",") continue;

    const rest = header.slice(i + 1);
    if (/^\s*[\w.-]+=/.test(rest)) {
      cookies.push(header.slice(start, i).trim());
      start = i + 1;
    }
  }

  cookies.push(header.slice(start).trim());
  return cookies.filter(Boolean);
}

function getSetCookies(headers: Headers): string[] {
  const headersWithGetSetCookie = headers as Headers & {
    getSetCookie?: () => string[];
  };

  const setCookies = headersWithGetSetCookie.getSetCookie?.();
  if (setCookies?.length) return setCookies;

  const setCookie = headers.get("set-cookie");
  return setCookie ? splitSetCookieHeader(setCookie) : [];
}

function getCookieValueFromSetCookies(
  setCookies: string[],
  cookieName: string,
): string | null {
  const prefix = `${cookieName}=`;

  for (const cookie of setCookies) {
    const cookiePair = cookie.trim().split(";")[0];
    if (cookiePair.startsWith(prefix)) {
      return decodeURIComponent(cookiePair.slice(prefix.length));
    }
  }

  return null;
}

function withSetCookies(response: NextResponse, setCookies: string[]) {
  for (const cookie of setCookies) {
    response.headers.append("Set-Cookie", cookie);
  }

  return response;
}

function clearAuthCookies(response: NextResponse) {
  response.cookies.delete(ACCESS_COOKIE_KEY);
  response.cookies.delete(REFRESH_COOKIE_KEY);
  return response;
}

async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch {
    return null;
  }
}

async function refreshAuth(request: NextRequest): Promise<{
  payload: JWTPayload;
  setCookies: string[];
} | null> {
  const refreshToken = request.cookies.get(REFRESH_COOKIE_KEY)?.value;
  if (!refreshToken) return null;

  try {
    const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        Cookie: request.headers.get("cookie") || "",
      },
      cache: "no-store",
    });

    if (!refreshResponse.ok) return null;

    const setCookies = getSetCookies(refreshResponse.headers);
    const accessToken = getCookieValueFromSetCookies(
      setCookies,
      ACCESS_COOKIE_KEY,
    );

    if (!accessToken) return null;

    const payload = await verifyToken(accessToken);
    return payload ? { payload, setCookies } : null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const [, segment, ...rest] = pathname.split("/");
  const locale = isLocale(segment) ? segment : null;
  if (!locale) return handleI18n(request);

  const localPath = `/${rest.join("/")}`;
  const localized = (path: string) => `/${locale}${path}`;
  const isPublicPath =
    localPath === "/login" || localPath === "/signup" || localPath === "/";
  const protectedPaths = Object.values(roleBasedRoutes).flat();
  const isProtectedPath = protectedPaths.some((path) =>
    localPath === path || localPath.startsWith(`${path}/`),
  );

  const accessToken = request.cookies.get(ACCESS_COOKIE_KEY)?.value;
  let payload = accessToken ? await verifyToken(accessToken) : null;
  let refreshedSetCookies: string[] = [];

  if (!payload && isProtectedPath) {
    const refreshedAuth = await refreshAuth(request);
    if (refreshedAuth) {
      payload = refreshedAuth.payload;
      refreshedSetCookies = refreshedAuth.setCookies;
    }
  }

  if (!payload) {
    if (isProtectedPath) {
      return clearAuthCookies(
        NextResponse.redirect(new URL(localized("/login"), request.url)),
      );
    }

    return handleI18n(request);
  }

  const userRole = payload.role as keyof typeof roleBasedRoutes;

  if (isPublicPath) {
    switch (userRole) {
      case "ADMIN":
        return withSetCookies(
          NextResponse.redirect(new URL(localized("/dashboard"), request.url)),
          refreshedSetCookies,
        );
      case "STUDENT":
        return withSetCookies(
          NextResponse.redirect(new URL(localized("/home"), request.url)),
          refreshedSetCookies,
        );
      case "LECTURER":
        return withSetCookies(
          NextResponse.redirect(new URL(localized("/lecturer"), request.url)),
          refreshedSetCookies,
        );
      default:
        return withSetCookies(
          NextResponse.redirect(new URL(localized("/login"), request.url)),
          refreshedSetCookies,
        );
    }
  }

  if (isProtectedPath) {
    const allowedRoutes = roleBasedRoutes[userRole] || [];
    const isAuthorized = allowedRoutes.some((route) =>
      localPath === route || localPath.startsWith(`${route}/`),
    );

    if (!isAuthorized) {
      return withSetCookies(
        NextResponse.redirect(new URL(localized("/unauthorized"), request.url)),
        refreshedSetCookies,
      );
    }
  }

  return withSetCookies(handleI18n(request), refreshedSetCookies);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
