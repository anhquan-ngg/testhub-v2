// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, JWTPayload } from "jose";

const secretKey = new TextEncoder().encode(process.env.NEXT_JWT_SECRET);

// 1. Thống nhất tên role: LECTURER
const roleBasedRoutes = {
  ADMIN: ["/dashboard"],
  LECTURER: ["/lecturer/exams", "/lecturer/questions"],
  STUDENT: ["/home"],
};

async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("testhub_token")?.value;

  // --- TỐI ƯU HÓA: Xác thực token một lần duy nhất ở đầu ---
  const payload = token ? await verifyToken(token) : null;

  const isPublicPath =
    pathname === "/login" || pathname === "/signup" || pathname === "/";
  const protectedPaths = Object.values(roleBasedRoutes).flat();
  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );

  // Kịch bản 1: Người dùng CHƯA đăng nhập (payload is null)
  if (!payload) {
    // Nếu họ cố vào trang cần bảo vệ -> đá về login
    if (isProtectedPath) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    // Nếu họ vào trang public -> cho phép
    return NextResponse.next();
  }

  // Kịch bản 2: Người dùng ĐÃ đăng nhập (payload exists)
  // Nếu token không hợp lệ (ví dụ hết hạn), payload sẽ là null, đã xử lý ở trên
  // nên từ đây trở đi, ta chắc chắn payload hợp lệ.

  const userRole = payload.role as keyof typeof roleBasedRoutes;

  // Nếu họ vào trang public (login, signup, /) -> chuyển hướng họ đến trang dashboard phù hợp
  if (isPublicPath) {
    switch (userRole) {
      case "ADMIN":
        return NextResponse.redirect(new URL("/dashboard", request.url));
      case "STUDENT":
        return NextResponse.redirect(new URL("/home", request.url));
      // SỬA LỖI: Dùng LECTURER
      case "LECTURER":
        return NextResponse.redirect(new URL("/lecturer/exams", request.url));
      default:
        // Nếu role không xác định, có thể gửi họ về trang login
        return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Nếu họ vào một trang cần bảo vệ, kiểm tra quyền
  if (isProtectedPath) {
    const allowedRoutes = roleBasedRoutes[userRole] || [];
    const isAuthorized = allowedRoutes.some((route) =>
      pathname.startsWith(route)
    );

    // Nếu không có quyền -> trang unauthorized
    if (!isAuthorized) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  // Nếu tất cả điều kiện đều qua, cho phép truy cập
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
