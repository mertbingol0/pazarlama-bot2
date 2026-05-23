"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { loginUser } from "@/lib/api";
import { isAuthenticated, saveAuth } from "@/lib/auth-storage";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/");
    }
  }, [router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!username.trim() || !password) {
      setErrorMessage("Kullanıcı adı ve şifre zorunludur.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await loginUser({
        username: username.trim(),
        password,
      });

      saveAuth({
        token: response.token,
        user: response.user,
      });

      router.replace("/");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Giriş yapılırken bir hata oluştu."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7fbf9] px-6 py-12 text-slate-900">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex flex-col items-center leading-none">
            <span className="text-3xl font-semibold tracking-tight text-slate-700">
              Jefedes<span className="text-emerald-500">.</span>
            </span>
            <span className="mt-1 text-xs font-medium tracking-wide text-slate-400">
              Lead Flow
            </span>
          </div>

          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            Yönetim Paneli <span className="text-emerald-500">Girişi</span>
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Devam etmek için kullanıcı adı ve şifrenizi girin.
          </p>
        </div>

        <Card className="rounded-3xl border border-emerald-100/80 bg-white shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">
              Hesabınıza giriş yapın
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="username"
                  className="text-xs font-medium text-slate-600"
                >
                  Kullanıcı Adı
                </label>
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="admin"
                  className="h-10 rounded-xl"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="password"
                  className="text-xs font-medium text-slate-600"
                >
                  Şifre
                </label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="h-10 rounded-xl"
                  disabled={isSubmitting}
                  required
                />
              </div>

              {errorMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {errorMessage}
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 h-10 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600"
              >
                {isSubmitting ? "Giriş yapılıyor..." : "Giriş Yap"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
