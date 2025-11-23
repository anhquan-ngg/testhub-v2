"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/axios";
// import StoreProviderWrapper from "@/components/StoreProviderWrapper";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ReduxProvider } from "@/store";
import { Provider as ZenStackHooksProvider } from "../../generated/hooks";
import UserLoader from "@/components/UserLoader";

// Custom fetch function to call backend with credentials
const backendFetch = async (
  url: string,
  options?: RequestInit
): Promise<Response> => {
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // If url is relative, make it absolute
  const absoluteUrl = url.startsWith("http")
    ? url
    : `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;

  // Prepare headers - ZenStack sẽ tự set Content-Type và serialize body
  const headers = new Headers(options?.headers);

  // Debug log
  console.log("backendFetch Request:", {
    url: absoluteUrl,
    method: options?.method || "GET",
    hasBody: !!options?.body,
    bodyType: typeof options?.body,
    bodyPreview: options?.body
      ? typeof options?.body === "string"
        ? options.body.substring(0, 200)
        : String(options.body).substring(0, 200)
      : undefined,
    headers: Object.fromEntries(headers.entries()),
  });

  return fetch(absoluteUrl, {
    method: options?.method || "GET",
    headers: options?.headers,
    body: options?.body, // ZenStack đã serialize body thành string rồi
    credentials: "include", // Send cookies
    ...options, // Spread other options
  });
};

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ZenStackHooksProvider
        value={{
          // Call backend NestJS ZenStack REST API at /api (not /api/model)
          endpoint:
            (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") +
            "/api",
          // Use custom fetch to send cookies
          fetch: backendFetch,
        }}
      >
        <ReduxProvider>
          <UserLoader>{children}</UserLoader>
        </ReduxProvider>
        {process.env.NODE_ENV === "development" && <ReactQueryDevtools />}
      </ZenStackHooksProvider>
    </QueryClientProvider>
  );
}
