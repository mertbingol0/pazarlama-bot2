import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-white/60 py-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 text-sm text-slate-500 md:flex-row">
        <p>© 2026 Jefedes Lead Flow. Tüm hakları saklıdır.</p>

        <div className="flex items-center gap-4">
          <Link
            href="/privacy-policy"
            className="font-medium text-emerald-600 transition hover:text-emerald-700"
          >
            Gizlilik Politikası
          </Link>

          <Link
            href="/terms-of-service"
            className="font-medium text-emerald-600 transition hover:text-emerald-700"
          >
            Hizmet Şartları
          </Link>
        </div>
      </div>
    </footer>
  );
}