"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { isAuthenticated } from "@/lib/auth-storage";

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

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isPublicPath(pathname)) {
      setIsReady(true);
      return;
    }

    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }

    setIsReady(true);
  }, [pathname, router]);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7fbf9] text-sm text-slate-500">
        Yükleniyor...
      </div>
    );
  }

  return <>{children}</>;
}
