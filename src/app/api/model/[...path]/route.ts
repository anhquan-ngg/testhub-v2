import { NextRequest } from "next/server";
import { NextRequestHandler } from "@zenstackhq/server/next";
import { PrismaClient, UserRole } from "@prisma/client";
import { enhance } from "@zenstackhq/runtime";
import { jwtVerify, JWTPayload } from "jose";

const prisma = new PrismaClient();
const secretKey = new TextEncoder().encode(process.env.NEXT_JWT_SECRET);

async function getUserFromRequest(req: NextRequest) {
  try {
    const token = req.cookies.get("testhub_token")?.value;
    if (!token) return undefined;

    const { payload } = await jwtVerify(token, secretKey);
    return payload as JWTPayload & {
      id?: string;
      role?: string;
      email?: string;
    };
  } catch (error) {
    console.error("Token verification failed:", error);
    return undefined;
  }
}

async function getPrisma(req: NextRequest) {
  // Get the current user from JWT token
  const user = await getUserFromRequest(req);

  // Enhance Prisma client with ZenStack
  // The user context is passed to enforce access control policies
  return enhance(prisma, {
    user: user
      ? {
          id: user.id || "",
          role: (user.role as UserRole) || UserRole.STUDENT,
          email: user.email || "",
        }
      : undefined,
  });
}

async function handler(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    // Next.js 15 requires awaiting params
    const { path } = await context.params;

    // Debug: Log request info
    console.log("API Route - Request:", {
      method: req.method,
      url: req.url,
      pathname: new URL(req.url).pathname,
      path: path,
      hasBody: req.body !== null,
    });

    const enhancedPrisma = await getPrisma(req);
    // Use 'as any' here because the ZenStack v2 types for Next.js can sometimes
    // conflict between Pages and App Router in certain TypeScript configurations.
    return (NextRequestHandler as any)({
      getPrisma: () => enhancedPrisma,
      zodSchemas: undefined,
    })(req, { params: { path } });
  } catch (error) {
    console.error("API Route Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
};
