import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers/Providers";
import { Toaster } from "sonner";

const barlow = Barlow({
  variable: "--font-body",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Testhub - Online Test System",
  description: "Nền tảng thi trực tuyến bảo mật cho giáo dục hiện đại.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${barlow.variable} ${barlowCondensed.variable} antialiased`}>
        <Providers>{children}</Providers>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
