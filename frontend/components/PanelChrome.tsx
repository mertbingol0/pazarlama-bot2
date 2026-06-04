"use client";

import { usePathname } from "next/navigation";

import { Footer } from "@/components/Footer";
import { Sidebar } from "@/components/Sidebar";

// Sidebar gösterilmeyen (giriş / yasal) sayfalar.
const PUBLIC_PATHS = [
  "/login",
  "/privacy-policy",
  "/terms-of-service",
  "/data-deletion",
];

function isPublicPath(pathname: string | null) {
  if (!pathname) return false;
  return PUBLIC_PATHS.some(
    (publicPath) =>
      pathname === publicPath || pathname.startsWith(`${publicPath}/`)
  );
}

// Panel sayfalarında sol sidebar + içerik; public sayfalarda sade düzen.
export function PanelChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isPublicPath(pathname)) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="flex-1">{children}</div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1">{children}</div>
        <Footer />
      </div>
    </div>
  );
}
