"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  MessageCircle,
  Headset,
  BarChart3,
  ArrowUpRight,
} from "lucide-react";

import { AdminDashboard } from "@/components/AdminDashboard";
import { loadAuth } from "@/lib/auth-storage";
import { Card, CardContent } from "@/components/ui/card";

const quickLinks = [
  {
    label: "İşletme Araştırması",
    description: "Kategori, il ve ilçeye göre işletme arayın ve listeleyin.",
    href: "/business-research",
    icon: Search,
    accent: "text-emerald-600 bg-emerald-50",
    adminOnly: true,
  },
  {
    label: "WhatsApp",
    description: "Gelen kutusu ve sohbetleri yönetin.",
    href: "/whatsapp",
    icon: MessageCircle,
    accent: "text-green-600 bg-green-50",
  },
  {
    label: "Canlı Destek",
    description: "Bilgi talep eden işletmeleri takip edin.",
    href: "/live-support",
    icon: Headset,
    accent: "text-sky-600 bg-sky-50",
  },
  {
    label: "Raporlar",
    description: "Görüşme ve sonuç istatistiklerini görüntüleyin.",
    href: "/reports",
    icon: BarChart3,
    accent: "text-indigo-600 bg-indigo-50",
  },
];

export default function Home() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(loadAuth()?.user?.role === "admin");
  }, []);

  return (
    <main className="min-h-screen bg-[#f7fbf9] px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              aria-label="Ana sayfaya git"
              className="flex flex-col items-end leading-none"
            >
              <span className="text-3xl font-semibold tracking-tight text-slate-700">
                Jefedes<span className="text-emerald-500">.</span>
              </span>

              <span className="-mt-0.5 -translate-x-1 text-xs font-medium tracking-wide text-slate-400">
                Lead Flow
              </span>
            </Link>

          </div>

          <div className="mt-10">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 md:text-4xl">
              Hoş geldiniz 👋
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
              Jefedes Lead Flow paneline hoş geldiniz. Soldaki menüden ve aşağıdaki
              hızlı erişim kartlarından çalışmak istediğiniz bölüme geçebilirsiniz.
            </p>
          </div>
        </header>

        {/* Admin: bugünün görüşme sonucu dashboard'u */}
        {isAdmin && <AdminDashboard />}

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks
            .filter((link) => !("adminOnly" in link) || !link.adminOnly || isAdmin)
            .map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href} className="group">
                <Card className="h-full rounded-3xl bg-white transition hover:-translate-y-0.5">
                  <CardContent className="flex h-full flex-col gap-3 p-5">
                    <div className="flex items-center justify-between">
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${link.accent}`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-emerald-500" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">
                        {link.label}
                      </h2>
                      <p className="mt-1 text-sm leading-5 text-slate-500">
                        {link.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}
