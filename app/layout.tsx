import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RPOM Quản trị",
  description: "Hệ thống quản trị nhà hàng — RPOM",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: browser extensions inject attributes (e.g. class="mdl-js")
    // onto <html>/<body> before React hydrates, causing a harmless dev-only mismatch warning.
    <html lang="vi" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
